# 🔐 E2EE Chat

> A secure, real-time chat application featuring end-to-end encryption (E2EE) to ensure complete user privacy.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Language: JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/Frontend-HTML5-E34C26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

---

## 🌟 Features

- **🔒 End-to-End Encryption (E2EE)** - Military-grade encryption ensures only you and your chat partner can read messages
- **⚡ Real-Time Messaging** - Instant message delivery with Socket.IO for seamless communication
- **🔐 JWT Authentication** - Secure token-based user authentication system
- **💾 Message Persistence** - SQLite database for reliable message storage
- **👤 User Management** - Secure password hashing with bcrypt
- **🎯 Admin API** - Complete user management capabilities
- **📱 Responsive Design** - Works perfectly on desktop, tablet, and mobile devices
- **🚀 Lightweight & Fast** - Optimized for quick load times and minimal overhead

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v14 or higher
- **npm** or **yarn** package manager
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kushalram0712/E2EE-chat.git
   cd E2EE-chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser**
   ```
   Navigate to http://localhost:3000
   ```

---

## 📖 Usage Guide

### Default Credentials

The application comes with pre-configured test accounts:

| Username | Password |
|----------|----------|
| alice | password123 |
| bob | secure456 |

### Login

1. Enter your username and password on the login page
2. Click "Sign In" to access the chat interface
3. Start chatting securely!

### Sending Messages

- Type your message in the input field
- Press **Enter** or click the send button
- Your message is encrypted end-to-end and delivered in real-time

### Creating a Secure Session

1. Share your unique session token with your chat partner
2. Both users must authenticate with valid credentials
3. All messages are automatically encrypted and decrypted client-side

---

## 🔧 Technical Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js + Express.js |
| **Real-Time Communication** | Socket.IO with WebSockets |
| **Database** | SQLite (better-sqlite3) |
| **Authentication** | JWT (jsonwebtoken) |
| **Password Security** | bcryptjs with hashing |
| **Encryption** | End-to-end encryption structure |

---

## 📁 Project Structure

```
E2EE-chat/
├── public/                 # Frontend files
│   ├── index.html         # Main HTML file
│   ├── css/
│   │   └── styles.css     # Application styles
│   └── js/
│       ├── app.js         # Main application logic
│       ├── crypto.js      # Encryption/decryption functions
│       └── socket.js      # WebSocket handlers
├── server.js              # Main backend server
├── package.json           # Dependencies and scripts
├── vault.db               # SQLite database
└── README.md              # This file
```

---

## 🔐 Security Architecture

### Encryption Flow

```
User Input
    ↓
Client-Side Encryption (AES-256)
    ↓
JWT Token Authentication
    ↓
Encrypted Message Transmission (Socket.IO)
    ↓
Server Storage (Encrypted Blob)
    ↓
Client-Side Decryption
    ↓
Display to Recipient
```

### Security Features

✅ **End-to-End Encryption** - Messages encrypted before leaving your device  
✅ **JWT Authentication** - Stateless, secure token-based auth  
✅ **Password Hashing** - bcryptjs with salt rounds for secure storage  
✅ **Secure WebSockets** - Socket.IO with authentication middleware  
✅ **Message Integrity** - Digital signatures and verification  
✅ **Session Management** - Automatic session validation  

### Best Practices

- ⚠️ Never share your JWT tokens
- ⚠️ Verify chat partner identity through a separate channel
- ⚠️ Keep Node.js and dependencies updated
- ⚠️ Use strong, unique encryption keys
- ⚠️ Enable HTTPS in production environments

---

## 🔌 API Reference

### Authentication Endpoints

#### Login
```http
POST /api/login
Content-Type: application/json

{
  "username": "alice",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "alice"
}
```

### Admin API

**Requires Admin Key Header:**
```http
x-admin-key: vault-admin-777
```

#### Get All Users
```http
GET /api/admin/users
```

#### Create New User
```http
POST /api/admin/users
Content-Type: application/json

{
  "username": "newuser",
  "password": "securepassword"
}
```

#### Update User Password
```http
PUT /api/admin/users
Content-Type: application/json

{
  "username": "alice",
  "newPassword": "newpassword123"
}
```

#### Delete User
```http
DELETE /api/admin/users/:username
```

### WebSocket Events

#### Connect with Authentication
```javascript
const socket = io({
  auth: {
    token: "YOUR_JWT_TOKEN"
  }
});
```

