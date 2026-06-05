const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
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
function initDB() {
  db = new Database('./vault.db');

  // Create Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT NOT NULL,
      iv TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      signature TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default users
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (row.count === 0) {
    console.log("🌱 Database empty. Seeding initial users...");
    const hashAlice = bcrypt.hashSync('password123', 10);
    const hashBob = bcrypt.hashSync('secure456', 10);
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?), (?, ?)')
      .run('alice', hashAlice, 'bob', hashBob);
  }
}
initDB();

// --- LOGIN ROUTE ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (user && bcrypt.compareSync(password, user.password)) {
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
  else res.status(403).json({ success: false, message: "Forbidden" });
}

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT username FROM users').all();
  res.json({ success: true, users: users.map(u => u.username) });
});

app.post('/api/admin/users', requireAdmin, (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);
    res.json({ success: true, message: `User ${username} added.` });
  } catch (err) {
    res.status(400).json({ success: false, message: "User exists or DB error" });
  }
});

app.put('/api/admin/users', requireAdmin, (req, res) => {
  const { username, newPassword } = req.body;
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  const info = db.prepare('UPDATE users SET password = ? WHERE username = ?').run(hashedPassword, username);
  if (info.changes === 0) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, message: `Password updated for ${username}.` });
});

app.delete('/api/admin/users/:username', requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM users WHERE username = ?').run(req.params.username);
  if (info.changes === 0) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, message: `User ${req.params.username} deleted.` });
});

// --- WEBSOCKET RELAY ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("No token"));
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error("Invalid token"));
    socket.username = decoded.username; 
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`🟢 ${socket.username} connected`);
  
  // Send history
  const history = db.prepare('SELECT sender, iv, ciphertext, signature FROM messages ORDER BY timestamp ASC').all();
  socket.emit('load-history', history); 

  socket.broadcast.emit('peer-joined');
  socket.on('send-public-key', (keyData) => socket.broadcast.emit('receive-public-key', keyData));

  socket.on('send-ciphertext', (encryptedData) => {
    encryptedData.sender = socket.username; 
    db.prepare('INSERT INTO messages (sender, iv, ciphertext, signature) VALUES (?, ?, ?, ?)')
      .run(encryptedData.sender, encryptedData.iv, encryptedData.ciphertext, encryptedData.signature);
    
    socket.broadcast.emit('receive-ciphertext', encryptedData);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});