// Anonymous Fun Chat - server.js
// Live group chat, no auth, no message persistence, ephemeral in-memory files.

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// =====================================================
// SERVE WEBSITE
// =====================================================

app.use(express.static('public'));


// =====================================================
// EPHEMERAL FILE STORAGE
// Files are kept in RAM and automatically deleted
// after TTL_MINUTES.
// =====================================================

const storage = new Map();

const TTL_MINUTES = parseInt(
  process.env.FILE_TTL_MINUTES || '10',
  10
);


// =====================================================
// DELETE EXPIRED FILES
// Runs every 1 minute
// =====================================================

setInterval(() => {

  const now = Date.now();

  for (const [id, file] of storage.entries()) {

    if (file.expiresAt <= now) {
      storage.delete(id);
    }

  }

}, 60 * 1000);


// =====================================================
// MULTER
// Maximum file size: 50 MB
// =====================================================

const upload = multer({

  storage: multer.memoryStorage(),

  limits: {
    fileSize: 50 * 1024 * 1024
  }

});


// =====================================================
// FILE UPLOAD
// =====================================================

app.post(
  '/upload',
  upload.single('file'),
  (req, res) => {

    if (!req.file) {

      return res.status(400).json({
        error: 'No file uploaded'
      });

    }


    const id =
      Math.random()
        .toString(36)
        .slice(2) +
      Date.now().toString(36);


    // Clean filename
    const safeName =
      (
        req.body.filename ||
        req.file.originalname ||
        'file'
      )
      .replace(
        /[^\w\-. ]+/g,
        '_'
      );


    const filename = safeName;


    // Save temporarily in memory
    storage.set(id, {

      buffer:
        req.file.buffer,

      mime:
        req.file.mimetype,

      filename:
        filename,

      size:
        req.file.size,

      expiresAt:
        Date.now() +
        TTL_MINUTES * 60 * 1000

    });


    const link =
      `/download/${id}`;


    res.json({

      id,

      link,

      filename,

      size:
        req.file.size,

      mime:
        req.file.mimetype,

      ttlMinutes:
        TTL_MINUTES

    });

  }
);


// =====================================================
// DOWNLOAD FILE
// =====================================================

app.get(
  '/download/:id',
  (req, res) => {

    const file =
      storage.get(
        req.params.id
      );


    if (!file) {

      return res
        .status(404)
        .send(
          'File not found or expired.'
        );

    }


    res.setHeader(
      'Content-Type',
      file.mime ||
      'application/octet-stream'
    );


    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(
        file.filename
      )}"`
    );


    res.send(
      file.buffer
    );

  }
);


// =====================================================
// LIVE USER COUNT
// =====================================================

let totalUsers = 0;


// =====================================================
// SOCKET.IO
// =====================================================

io.on(
  'connection',
  (socket) => {

    // New user connected
    totalUsers++;


    // -------------------------------------------------
    // Send current user statistics
    // -------------------------------------------------

    function sendUserStats() {

      io.emit(
        'userStats',
        {
          live:
            io.engine.clientsCount,

          total:
            totalUsers
        }
      );

    }


    sendUserStats();


    // -------------------------------------------------
    // USER JOINED
    // -------------------------------------------------

    socket.on(
      'hello',
      (payload) => {

        socket.broadcast.emit(
          'system',
          {
            type: 'join',

            at:
              Date.now(),

            name:
              payload?.name ||
              null
          }
        );

      }
    );


    // -------------------------------------------------
    // CHAT MESSAGE
    // -------------------------------------------------

    socket.on(
      'chat',
      (msg) => {

        let text =
          typeof msg?.text === 'string'
            ? msg.text
            : '';


        // Maximum 2000 characters
        if (
          text.length > 2000
        ) {

          text =
            text.slice(
              0,
              2000
            );

        }


        const name =
          typeof msg?.name === 'string'
            ? msg.name
            : null;


        io.emit(
          'chat',
          {

            text:

              text,

            name:

              name,

            at:

              Date.now()

          }
        );

      }
    );


    // -------------------------------------------------
    // FILE SHARED
    // Images / Audio / Documents
    // -------------------------------------------------

    socket.on(
      'fileShared',
      (fileInfo) => {

        if (
          !fileInfo ||
          !fileInfo.link
        ) {
          return;
        }


        io.emit(
          'fileShared',
          {

            ...fileInfo,

            at:
              Date.now()

          }
        );

      }
    );


    // -------------------------------------------------
    // GIF SHARED
    // -------------------------------------------------

    socket.on(
      'gifShared',
      (gifInfo) => {

        if (
          !gifInfo ||
          !gifInfo.url
        ) {
          return;
        }


        io.emit(
          'gifShared',
          {

            url:
              gifInfo.url,

            preview:
              gifInfo.preview ||
              gifInfo.url,

            name:
              gifInfo.name ||
              null,

            at:
              Date.now()

          }
        );

      }
    );


    // -------------------------------------------------
    // USER DISCONNECTED
    // -------------------------------------------------

    socket.on(
      'disconnect',
      () => {

        socket.broadcast.emit(
          'system',
          {
            type: 'leave',

            at:
              Date.now()
          }
        );


        sendUserStats();

      }
    );

  }
);


// =====================================================
// START SERVER
// =====================================================

server.listen(
  PORT,
  () => {

    console.log(
      `Anon Fun Chat running on http://localhost:${PORT}`
    );

    console.log(
      `File expiry: ${TTL_MINUTES} minutes`
    );

  }
);
