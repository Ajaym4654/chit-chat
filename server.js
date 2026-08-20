// =====================================================
// ANONYMOUS FUN CHAT - SERVER.JS
// =====================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// =====================================================
// SERVE FRONTEND
// =====================================================

app.use(express.static('public'));

const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

app.get('/api/gifs/search', async (req, res) => {
  try {
    if (!GIPHY_API_KEY) {
      return res.status(500).json({
        error: 'GIPHY_API_KEY is not configured on server'
      });
    }

    const query = String(req.query.q || 'funny').trim();

    const limit = 20;

    const url =
      `https://api.giphy.com/v1/gifs/search` +
      `?api_key=${encodeURIComponent(GIPHY_API_KEY)}` +
      `&q=${encodeURIComponent(query)}` +
      `&limit=${limit}` +
      `&rating=pg-13` +
      `&lang=en`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GIPHY API error:', errorText);

      return res.status(502).json({
        error: 'GIPHY request failed'
      });
    }

    const data = await response.json();

    const gifs = (data.data || []).map(gif => ({
      id: gif.id,
      title: gif.title,
      url: gif.images?.original?.url,
      preview:
        gif.images?.fixed_width?.url ||
        gif.images?.downsized?.url ||
        gif.images?.original?.url
    })).filter(gif => gif.url);

    res.json({ gifs });

  } catch (error) {
    console.error('GIF search error:', error);

    res.status(500).json({
      error: 'Unable to search GIFs'
    });
  }
});

// =====================================================
// GIPHY API PROXY
// API KEY STAYS ON SERVER
// =====================================================

app.get('/api/gifs', async (req, res) => {

  try {

    const apiKey = process.env.GIPHY_API_KEY;

    if (!apiKey) {

      return res.status(500).json({
        error: 'GIPHY API key is not configured on server.'
      });

    }

    const query =
      (req.query.q || 'funny')
        .toString()
        .slice(0, 100);

    const limit = Math.min(
      Math.max(
        parseInt(req.query.limit || '24', 10),
        1
      ),
      50
    );

    const url =
      'https://api.giphy.com/v1/gifs/search' +
      '?api_key=' + encodeURIComponent(apiKey) +
      '&q=' + encodeURIComponent(query) +
      '&limit=' + limit +
      '&rating=pg-13';

    const response = await fetch(url);

    if (!response.ok) {

      console.error(
        'GIPHY API error:',
        response.status
      );

      return res.status(response.status).json({
        error: 'GIPHY request failed.'
      });

    }

    const data = await response.json();

    const gifs =
      (data.data || [])
        .map(gif => ({

          id: gif.id,

          title:
            gif.title || '',

          url:
            gif.images?.original?.url || '',

          preview:
            gif.images?.fixed_width_small?.url ||
            gif.images?.preview_gif?.url ||
            gif.images?.original?.url ||
            ''

        }))
        .filter(gif => gif.url);

    res.json({
      gifs
    });

  } catch (error) {

    console.error(
      'GIPHY error:',
      error
    );

    res.status(500).json({
      error: 'Unable to load GIFs.'
    });

  }

});


// =====================================================
// FILE STORAGE
// EPHEMERAL - RAM ONLY
// =====================================================

const storage = new Map();

const TTL_MINUTES = parseInt(
  process.env.FILE_TTL_MINUTES || '10',
  10
);


// =====================================================
// DELETE EXPIRED FILES
// EVERY 1 MINUTE
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
// MAX FILE SIZE = 50MB
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

    try {

      if (!req.file) {

        return res.status(400).json({
          error: 'No file uploaded'
        });

      }


      const id =
        Math.random()
          .toString(36)
          .slice(2) +
        Date.now()
          .toString(36);


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
// TOTAL USERS
// =====================================================

let totalUsers = 0;


// =====================================================
// SOCKET.IO
// =====================================================

io.on(
  'connection',
  (socket) => {

    totalUsers++;


    // -------------------------------------------------
    // USER STATS
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
    // HELLO / JOIN
    // -------------------------------------------------

    socket.on(
      'hello',
      (payload) => {

        const name =
          typeof payload?.name === 'string'
            ? payload.name
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
                .slice(0, 20)
            : null;


        if (!text.trim()) {
          return;
        }


        io.emit(
          'chat',
          {

            text,

            name,

            at:
              Date.now()

          }
        );

      }
    );


    // -------------------------------------------------
    // FILE SHARED
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

            link:
              fileInfo.link,

            filename:
              fileInfo.filename ||
              'file',

            size:
              Number(fileInfo.size) || 0,

            mime:
              fileInfo.mime ||
              'application/octet-stream',

            ttlMinutes:
              Number(
                fileInfo.ttlMinutes
              ) || TTL_MINUTES,

            name:
              typeof fileInfo.name === 'string'
                ? fileInfo.name.slice(0, 20)
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

            title:
              gifInfo.title ||
              'GIF',

            name:
              typeof gifInfo.name === 'string'
                ? gifInfo.name.slice(0, 20)
                : null,

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
