// =====================================================
// ANONYMOUS FUN CHAT - SERVER.JS
// Chat + GIF + Files + YouTube Shared Music
// =====================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');


// =====================================================
// APP SETUP
// =====================================================

const app = express();

const server = http.createServer(app);

const io = new Server(server);

const PORT = process.env.PORT || 3000;


// =====================================================
// SERVE FRONTEND
// =====================================================

app.use(express.static('public'));


// =====================================================
// API KEYS
// =====================================================

const GIPHY_API_KEY =
  process.env.GIPHY_API_KEY;

const YOUTUBE_API_KEY =
  process.env.YOUTUBE_API_KEY;


// =====================================================
// GIPHY SEARCH
// =====================================================

app.get(
  '/api/gifs/search',
  async (req, res) => {

    try {

      if (!GIPHY_API_KEY) {

        return res.status(500).json({
          error:
            'GIPHY_API_KEY is not configured on server'
        });

      }

      const query =
        String(
          req.query.q || 'funny'
        )
          .trim()
          .slice(0, 100);

      const limit = 20;

      const url =
        'https://api.giphy.com/v1/gifs/search' +
        '?api_key=' +
        encodeURIComponent(
          GIPHY_API_KEY
        ) +
        '&q=' +
        encodeURIComponent(
          query || 'funny'
        ) +
        '&limit=' +
        limit +
        '&rating=pg-13' +
        '&lang=en';

      const response =
        await fetch(url);

      if (!response.ok) {

        const errorText =
          await response.text();

        console.error(
          'GIPHY API error:',
          response.status,
          errorText
        );

        return res.status(502).json({
          error:
            'GIPHY request failed'
        });

      }

      const data =
        await response.json();

      const gifs =
        (data.data || [])
          .map(gif => ({

            id:
              gif.id,

            title:
              gif.title || '',

            url:
              gif.images?.original?.url || '',

            preview:
              gif.images?.fixed_width?.url ||
              gif.images?.fixed_width_small?.url ||
              gif.images?.downsized?.url ||
              gif.images?.preview_gif?.url ||
              gif.images?.original?.url ||
              ''

          }))
          .filter(
            gif => gif.url
          );

      res.json({
        gifs
      });

    } catch (error) {

      console.error(
        'GIF search error:',
        error
      );

      res.status(500).json({
        error:
          'Unable to search GIFs'
      });

    }

  }
);


// =====================================================
// YOUTUBE SEARCH
// API KEY STAYS ON SERVER
// =====================================================

app.get(
  '/api/youtube/search',
  async (req, res) => {

    try {

      if (!YOUTUBE_API_KEY) {

        console.error(
          'YOUTUBE_API_KEY is not configured.'
        );

        return res.status(500).json({
          error:
            'YOUTUBE_API_KEY is not configured on server'
        });

      }

      const query =
        String(
          req.query.q || ''
        )
          .trim()
          .slice(0, 100);

      if (!query) {

        return res.status(400).json({
          error:
            'Please enter a search term'
        });

      }

      const limit =
        Math.min(
          Math.max(
            parseInt(
              req.query.limit || '8',
              10
            ),
            1
          ),
          15
        );

      const url =
        'https://www.googleapis.com/youtube/v3/search' +
        '?part=snippet' +
        '&type=video' +
        '&maxResults=' +
        limit +
        '&q=' +
        encodeURIComponent(query) +
        '&key=' +
        encodeURIComponent(
          YOUTUBE_API_KEY
        );

      const response =
        await fetch(url);

      if (!response.ok) {

        const errorText =
          await response.text();

        console.error(
          'YouTube API error:',
          response.status,
          errorText
        );

        return res.status(502).json({
          error:
            'YouTube search failed'
        });

      }

      const data =
        await response.json();

      const videos =
        (data.items || [])
          .map(item => {

            const videoId =
              item.id?.videoId;

            if (!videoId) {
              return null;
            }

            return {

              id:
                videoId,

              title:
                item.snippet?.title ||
                'YouTube Video',

              channel:
                item.snippet?.channelTitle ||
                '',

              thumbnail:
                item.snippet?.thumbnails?.medium?.url ||
                item.snippet?.thumbnails?.default?.url ||
                ''

            };

          })
          .filter(Boolean);

      res.json({
        videos
      });

    } catch (error) {

      console.error(
        'YouTube search error:',
        error
      );

      res.status(500).json({
        error:
          'Unable to search YouTube'
      });

    }

  }
);


