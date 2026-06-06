# E2EE Chat

A secure real-time chat application built with Node.js, Express, Socket.IO, JWT authentication, and SQLite.  
This project demonstrates encrypted messaging concepts with authenticated users and WebSocket-based communication.

---

# Features

- Real-time chat using Socket.IO
- JWT-based authentication
- SQLite database storage
- Password hashing with bcrypt
- Admin API for user management
- Message persistence
- End-to-end encryption message structure
- Simple deployment setup

---

# Tech Stack

- Node.js
- Express.js
- Socket.IO
- better-sqlite3
- JWT (jsonwebtoken)
- bcryptjs

---

# Project Structure

```bash
E2EE-chat/
│
├── public/            # Frontend files
├── server.js          # Main backend server
├── package.json       # Dependencies and scripts
├── vault.db           # SQLite database
└── README.md
```

---

# Installation

## 1. Clone the repository

```bash
git clone https://github.com/kushalram0712/E2EE-chat.git
cd E2EE-chat
```

## 2. Install dependencies

```bash
npm install
```

## 3. Start the server

```bash
npm start
```

Server runs on:

```bash
http://localhost:3000
```

---

# Default Users

The application automatically seeds default users when the database is empty.

| Username | Password |
|----------|----------|
| alice | password123 |
| bob | secure456 |

---

# Authentication

Users authenticate using the `/api/login` endpoint.

Example request:

```http
POST /api/login
Content-Type: application/json
```

```json
{
  "username": "alice",
  "password": "password123"
}
```

Successful response:

```json
{
  "success": true,
  "token": "JWT_TOKEN",
  "username": "alice"
}
```

---

# Admin API

Admin endpoints require the header:

```http
x-admin-key: vault-admin-777
```

## Get All Users

```http
GET /api/admin/users
```

## Create User

```http
POST /api/admin/users
```

```json
{
  "username": "newuser",
  "password": "mypassword"
}
```

## Update Password

```http
PUT /api/admin/users
```

```json
{
  "username": "alice",
  "newPassword": "newpass123"
}
```

## Delete User

```http
DELETE /api/admin/users/:username
```

---

# WebSocket Authentication

Socket.IO connections require a JWT token.

Example:

```javascript
const socket = io({
  auth: {
    token: "JWT_TOKEN"
  }
});
```

---

# Database Schema

## Users Table

| Column | Type |
|--------|------|
| username | TEXT |
| password | TEXT |

## Messages Table

| Column | Type |
|--------|------|
| id | INTEGER |
| sender | TEXT |
| iv | TEXT |
| ciphertext | TEXT |
| signature | TEXT |
| timestamp | DATETIME |

---

# Security Notes

This project demonstrates secure messaging concepts but should be improved before production use:

- Move secrets to environment variables
- Use HTTPS
- Implement proper E2EE key exchange
- Add rate limiting
- Add refresh tokens
- Improve session handling
- Use stronger secret management

---

# Environment Variables (Recommended)

Create a `.env` file:

```env
JWT_SECRET=your-secret-key
ADMIN_API_KEY=your-admin-key
PORT=3000
```

---

# Future Improvements

- Private rooms
- User registration
- Typing indicators
- File sharing
- Group chats
- Better encryption key management
- Docker deployment
- React frontend
- Message deletion

---

# License

MIT License

---

# Author

Developed by Kushal Ram

GitHub:
https://github.com/kushalram0712