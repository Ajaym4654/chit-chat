// Anonymous Fun Chat - server.js
// Live group chat, no auth, no message persistence, ephemeral in-memory files.

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const mime = require('mime-types');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static assets
app.use(express.static('public'));

// --- In-memory, ephemeral file store ---
const storage = new Map(); // id -> {buffer, mime, filename, size, expiresAt}
const TTL_MINUTES = parseInt(process.env.FILE_TTL_MINUTES || "10", 10); // default 60 minutes

// Clean-up loop every 1 min
setInterval(() => {
  const now = Date.now();
  for (const [id, file] of storage.entries()) {
    if (file.expiresAt <= now) {
      storage.delete(id);
    }
  }
}, 60 * 1000);

// Multer setup (memory storage; no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);

  const ext = mime.extension(req.file.mimetype) || '';
  const safeName = (req.body.filename || req.file.originalname || 'file').replace(/[^\w\-. ]+/g, '_');
  const filename = safeName;

  storage.set(id, {
    buffer: req.file.buffer,
    mime: req.file.mimetype,
    filename,
    size: req.file.size,
    expiresAt: Date.now() + TTL_MINUTES * 60 * 1000,
  });

  const link = `/download/${id}`;
  res.json({
    id,
    link,
    filename,
    size: req.file.size,
    mime: req.file.mimetype,
    ttlMinutes: TTL_MINUTES
  });
});

// Download endpoint
app.get('/download/:id', (req, res) => {
  const file = storage.get(req.params.id);
  if (!file) return res.status(404).send('File not found or expired.');
  res.setHeader('Content-Type', file.mime || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
  res.send(file.buffer);
});

// Socket.IO for realtime chat
io.on('connection', (socket) => {
  // Broadcast join/leave events (no IPs, nothing personal).
  socket.on('hello', (payload) => {
    socket.broadcast.emit('system', { type: 'join', at: Date.now(), name: payload?.name || null });
  });
  socket.on('disconnect', () => {
    socket.broadcast.emit('system', { type: 'leave', at: Date.now() });
  });

  // Relay messages without storing
  socket.on('chat', (msg) => {
    if (typeof msg?.text === 'string' && msg.text.length > 2000) {
      msg.text = msg.text.slice(0, 2000);
    }
    io.emit('chat', {
      text: (msg?.text || '').toString(),
      name: msg?.name || null,
      at: Date.now(),
    });
  });

  // Relay file announcements
  socket.on('fileShared', (fileInfo) => {
    io.emit('fileShared', { ...fileInfo, at: Date.now() });
  });
});

server.listen(PORT, () => {
  console.log(`Anon Fun Chat running on http://localhost:${PORT}`);
});


let totalUsers = 0;

io.on('connection', (socket) => {
  totalUsers++;

  function sendUserStats() {
    io.emit('userStats', {
      live: io.engine.clientsCount,
      total: totalUsers
    });
  }

  sendUserStats();

  socket.on('disconnect', () => {
    sendUserStats();
  });
});