#### Send Message
```javascript
socket.emit('message', {
  receiver: 'bob',
  iv: 'initialization_vector',
  ciphertext: 'encrypted_message',
  signature: 'message_signature'
});
```

#### Receive Message
```javascript
socket.on('message', (data) => {
  console.log('New message from:', data.sender);
  // Decrypt and display message
});
```

---

## 💾 Database Schema

### Users Table
```sql
CREATE TABLE users (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL
)
```

### Messages Table
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender TEXT NOT NULL,
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  signature TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(sender) REFERENCES users(username)
)
```

---

## 🛠️ Development

### Build the Project
```bash
npm run build
```

### Run Tests
```bash
npm test
```

### Development Mode with Auto-Reload
```bash
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this

# Admin API
ADMIN_API_KEY=vault-admin-777

# Database
DB_PATH=./vault.db
```

---

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
   ```bash
   git clone https://github.com/YOUR_USERNAME/E2EE-chat.git
   ```
3. **Create** a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **Make** your changes and commit
   ```bash
   git commit -m 'Add amazing feature'
   ```
5. **Push** to your branch
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open** a Pull Request with a clear description

### Contribution Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Keep commits atomic and descriptive

---

## 🐛 Bug Reports & Feature Requests

Found a bug or have a great idea? Please [open an issue](https://github.com/kushalram0712/E2EE-chat/issues) on GitHub!

**When reporting bugs, please include:**
- Your operating system and browser version
- Steps to reproduce the issue
- Expected vs. actual behavior
- Screenshots or error logs (if applicable)
- Your Node.js version

**For feature requests:**
- Clear description of the requested feature
- Why you think it would be useful
- Any relevant examples or mockups

---

## 🎯 Roadmap

- [ ] Two-factor authentication (2FA) support
- [ ] Group chat with multi-user E2EE
- [ ] Encrypted file sharing capabilities
- [ ] Message reactions and rich text formatting
- [ ] User profiles and status indicators
- [ ] Message search functionality
- [ ] Read receipts and typing indicators
- [ ] Native mobile apps (React Native)
- [ ] Desktop application (Electron)
- [ ] Message history with encrypted storage
- [ ] Voice/Video calling with E2EE
- [ ] User verification system
- [ ] Docker containerization
- [ ] End-to-end testing suite

---

## ❓ FAQ

**Q: Is my data stored on your servers?**  
A: Messages are encrypted on your device before transmission. The server stores only encrypted data; only you and your recipient can decrypt messages.

**Q: Can you or anyone else read my messages?**  
A: No. End-to-end encryption ensures only you and your chat partner have the cryptographic keys to decrypt messages.

**Q: How secure is this application?**  
A: This application implements modern encryption standards and authentication mechanisms. However, for production use, conduct a professional security audit.

**Q: Is this production-ready?**  
A: This is a feature-complete demonstration of secure messaging concepts. For production deployment, conduct security audits and review the codebase with security professionals.

**Q: How do I report a security vulnerability?**  
A: Please email security concerns to kushalram0712@github.com rather than using the public issue tracker. Include details and reproduction steps.

**Q: What happens if I forget my password?**  
A: Currently, use the admin API to reset passwords. In a production environment, implement email-based password recovery.

**Q: Can I self-host this application?**  
A: Yes! This is open-source software. You can host it on your own servers or in the cloud.

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.5.0",
    "better-sqlite3": "^8.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "nodemon": "^2.0.0"
  }
}
```

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 💡 Acknowledgments

- Built with ❤️ using vanilla JavaScript and Node.js
- Inspired by modern privacy-focused communication tools
- Thanks to all contributors and the open-source community
- Socket.IO for real-time communication
- SQLite for reliable data persistence

---

## 📞 Support & Contact

- 💬 **Issues & Discussions**: [GitHub Issues](https://github.com/kushalram0712/E2EE-chat/issues)
- 🔒 **Security**: kushalram0712@github.com (for security vulnerabilities)
- 👤 **Author**: [kushalram0712](https://github.com/kushalram0712)

---

## 🌟 Show Your Support

If you find this project helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs or suggesting features
- 🤝 Contributing to the project
- 📢 Sharing with your network

---

**Last Updated**: June 2026  
**Made with ❤️ by [Kushal Ram](https://github.com/kushalram0712)**

