// Anonymous Fun Chat - server.js
// Live group chat, no auth, no message persistence, ephemeral files.
// Includes: file sharing, voice messages, GIF search, live user stats.

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
// Files are stored in RAM and automatically deleted
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
// Images / Audio / Documents
// =====================================================

app.post(
  '/upload',
  upload.single('file'),
  (req, res) => {

    try {

      if (!req.file) {

        return res.status(400).json({
          error: 'No file uploaded'
        });

      }


      // Generate unique ID

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

        success: true,

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

    } catch (error) {

      console.error(
        'Upload error:',
        error
      );

      res.status(500).json({
        error: 'Upload failed'
      });

    }

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
// GIPHY GIF SEARCH
// API KEY IS STORED IN RENDER ENVIRONMENT VARIABLE
//
// Render:
// GIPHY_API_KEY = your_api_key
// =====================================================

app.get(
  '/api/gifs',
  async (req, res) => {

    try {

      const apiKey =
        process.env.GIPHY_API_KEY;


      // Check API key

      if (!apiKey) {

        return res.status(500).json({

          error:
            'GIPHY API key is not configured on the server.'

        });

      }


      // Search query

      const query =
        (
          req.query.q ||
          'funny'
        )
        .toString()
        .trim()
        .slice(0, 100);


      // Limit

      let limit =
        parseInt(
          req.query.limit || '20',
          10
        );


      if (
        Number.isNaN(limit) ||
        limit < 1
      ) {
        limit = 20;
      }


      if (limit > 30) {
        limit = 30;
      }


      // GIPHY URL

      const giphyUrl =
        'https://api.giphy.com/v1/gifs/search' +
        '?api_key=' +
        encodeURIComponent(apiKey) +
        '&q=' +
        encodeURIComponent(
          query || 'funny'
        ) +
        '&limit=' +
        limit +
        '&rating=pg-13' +
        '&lang=en';


      // Request GIPHY

      const response =
        await fetch(giphyUrl);


      if (!response.ok) {

        console.error(
          'GIPHY response:',
          response.status
        );


        return res.status(
          response.status
        ).json({

          error:
            'GIPHY request failed.'

        });

      }


      const data =
        await response.json();


      // Format GIF results

      const gifs =
        (data.data || [])
        .map(
          (gif) => {

            const images =
              gif.images || {};


            return {

              id:
                gif.id,

              title:
                gif.title || 'GIF',

              url:
                images.fixed_height?.url ||
                images.original?.url ||
                '',

              preview:
                images.fixed_height_small?.url ||
                images.fixed_width_small?.url ||
                images.fixed_height?.url ||
                images.original?.url ||
                ''

            };

          }
        )
        .filter(
          gif =>
            gif.url
        );


      res.json({

        success: true,

        gifs

      });

    } catch (error) {

      console.error(
        'GIPHY error:',
        error
      );


      res.status(500).json({

        error:
          'Unable to load GIFs.'

      });

    }

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

    // -------------------------------------------------
    // NEW USER CONNECTED
    // -------------------------------------------------

    totalUsers++;


    // -------------------------------------------------
    // SEND USER STATISTICS
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

        const name =
          typeof payload?.name === 'string'
            ? payload.name
                .trim()
                .slice(0, 20)
            : null;


        socket.broadcast.emit(
          'system',
          {

            type:
              'join',

            at:
              Date.now(),

            name:
              name || null

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
                .trim()
                .slice(0, 20)
            : null;


        // Ignore completely empty message

        if (!text.trim()) {
          return;
        }


        io.emit(
          'chat',
          {

            text:

              text,

            name:

              name || null,

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
          typeof fileInfo.link !== 'string'
        ) {

          return;

        }


        io.emit(
          'fileShared',
          {

            link:
              fileInfo.link,

            filename:
              fileInfo.filename || 'file',

            size:
              Number(fileInfo.size) || 0,

            mime:
              fileInfo.mime || 'application/octet-stream',

            ttlMinutes:
              Number(fileInfo.ttlMinutes) ||
              TTL_MINUTES,

            name:
              typeof fileInfo.name === 'string'
                ? fileInfo.name
                    .trim()
                    .slice(0, 20)
                : null,

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
          typeof gifInfo.url !== 'string'
        ) {

          return;

        }


        // Basic URL validation

        let gifUrl;

        try {

          gifUrl =
            new URL(
              gifInfo.url
            );

        } catch {

          return;

        }


        // Only allow HTTP/HTTPS

        if (
          gifUrl.protocol !== 'https:' &&
          gifUrl.protocol !== 'http:'
        ) {

          return;

        }


        const name =
          typeof gifInfo.name === 'string'
            ? gifInfo.name
                .trim()
                .slice(0, 20)
            : null;


        io.emit(
          'gifShared',
          {

            id:
              gifInfo.id || null,

            url:
              gifInfo.url,

            preview:
              typeof gifInfo.preview === 'string'
                ? gifInfo.preview
                : gifInfo.url,

            title:
              typeof gifInfo.title === 'string'
                ? gifInfo.title
                    .slice(0, 200)
                : 'GIF',

            name:
              name || null,

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

            type:
              'leave',

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
      `Anon Fun Chat running on port ${PORT}`
    );

    console.log(
      `File expiry: ${TTL_MINUTES} minutes`
    );

    console.log(
      `GIPHY API: ${
        process.env.GIPHY_API_KEY
          ? 'Configured'
          : 'NOT CONFIGURED'
      }`
    );

  }
);