// =====================================================
// FILE STORAGE
// EPHEMERAL - RAM ONLY
// =====================================================

const storage =
  new Map();

const TTL_MINUTES =
  parseInt(
    process.env.FILE_TTL_MINUTES || '10',
    10
  );


// =====================================================
// DELETE EXPIRED FILES
// =====================================================

setInterval(
  () => {

    const now =
      Date.now();

    for (
      const [
        id,
        file
      ] of storage.entries()
    ) {

      if (
        file.expiresAt <= now
      ) {

        storage.delete(id);

      }

    }

  },
  60 * 1000
);


// =====================================================
// MULTER
// MAX FILE SIZE = 50MB
// =====================================================

const upload =
  multer({

    storage:
      multer.memoryStorage(),

    limits: {

      fileSize:
        50 * 1024 * 1024

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
          error:
            'No file uploaded'
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

      const filename =
        safeName;

      const expiresAt =
        Date.now() +
        TTL_MINUTES *
        60 *
        1000;

      storage.set(
        id,
        {

          buffer:
            req.file.buffer,

          mime:
            req.file.mimetype,

          filename:
            filename,

          size:
            req.file.size,

          expiresAt:
            expiresAt

        }
      );

      const link =
        '/download/' + id;

      res.json({

        id:
          id,

        link:
          link,

        filename:
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
        error:
          'Upload failed'
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
      'attachment; filename="' +
        encodeURIComponent(
          file.filename
        ) +
        '"'
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
// YOUTUBE SHARED STATE
// =====================================================

let youtubeState = {

  videoId:
    null,

  title:
    '',

  state:
    'stopped',

  time:
    0,

  updatedAt:
    Date.now()

};


// =====================================================
// GET CURRENT YOUTUBE TIME
// =====================================================

function getYoutubeCurrentTime() {

  if (
    youtubeState.state ===
      'playing' &&
    youtubeState.updatedAt
  ) {

    const elapsed =
      (
        Date.now() -
        youtubeState.updatedAt
      ) / 1000;

    return Math.max(
      0,
      youtubeState.time +
      elapsed
    );

  }

  return Math.max(
    0,
    youtubeState.time || 0
  );

}


// =====================================================
// SOCKET.IO
// =====================================================

io.on(
  'connection',
  (socket) => {

    totalUsers++;


    // =================================================
    // USER STATS
    // =================================================

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


    // =================================================
    // SEND CURRENT YOUTUBE STATE TO NEW USER
    // =================================================

    socket.emit(
      'youtubeState',
      {

        videoId:
          youtubeState.videoId,

        title:
          youtubeState.title,

        state:
          youtubeState.state,

        time:
          getYoutubeCurrentTime(),

        updatedAt:
          youtubeState.updatedAt

      }
    );


    // =================================================
    // HELLO / JOIN
    // =================================================

    socket.on(
      'hello',
      (payload) => {

        const name =
          typeof payload?.name === 'string'
            ? payload.name.slice(
                0,
                20
              )
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


    // =================================================
    // CHAT
    // =================================================

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
            ? msg.name.slice(
                0,
                20
              )
            : null;

        if (
          !text.trim()
        ) {

          return;

        }

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


    // =================================================
    // FILE SHARED
    // =================================================

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
              Number(
                fileInfo.size
              ) || 0,

            mime:
              fileInfo.mime ||
              'application/octet-stream',

            ttlMinutes:
              Number(
                fileInfo.ttlMinutes
              ) ||
              TTL_MINUTES,

            name:
              typeof fileInfo.name ===
              'string'
                ? fileInfo.name.slice(
                    0,
                    20
                  )
                : null,

            at:
              Date.now()

          }
        );

      }
    );


    // =================================================
    // GIF SHARED
    // =================================================

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
              typeof gifInfo.name ===
              'string'
                ? gifInfo.name.slice(
                    0,
                    20
                  )
                : null,

            at:
              Date.now()

          }
        );

      }
    );


    // =================================================
    // YOUTUBE LOAD
    // =================================================

    socket.on(
      'youtubeLoad',
      (data) => {

        if (
          !data ||
          typeof data.videoId !==
            'string'
        ) {

          return;

        }

        const videoId =
          data.videoId.trim();

        // YouTube video IDs are normally 11 chars
        if (
          !/^[a-zA-Z0-9_-]{11}$/.test(
            videoId
          )
        ) {

          return;

        }

        youtubeState = {

          videoId:
            videoId,

          title:
            typeof data.title ===
            'string'
              ? data.title.slice(
                  0,
                  200
                )
              : '',

          state:
            'paused',

          time:
            0,

          updatedAt:
            Date.now()

        };

        io.emit(
          'youtubeLoad',
          {

            videoId:
              videoId,

            title:
              youtubeState.title,

            time:
              0

          }
        );

      }
    );


    // =================================================
    // YOUTUBE PLAY
    // =====================================================

    socket.on(
      'youtubePlay',
      (data) => {

        if (
          !youtubeState.videoId
        ) {

          return;

        }

        const time =
          Number(
            data?.time
          );

        youtubeState.time =
          Number.isFinite(time)
            ? Math.max(
                0,
                time
              )
            : getYoutubeCurrentTime();

        youtubeState.state =
          'playing';

        youtubeState.updatedAt =
          Date.now();

        io.emit(
          'youtubePlay',
          {

            videoId:
              youtubeState.videoId,

            time:
              youtubeState.time

          }
        );

      }
    );


    // =================================================
    // YOUTUBE PAUSE
    // =================================================

    socket.on(
      'youtubePause',
      (data) => {

        if (
          !youtubeState.videoId
        ) {

          return;

        }

        const time =
          Number(
            data?.time
          );

        youtubeState.time =
          Number.isFinite(time)
            ? Math.max(
                0,
                time
              )
            : getYoutubeCurrentTime();

        youtubeState.state =
          'paused';

        youtubeState.updatedAt =
          Date.now();

        io.emit(
          'youtubePause',
          {

            videoId:
              youtubeState.videoId,

            time:
              youtubeState.time

          }
        );

      }
    );


    // =================================================
    // YOUTUBE SEEK
    // =================================================

    socket.on(
      'youtubeSeek',
      (data) => {

        if (
          !youtubeState.videoId
        ) {

          return;

        }

        const time =
          Number(
            data?.time
          );

        if (
          !Number.isFinite(time)
        ) {

          return;

        }

        youtubeState.time =
          Math.max(
            0,
            time
          );

        youtubeState.updatedAt =
          Date.now();

        io.emit(
          'youtubeSeek',
          {

            videoId:
              youtubeState.videoId,

            time:
              youtubeState.time

          }
        );

      }
    );


    // =================================================
    // YOUTUBE STOP
    // =================================================

    socket.on(
      'youtubeStop',
      () => {

        youtubeState = {

          videoId:
            null,

          title:
            '',

          state:
            'stopped',

          time:
            0,

          updatedAt:
            Date.now()

        };

        io.emit(
          'youtubeStop'
        );

      }
    );


    // =================================================
    // DISCONNECT
    // =================================================

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
      'Anon Fun Chat running on port ' +
      PORT
    );

    console.log(
      'File expiry: ' +
      TTL_MINUTES +
      ' minutes'
    );

    console.log(
      'GIPHY API: ' +
      (
        GIPHY_API_KEY
          ? 'Configured'
          : 'NOT CONFIGURED'
      )
    );

    console.log(
      'YouTube API: ' +
      (
        YOUTUBE_API_KEY
          ? 'Configured'
          : 'NOT CONFIGURED'
      )
    );

  }
);
