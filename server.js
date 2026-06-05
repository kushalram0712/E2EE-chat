const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const JWT_SECRET = "super-secret-vault-key-2026";
const ADMIN_API_KEY = "vault-admin-777";

app.use(express.json());
app.use(express.static('public'));

// --- DATABASE INITIALIZATION ---
let db;
async function initDB() {
  db = await open({ filename: './vault.db', driver: sqlite3.Database });

  // Create Users Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL
    )
  `);

  // Create Messages (History) Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT NOT NULL,
      iv TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      signature TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default users if database is empty
  const row = await db.get('SELECT COUNT(*) as count FROM users');
  if (row.count === 0) {
    console.log("🌱 Database empty. Seeding initial hashed users...");
    const hashAlice = await bcrypt.hash('password123', 10);
    const hashBob = await bcrypt.hash('secure456', 10);
    await db.run(
      'INSERT INTO users (username, password) VALUES (?, ?), (?, ?)', 
      ['alice', hashAlice, 'bob', hashBob]
    );
  }
}
initDB();

// --- SECURE USER LOGIN ROUTE ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ username: username }, JWT_SECRET, { expiresIn: '2h' });
      res.json({ success: true, token: token, username: username });
    } else {
      res.status(401).json({ success: false, message: "Invalid username or password." });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error." });
  }
});

// --- ADMIN API ROUTES ---
function requireAdmin(req, res, next) {
  if (req.headers['x-admin-key'] === ADMIN_API_KEY) next();
  else res.status(403).json({ success: false, message: "Forbidden: Invalid Admin Key" });
}

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const users = await db.all('SELECT username FROM users');
  res.json({ success: true, users: users.map(u => u.username) });
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: "Missing fields" });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    res.json({ success: true, message: `User ${username} added.` });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }
    res.status(500).json({ success: false, message: "Database error" });
  }
});

app.put('/api/admin/users', requireAdmin, async (req, res) => {
  const { username, newPassword } = req.body;
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const result = await db.run('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username]);
  if (result.changes === 0) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, message: `Password updated for ${username}.` });
});

app.delete('/api/admin/users/:username', requireAdmin, async (req, res) => {
  const result = await db.run('DELETE FROM users WHERE username = ?', [req.params.username]);
  if (result.changes === 0) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, message: `User ${req.params.username} deleted.` });
});

// --- WEBSOCKET RELAY & HISTORY ROUTER ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error: No token provided"));
  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) return next(new Error("Authentication error: Invalid token"));
    socket.username = decodedUser.username; 
    next();
  });
});

io.on('connection', async (socket) => {
  console.log(`🟢 ${socket.username} connected via Socket: ${socket.id}`);
  
  // 1. Send chat history to the newly connected user
  try {
    const history = await db.all('SELECT sender, iv, ciphertext, signature FROM messages ORDER BY timestamp ASC');
    socket.emit('load-history', history); 
  } catch (err) {
    console.error("Failed to load history", err);
  }

  socket.broadcast.emit('peer-joined');
  socket.on('send-public-key', (keyData) => socket.broadcast.emit('receive-public-key', keyData));

  // 2. Save encrypted messages to SQLite before routing
  socket.on('send-ciphertext', async (encryptedData) => {
    encryptedData.sender = socket.username; 
    try {
      await db.run(
        'INSERT INTO messages (sender, iv, ciphertext, signature) VALUES (?, ?, ?, ?)',
        [encryptedData.sender, encryptedData.iv, encryptedData.ciphertext, encryptedData.signature]
      );
      socket.broadcast.emit('receive-ciphertext', encryptedData);
    } catch (err) {
      console.error("Failed to save message", err);
    }
  });

  socket.on('disconnect', () => console.log(`🔴 ${socket.username} disconnected.`));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ E2EE Relay Server running on port ${PORT}`);
});