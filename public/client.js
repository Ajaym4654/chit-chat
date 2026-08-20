// =====================================================
// ANON FUN CHAT - CLIENT.JS
// Chat + GIF + Files + Voice + Shared YouTube
// =====================================================

const socket = io();


// =====================================================
// ELEMENTS
// =====================================================

const chatArea =
  document.getElementById('chatArea');

const nameInput =
  document.getElementById('name');

const msgInput =
  document.getElementById('msg');

const sendBtn =
  document.getElementById('sendBtn');

const fileInput =
  document.getElementById('fileInput');

const fileQueue =
  document.getElementById('fileQueue');

const emojiBtn =
  document.getElementById('emojiBtn');

const emojiPicker =
  document.getElementById('emojiPicker');

const liveUsersEl =
  document.getElementById('liveUsers');

const totalUsersEl =
  document.getElementById('totalUsers');


// =====================================================
// GIF
// =====================================================

const gifBtn =
  document.getElementById('gifBtn');

const gifPicker =
  document.getElementById('gifPicker');

const gifSearch =
  document.getElementById('gifSearch');

const gifSearchBtn =
  document.getElementById('gifSearchBtn');

const gifResults =
  document.getElementById('gifResults');


// =====================================================
// VOICE
// =====================================================

const voiceBtn =
  document.getElementById('voiceBtn');


// =====================================================
// YOUTUBE
// =====================================================

const youtubeSearch =
  document.getElementById('youtubeSearch');

const youtubeSearchBtn =
  document.getElementById('youtubeSearchBtn');

const youtubeResults =
  document.getElementById('youtubeResults');

const youtubePlayerPanel =
  document.getElementById('youtubePlayerPanel');

const youtubePlayerTitle =
  document.getElementById('youtubePlayerTitle');

const youtubeStatus =
  document.getElementById('youtubeStatus');

const youtubeCloseBtn =
  document.getElementById('youtubeCloseBtn');

const youtubePlayerContainer =
  document.getElementById(
    'youtubePlayer'
  );


// =====================================================
// ANONYMOUS NAME
// =====================================================

const anonTag =
  'Anon#' +
  Math.random()
    .toString(36)
    .slice(2, 6);

if (nameInput) {

  nameInput.placeholder =
    `Name (optional, e.g., ${anonTag})`;

}


// =====================================================
// YOUTUBE VARIABLES
// =====================================================

let youtubePlayer =
  null;

let youtubeReady =
  false;

let youtubeApiReady =
  false;

let pendingVideoId =
  null;

let pendingVideoTime =
  0;

let suppressYoutubeEvents =
  false;

let lastKnownYoutubeTime =
  0;

let currentYoutubeVideoId =
  null;


// =====================================================
// LOAD YOUTUBE IFRAME API
// =====================================================

function loadYouTubeAPI() {

  if (
    document.getElementById(
      'youtube-iframe-api'
    )
  ) {

    return;

  }

  const script =
    document.createElement(
      'script'
    );

  script.id =
    'youtube-iframe-api';

  script.src =
    'https://www.youtube.com/iframe_api';

  document.head.appendChild(
    script
  );

}

loadYouTubeAPI();


// =====================================================
// YOUTUBE API CALLBACK
// =====================================================

window.onYouTubeIframeAPIReady =
  function () {

    youtubeApiReady =
      true;

    createYoutubePlayer();

  };


// =====================================================
// CREATE YOUTUBE PLAYER
// =====================================================

function createYoutubePlayer() {

  if (
    !youtubePlayerContainer
  ) {

    return;

  }

  if (
    youtubePlayer
  ) {

    return;

  }

  youtubePlayer =
    new YT.Player(
      'youtubePlayer',
      {

        width:
          '100%',

        height:
          '180',

        videoId:
          pendingVideoId || '',

        playerVars: {

          autoplay:
            0,

          controls:
            1,

          rel:
            0,

          modestbranding:
            1,

          playsinline:
            1

        },

        events: {

          onReady:
            onYoutubePlayerReady,

          onStateChange:
            onYoutubeStateChange

        }

      }
    );

}


// =====================================================
// YOUTUBE PLAYER READY
// =====================================================

function onYoutubePlayerReady() {

  youtubeReady =
    true;

  if (
    pendingVideoId
  ) {

    loadYoutubeVideoLocally(
      pendingVideoId,
      pendingVideoTime || 0
    );

  }

}


// =====================================================
// YOUTUBE PLAYER STATE CHANGE
// =====================================================

function onYoutubeStateChange(
  event
) {

  if (
    suppressYoutubeEvents
  ) {

    return;

  }

  if (
    !youtubePlayer ||
    typeof youtubePlayer.getCurrentTime !==
      'function'
  ) {

    return;

  }

  const time =
    youtubePlayer.getCurrentTime() || 0;

  lastKnownYoutubeTime =
    time;


  // PLAYING
  if (
    event.data ===
    YT.PlayerState.PLAYING
  ) {

    socket.emit(
      'youtubePlay',
      {

        time:
          time

      }
    );

    updateYoutubeStatus(
      '▶ Playing for everyone'
    );

  }


  // PAUSED
  else if (
    event.data ===
    YT.PlayerState.PAUSED
  ) {

    socket.emit(
      'youtubePause',
      {

        time:
          time

      }
    );

    updateYoutubeStatus(
      '⏸ Paused for everyone'
    );

  }

}


// =====================================================
// YOUTUBE SEARCH
// =====================================================

async function searchYoutube(
  query
) {

  if (
    !youtubeResults
  ) {

    return;

  }

  const cleanQuery =
    String(
      query || ''
    )
      .trim()
      .slice(0, 100);

  if (
    !cleanQuery
  ) {

    youtubeResults.innerHTML =
      '<div class="youtube-loading">Type a song or video name 🎵</div>';

    return;

  }

  youtubeResults.innerHTML =
    '<div class="youtube-loading">Searching YouTube... 🔎</div>';

  try {

    const response =
      await fetch(
        '/api/youtube/search?q=' +
        encodeURIComponent(
          cleanQuery
        )
      );

    let data = {};

    try {

      data =
        await response.json();

    } catch {

      data = {};

    }

    if (
      !response.ok
    ) {

      throw new Error(
        data.error ||
        'YouTube search failed'
      );

    }

    youtubeResults.innerHTML =
      '';

    if (
      !data.videos ||
      data.videos.length === 0
    ) {

      youtubeResults.innerHTML =
        '<div class="youtube-loading">No videos found 😢</div>';

      return;

    }

    data.videos.forEach(
      video => {

        const item =
          document.createElement(
            'button'
          );

        item.type =
          'button';

        item.className =
          'youtube-result';

        const thumbnail =
          document.createElement(
            'img'
          );

        thumbnail.src =
          video.thumbnail;

        thumbnail.alt =
          video.title;

        thumbnail.loading =
          'lazy';

        const info =
          document.createElement(
            'div'
          );

        info.className =
          'youtube-result-info';

        const title =
          document.createElement(
            'div'
          );

        title.className =
          'youtube-result-title';

        title.textContent =
          video.title;

        const channel =
          document.createElement(
            'div'
          );

        channel.className =
          'youtube-result-channel';

        channel.textContent =
          video.channel || 'YouTube';

        info.appendChild(
          title
        );

        info.appendChild(
          channel
        );

        item.appendChild(
          thumbnail
        );

        item.appendChild(
          info
        );

        item.addEventListener(
          'click',
          () => {

            selectYoutubeVideo(
              video
            );

          }
        );

        youtubeResults.appendChild(
          item
        );

      }
    );

  } catch (error) {

    console.error(
      'YouTube search error:',
      error
    );

    youtubeResults.innerHTML =
      '<div class="youtube-loading">YouTube search failed ❌</div>';

  }

}


// =====================================================
// SELECT YOUTUBE VIDEO
// =====================================================

function selectYoutubeVideo(
  video
) {

  if (
    !video ||
    !video.id
  ) {

    return;

  }

  const videoId =
    video.id;

  currentYoutubeVideoId =
    videoId;

  pendingVideoId =
    videoId;

  pendingVideoTime =
    0;


  if (
    youtubePlayerPanel
  ) {

    youtubePlayerPanel.classList.add(
      'open'
    );

  }


  if (
    youtubePlayerTitle
  ) {

    youtubePlayerTitle.textContent =
      video.title ||
      'YouTube Music';

  }


  updateYoutubeStatus(
    'Loading...'
  );


  // Send to everyone
  socket.emit(
    'youtubeLoad',
    {

      videoId:
        videoId,

      title:
        video.title ||
        ''

    }
  );


  // Load locally immediately
  if (
    youtubeReady
  ) {

    loadYoutubeVideoLocally(
      videoId,
      0
    );

  }

}


// =====================================================
// LOAD VIDEO LOCALLY
// =====================================================

function loadYoutubeVideoLocally(
  videoId,
  time = 0
) {

  if (
    !youtubePlayer ||
    !youtubeReady
  ) {

    pendingVideoId =
      videoId;

    pendingVideoTime =
      time;

    return;

  }

  suppressYoutubeEvents =
    true;

  try {

    youtubePlayer.loadVideoById({
      videoId:
        videoId,

      startSeconds:
        Number(time) || 0
    });

  } catch (error) {

    console.error(
      'YouTube load error:',
      error
    );

  }

  setTimeout(
    () => {

      suppressYoutubeEvents =
        false;

    },
    800
  );

}


// =====================================================
// PLAY REMOTE
// =====================================================

function playYoutubeRemote(
  videoId,
  time
) {

  if (
    !youtubePlayer ||
    !youtubeReady
  ) {

    pendingVideoId =
      videoId;

    pendingVideoTime =
      time || 0;

    return;

  }

  suppressYoutubeEvents =
    true;

  try {

    if (
      currentYoutubeVideoId !==
      videoId
    ) {

      currentYoutubeVideoId =
        videoId;

      youtubePlayer.loadVideoById({
        videoId:
          videoId,

        startSeconds:
          Number(time) || 0
      });

    } else {

      youtubePlayer.seekTo(
        Number(time) || 0,
        true
      );

      youtubePlayer.playVideo();

    }

  } catch (error) {

    console.error(
      error
    );

  }

  setTimeout(
    () => {

      suppressYoutubeEvents =
        false;

    },
    1000
  );

}


// =====================================================
// PAUSE REMOTE
// =====================================================

function pauseYoutubeRemote(
  time
) {

  if (
    !youtubePlayer ||
    !youtubeReady
  ) {

    return;

  }

  suppressYoutubeEvents =
    true;

  try {

    youtubePlayer.seekTo(
      Number(time) || 0,
      true
    );

    youtubePlayer.pauseVideo();

  } catch (error) {

    console.error(
      error
    );

  }

  setTimeout(
    () => {

      suppressYoutubeEvents =
        false;

    },
    500
  );

}


// =====================================================
// SEEK REMOTE
// =====================================================

function seekYoutubeRemote(
  time
) {

  if (
    !youtubePlayer ||
    !youtubeReady
  ) {

    return;

  }

  suppressYoutubeEvents =
    true;

  try {

    youtubePlayer.seekTo(
      Number(time) || 0,
      true
    );

  } catch (error) {

    console.error(
      error
    );

  }

  setTimeout(
    () => {

      suppressYoutubeEvents =
        false;

    },
    300
  );

}


// =====================================================
// YOUTUBE SOCKET - LOAD
// =====================================================

socket.on(
  'youtubeLoad',
  data => {

    if (
      !data ||
      !data.videoId
    ) {

      return;

    }

    currentYoutubeVideoId =
      data.videoId;

    pendingVideoId =
      data.videoId;

    pendingVideoTime =
      0;

    if (
      youtubePlayerPanel
    ) {

      youtubePlayerPanel.classList.add(
        'open'
      );

    }

    if (
      youtubePlayerTitle
    ) {

      youtubePlayerTitle.textContent =
        data.title ||
        'YouTube Music';

    }

    updateYoutubeStatus(
      'New song selected 🎵'
    );

    loadYoutubeVideoLocally(
      data.videoId,
      data.time || 0
    );

  }
);


// =====================================================
// YOUTUBE SOCKET - PLAY
// =====================================================

socket.on(
  'youtubePlay',
  data => {

    if (
      !data ||
      !data.videoId
    ) {

      return;

    }

    currentYoutubeVideoId =
      data.videoId;

    playYoutubeRemote(
      data.videoId,
      data.time || 0
    );

    updateYoutubeStatus(
      '▶ Playing for everyone'
    );

  }
);


// =====================================================
// YOUTUBE SOCKET - PAUSE
// =====================================================

socket.on(
  'youtubePause',
  data => {

    if (
      !data
    ) {

      return;

    }

    pauseYoutubeRemote(
      data.time || 0
    );

    updateYoutubeStatus(
      '⏸ Paused for everyone'
    );

  }
);


// =====================================================
// YOUTUBE SOCKET - SEEK
// =====================================================

socket.on(
  'youtubeSeek',
  data => {

    if (
      !data
    ) {

      return;

    }

    seekYoutubeRemote(
      data.time || 0
    );

  }
);


// =====================================================
// YOUTUBE SOCKET - STOP
// =====================================================

socket.on(
  'youtubeStop',
  () => {

    if (
      youtubePlayer &&
      youtubeReady
    ) {

      suppressYoutubeEvents =
        true;

      try {

        youtubePlayer.stopVideo();

      } catch {}

      setTimeout(
        () => {

          suppressYoutubeEvents =
            false;

        },
        400
      );

    }

    currentYoutubeVideoId =
      null;

    if (
      youtubePlayerPanel
    ) {

      youtubePlayerPanel.classList.remove(
        'open'
      );

    }

  }
);


// =====================================================
// YOUTUBE CURRENT STATE
// =====================================================

socket.on(
  'youtubeState',
  data => {

    if (
      !data ||
      !data.videoId
    ) {

      return;

    }

    currentYoutubeVideoId =
      data.videoId;

    pendingVideoId =
      data.videoId;

    pendingVideoTime =
      Number(
        data.time
      ) || 0;

    if (
      youtubePlayerPanel
    ) {

      youtubePlayerPanel.classList.add(
        'open'
      );

    }

    if (
      youtubePlayerTitle
    ) {

      youtubePlayerTitle.textContent =
        data.title ||
        'YouTube Music';

    }

    if (
      data.state ===
      'playing'
    ) {

      playYoutubeRemote(
        data.videoId,
        data.time || 0
      );

      updateYoutubeStatus(
        '▶ Music is playing'
      );

    } else {

      loadYoutubeVideoLocally(
        data.videoId,
        data.time || 0
      );

      updateYoutubeStatus(
        '⏸ Music is paused'
      );

    }

  }
);


// =====================================================
// YOUTUBE SEARCH BUTTON
// =====================================================

if (
  youtubeSearchBtn
) {

  youtubeSearchBtn.addEventListener(
    'click',
    () => {

      searchYoutube(
        youtubeSearch?.value
      );

    }
  );

}


// =====================================================
// YOUTUBE SEARCH ENTER
// =====================================================

if (
  youtubeSearch
) {

  youtubeSearch.addEventListener(
    'keydown',
    e => {

      if (
        e.key ===
        'Enter'
      ) {

        e.preventDefault();

        searchYoutube(
          youtubeSearch.value
        );

      }

    }
  );

}


// =====================================================
// CLOSE YOUTUBE
// =====================================================

if (
  youtubeCloseBtn
) {

  youtubeCloseBtn.addEventListener(
    'click',
    () => {

      socket.emit(
        'youtubeStop'
      );

    }
  );

}


// =====================================================
// YOUTUBE SEEK DETECTION
// =====================================================

// Polling is used to detect manual seeking.
// It only emits when there is a significant jump.

let previousYoutubeTime =
  0;

setInterval(
  () => {

    if (
      !youtubePlayer ||
      !youtubeReady ||
      suppressYoutubeEvents
    ) {

      return;

    }

    try {

      const state =
        youtubePlayer.getPlayerState();

      if (
        state !==
        YT.PlayerState.PLAYING &&
        state !==
        YT.PlayerState.PAUSED
      ) {

        return;

      }

      const currentTime =
        youtubePlayer.getCurrentTime() || 0;

      const difference =
        Math.abs(
          currentTime -
          previousYoutubeTime
        );

      // Detect manual seek
      if (
        difference > 2.5
      ) {

        socket.emit(
          'youtubeSeek',
          {

            time:
              currentTime

          }
        );

      }

      previousYoutubeTime =
        currentTime;

      lastKnownYoutubeTime =
        currentTime;

    } catch {}

  },
  1000
);


// =====================================================
// UPDATE YOUTUBE STATUS
// =====================================================

function updateYoutubeStatus(
  text
) {

  if (
    youtubeStatus
  ) {

    youtubeStatus.textContent =
      text;

  }

}


// =====================================================
// USER STATS
// =====================================================

socket.on(
  'userStats',
  stats => {

    if (
      liveUsersEl
    ) {

      liveUsersEl.textContent =
        stats.live ?? 0;

    }

    if (
      totalUsersEl
    ) {

      totalUsersEl.textContent =
        stats.total ?? 0;

    }

  }
);


// =====================================================
// HELLO
// =====================================================

socket.emit(
  'hello',
  {

    name:
      nameInput.value.trim() ||
      null

  }
);


// =====================================================
// NOTIFICATION SOUND
// =====================================================

let audioContext =
  null;


function playNotificationSound() {

  try {

    if (
      !audioContext
    ) {

      audioContext =
        new (
          window.AudioContext ||
          window.webkitAudioContext
        )();

    }

    if (
      audioContext.state ===
      'suspended'
    ) {

      audioContext.resume();

    }

    const oscillator =
      audioContext.createOscillator();

    const gain =
      audioContext.createGain();

    oscillator.type =
      'sine';

    oscillator.frequency.setValueAtTime(
      880,
      audioContext.currentTime
    );

    oscillator.frequency.exponentialRampToValueAtTime(
      660,
      audioContext.currentTime +
      0.12
    );

    gain.gain.setValueAtTime(
      0.0001,
      audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.12,
      audioContext.currentTime +
      0.01
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime +
      0.16
    );

    oscillator.connect(
      gain
    );

    gain.connect(
      audioContext.destination
    );

    oscillator.start();

    oscillator.stop(
      audioContext.currentTime +
      0.17
    );

  } catch {}

}


// =====================================================
// UNLOCK AUDIO
// =====================================================

document.addEventListener(
  'click',
  () => {

    try {

      if (
        !audioContext
      ) {

        audioContext =
          new (
            window.AudioContext ||
            window.webkitAudioContext
          )();

      }

      if (
        audioContext.state ===
        'suspended'
      ) {

        audioContext.resume();

      }

    } catch {}

  },
  {
    once:
      true
  }
);


// =====================================================
// NOTIFICATIONS
// =====================================================

async function requestNotifications() {

  if (
    !('Notification' in window)
  ) {

    return;

  }

  if (
    Notification.permission ===
    'default'
  ) {

    try {

      await Notification.requestPermission();

    } catch {}

  }

}

requestNotifications();


function showNotification(
  title,
  body
) {

  if (
    !('Notification' in window)
  ) {

    return;

  }

  if (
    Notification.permission !==
    'granted'
  ) {

    return;

  }

  if (
    document.visibilityState ===
    'visible'
  ) {

    return;

  }

  try {

    new Notification(
      title,
      {
        body,
        icon:
          '/favicon.ico'
      }
    );

  } catch {}

}


// =====================================================
// CHAT RECEIVE
// =====================================================

socket.on(
  'chat',
  data => {

    addMessage(
      data.name,
      data.text,
      data.at
    );

    playNotificationSound();

    showNotification(
      '💬 Anon Fun Chat',
      `${data.name || 'Anon'}: ${data.text}`
    );

  }
);


// =====================================================
// SYSTEM
// =====================================================

socket.on(
  'system',
  evt => {

    if (
      evt.type ===
      'join'
    ) {

      addSystem(
        `Someone joined${
          evt.name
            ? ' as ' +
              safe(evt.name)
            : ''
        } ✨`
      );

    } else if (
      evt.type ===
      'leave'
    ) {

      addSystem(
        'Someone left 👋'
      );

    }

  }
);


// =====================================================
// FILE SHARED
// =====================================================

socket.on(
  'fileShared',
  f => {

    addFileMessage(
      f,
      f.at
    );

    playNotificationSound();

    showNotification(
      '📎 New file',
      `${f.name || 'Anon'} shared ${f.filename}`
    );

  }
);


// =====================================================
// GIF SHARED
// =====================================================

socket.on(
  'gifShared',
  gif => {

    addGifMessage(
      gif,
      gif.at
    );

    playNotificationSound();

    showNotification(
      '😂 New GIF',
      `${gif.name || 'Anon'} sent a GIF`
    );

  }
);


// =====================================================
// SEND MESSAGE
// =====================================================

const controls =
  document.getElementById(
    'controls'
  );


if (
  controls
) {

  controls.addEventListener(
    'submit',
    e => {

      e.preventDefault();

      const text =
        msgInput.value.trim();

      if (
        !text &&
        fileInput.files.length ===
          0
      ) {

        return;

      }

      const name =
        nameInput.value.trim() ||
        null;

      if (
        text
      ) {

        socket.emit(
          'chat',
          {
            text,
            name
          }
        );

        msgInput.value =
          '';

        msgInput.style.height =
          'auto';

      }

      if (
        fileInput.files.length >
        0
      ) {

        const files =
          Array.from(
            fileInput.files
          );

        uploadFiles(
          files,
          name
        );

        fileInput.value =
          '';

        fileQueue.innerHTML =
          '';

      }

    }
  );

}


// =====================================================
// AUTO GROW
// =====================================================

msgInput.addEventListener(
  'input',
  () => {

    msgInput.style.height =
      'auto';

    msgInput.style.height =
      Math.min(
        msgInput.scrollHeight,
        160
      ) + 'px';

  }
);


// =====================================================
// ENTER SEND
// =====================================================

msgInput.addEventListener(
  'keydown',
  e => {

    if (
      e.key ===
        'Enter' &&
      !e.shiftKey
    ) {

      e.preventDefault();

      sendBtn.click();

    }

  }
);


// =====================================================
// FILE PREVIEW
// =====================================================

fileInput.addEventListener(
  'change',
  () => {

    fileQueue.innerHTML =
      '';

    const files =
      Array.from(
        fileInput.files
      );

    for (
      const f of files
    ) {

      const chip =
        document.createElement(
          'span'
        );

      chip.className =
        'file-chip';

      chip.textContent =
        `${f.name} (${fmtSize(f.size)})`;

      const x =
        document.createElement(
          'span'
        );

      x.textContent =
        '✕';

      x.className =
        'x';

      x.onclick =
        () => {

          const remain =
            Array.from(
              fileInput.files
            )
              .filter(
                ff =>
                  ff !== f
              );

          const dt =
            new DataTransfer();

          remain.forEach(
            ff =>
              dt.items.add(ff)
          );

          fileInput.files =
            dt.files;

          chip.remove();

        };

      chip.appendChild(
        x
      );

      fileQueue.appendChild(
        chip
      );

    }

  }
);


// =====================================================
// UPLOAD FILES
// =====================================================

async function uploadFiles(
  files,
  name
) {

  for (
    const file of files
  ) {

    try {

      const form =
        new FormData();

      form.append(
        'file',
        file,
        file.name
      );

      form.append(
        'filename',
        file.name
      );

      const res =
        await fetch(
          '/upload',
          {
            method:
              'POST',
            body:
              form
          }
        );

      if (
        !res.ok
      ) {

        addSystem(
          `Upload failed for ${file.name} ❌`
        );

        continue;

      }

      const info =
        await res.json();

      socket.emit(
        'fileShared',
        {

          link:
            info.link,

          filename:
            info.filename,

          size:
            info.size,

          mime:
            info.mime,

          ttlMinutes:
            info.ttlMinutes,

          name:
            name || null

        }
      );

    } catch (error) {

      console.error(
        error
      );

      addSystem(
        `Upload failed for ${file.name} ❌`
      );

    }

  }

}


// =====================================================
// IMAGE CHECK
// =====================================================

function isImage(
  mime
) {

  return (
    typeof mime ===
      'string' &&
    mime.startsWith(
      'image/'
    )
  );

}


// =====================================================
// EMOJI
// =====================================================

const EMOJIS = [

  '😀','😁','😂','🤣','😊','🥰','😘',
  '😎','🤓','🤩','😇','😉','🙂','🤗',
  '🤭','🤫','🤔','🙃','😴','🤤','😜',
  '🤪','😝','😏','😬','😐','😑','😶',
  '🙄','😳','🥺','😤','😡','🤬','😱',
  '😭','🥲','🤝','🙏','👏','🙌','👍',
  '👎','🤙','👌','🤌','👀','💪','🫶',
  '❤️','🩷','💖','✨','🔥','🎉','🎊',
  '🫡','🍿','🍕','🍪','🧋','☕','🌶️',
  '🧠','🦾','🧡','💙','💜','🤍','🤎'

];


function buildEmojiPicker() {

  if (
    !emojiPicker
  ) {

    return;

  }

  emojiPicker.innerHTML =
    '';

  EMOJIS.forEach(
    emoji => {

      const button =
        document.createElement(
          'button'
        );

      button.type =
        'button';

      button.textContent =
        emoji;

      button.addEventListener(
        'click',
        () => {

          const start =
            msgInput.selectionStart ??
            msgInput.value.length;

          const end =
            msgInput.selectionEnd ??
            msgInput.value.length;

          msgInput.value =
            msgInput.value.slice(
              0,
              start
            ) +
            emoji +
            msgInput.value.slice(
              end
            );

          msgInput.focus();

          emojiPicker.classList.remove(
            'open'
          );

        }
      );

      emojiPicker.appendChild(
        button
      );

    }
  );

}


buildEmojiPicker();


if (
  emojiBtn
) {

  emojiBtn.addEventListener(
    'click',
    () => {

      emojiPicker.classList.toggle(
        'open'
      );

      if (
        gifPicker
      ) {

        gifPicker.classList.remove(
          'open'
        );

      }

    }
  );

}


// =====================================================
// GIF BUTTON
// =====================================================

if (
  gifBtn &&
  gifPicker
) {

  gifBtn.addEventListener(
    'click',
    () => {

      gifPicker.classList.toggle(
        'open'
      );

      if (
        gifPicker.classList.contains(
          'open'
        )
      ) {

        if (
          emojiPicker
        ) {

          emojiPicker.classList.remove(
            'open'
          );

        }

        if (
          gifSearch
        ) {

          gifSearch.focus();

        }

        if (
          gifResults &&
          gifResults.children.length ===
            0
        ) {

          searchGifs(
            'funny'
          );

        }

      }

    }
  );

}


// =====================================================
// GIF SEARCH
// =====================================================

if (
  gifSearchBtn
) {

  gifSearchBtn.addEventListener(
    'click',
    () => {

      searchGifs(
        gifSearch.value.trim() ||
        'funny'
      );

    }
  );

}


if (
  gifSearch
) {

  gifSearch.addEventListener(
    'keydown',
    e => {

      if (
        e.key ===
        'Enter'
      ) {

        e.preventDefault();

        searchGifs(
          gifSearch.value.trim() ||
          'funny'
        );

      }

    }
  );

}


// =====================================================
// SEARCH GIFS
// =====================================================

async function searchGifs(
  query = 'funny'
) {

  if (
    !gifResults
  ) {

    return;

  }

  const cleanQuery =
    String(
      query ||
      'funny'
    )
      .trim()
      .slice(0, 100);

  gifResults.innerHTML =
    '<div class="gif-loading">Searching GIFs... 🎬</div>';

  try {

    const res =
      await fetch(
        `/api/gifs/search?q=${encodeURIComponent(
          cleanQuery || 'funny'
        )}`
      );

    const data =
      await res.json();

    if (
      !res.ok
    ) {

      throw new Error(
        data.error ||
        'GIF search failed'
      );

    }

    gifResults.innerHTML =
      '';

    if (
      !data.gifs ||
      data.gifs.length ===
        0
    ) {

      gifResults.innerHTML =
        '<div class="gif-loading">No GIFs found 😢</div>';

      return;

    }

    data.gifs.forEach(
      gif => {

        const img =
          document.createElement(
            'img'
          );

        img.src =
          gif.preview ||
          gif.url;

        img.alt =
          gif.title ||
          'GIF';

        img.className =
          'gif-item';

        img.loading =
          'lazy';

        img.addEventListener(
          'click',
          () => {

            sendGif(
              gif
            );

            gifPicker.classList.remove(
              'open'
            );

          }
        );

        gifResults.appendChild(
          img
        );

      }
    );

  } catch (error) {

    console.error(
      error
    );

    gifResults.innerHTML =
      '<div class="gif-loading">GIFs could not be loaded ❌</div>';

  }

}


// =====================================================
// SEND GIF
// =====================================================

function sendGif(
  gif
) {

  if (
    !gif ||
    !gif.url
  ) {

    return;

  }

  socket.emit(
    'gifShared',
    {

      url:
        gif.url,

      preview:
        gif.preview ||
        gif.url,

      title:
        gif.title ||
        'GIF',

      name:
        nameInput.value.trim() ||
        null

    }
  );

}


// =====================================================
// ADD TEXT MESSAGE
// =====================================================

function addMessage(
  name,
  text,
  at
) {

  const el =
    document.createElement(
      'div'
    );

  el.className =
    'msg';

  const head =
    document.createElement(
      'div'
    );

  head.className =
    'head';

  const nameEl =
    document.createElement(
      'span'
    );

  nameEl.className =
    'name';

  nameEl.innerHTML =
    name
      ? safe(name)
      : 'Anon';

  const timeEl =
    document.createElement(
      'span'
    );

  timeEl.className =
    'time';

  timeEl.textContent =
    ' · ' +
    new Date(
      at
    ).toLocaleTimeString();

  const body =
    document.createElement(
      'div'
    );

  body.className =
    'body';

  body.innerHTML =
    linkify(
      safe(text)
    );

  head.appendChild(
    nameEl
  );

  head.appendChild(
    timeEl
  );

  el.appendChild(
    head
  );

  el.appendChild(
    body
  );

  chatArea.appendChild(
    el
  );

  scrollToBottom();

}


// =====================================================
// ADD FILE MESSAGE
// =====================================================

function addFileMessage(
  f,
  at
) {

  const el =
    document.createElement(
      'div'
    );

  el.className =
    'msg';

  const head =
    document.createElement(
      'div'
    );

  head.className =
    'head';

  const who =
    document.createElement(
      'span'
    );

  who.className =
    'name';

  who.innerHTML =
    f.name
      ? safe(f.name)
      : 'Anon';

  const timeEl =
    document.createElement(
      'span'
    );

  timeEl.className =
    'time';

  timeEl.textContent =
    ' · ' +
    new Date(
      at
    ).toLocaleTimeString();

  head.appendChild(
    who
  );

  head.appendChild(
    timeEl
  );

  const body =
    document.createElement(
      'div'
    );

  body.className =
    'body';

  if (
    isImage(f.mime)
  ) {

    const image =
      document.createElement(
        'img'
      );

    image.src =
      f.link;

    image.alt =
      f.filename;

    image.className =
      'chat-image';

    image.loading =
      'lazy';

    body.appendChild(
      image
    );

    const info =
      document.createElement(
        'div'
      );

    info.className =
      'file-info';

    const strong =
      document.createElement(
        'strong'
      );

    strong.textContent =
      f.filename;

    info.appendChild(
      strong
    );

    info.appendChild(
      document.createTextNode(
        ` · ${fmtSize(f.size)} · `
      )
    );

    const download =
      document.createElement(
        'a'
      );

    download.href =
      f.link;

    download.download =
      f.filename;

    download.textContent =
      'Download';

    info.appendChild(
      download
    );

    body.appendChild(
      info
    );

  } else if (
    f.mime &&
    f.mime.startsWith(
      'audio/'
    )
  ) {

    const audio =
      document.createElement(
        'audio'
      );

    audio.controls =
      true;

    audio.preload =
      'metadata';

    audio.src =
      f.link;

    audio.className =
      'chat-audio';

    body.appendChild(
      audio
    );

    const info =
      document.createElement(
        'div'
      );

    info.className =
      'file-info';

    info.appendChild(
      document.createTextNode(
        `🎤 ${f.filename} · `
      )
    );

    const download =
      document.createElement(
        'a'
      );

    download.href =
      f.link;

    download.download =
      f.filename;

    download.textContent =
      'Download';

    info.appendChild(
      download
    );

    body.appendChild(
      info
    );

  } else {

    body.appendChild(
      document.createTextNode(
        '📎 '
      )
    );

    const strong =
      document.createElement(
        'strong'
      );

    strong.textContent =
      f.filename;

    body.appendChild(
      strong
    );

    body.appendChild(
      document.createTextNode(
        ` — ${fmtSize(f.size)} · `
      )
    );

    const download =
      document.createElement(
        'a'
      );

    download.href =
      f.link;

    download.download =
      f.filename;

    download.textContent =
      'Download';

    body.appendChild(
      download
    );

  }

  const expiry =
    document.createElement(
      'div'
    );

  expiry.className =
    'expiry';

  expiry.textContent =
    `Expires in ${f.ttlMinutes || 10}m`;

  body.appendChild(
    expiry
  );

  el.appendChild(
    head
  );

  el.appendChild(
    body
  );

  chatArea.appendChild(
    el
  );

  scrollToBottom();

}


// =====================================================
// ADD GIF MESSAGE
// =====================================================

function addGifMessage(
  gif,
  at
) {

  const el =
    document.createElement(
      'div'
    );

  el.className =
    'msg gif-message';

  const head =
    document.createElement(
      'div'
    );

  head.className =
    'head';

  const who =
    document.createElement(
      'span'
    );

  who.className =
    'name';

  who.textContent =
    gif.name ||
    'Anon';

  const time =
    document.createElement(
      'span'
    );

  time.className =
    'time';

  time.textContent =
    ' · ' +
    new Date(
      at
    ).toLocaleTimeString();

  head.appendChild(
    who
  );

  head.appendChild(
    time
  );

  const body =
    document.createElement(
      'div'
    );

  body.className =
    'body';

  const image =
    document.createElement(
      'img'
    );

  image.src =
    gif.url;

  image.alt =
    gif.title ||
    'GIF';

  image.className =
    'chat-gif';

  image.loading =
    'lazy';

  image.addEventListener(
    'error',
    () => {

      if (
        gif.preview &&
        image.src !==
          gif.preview
      ) {

        image.src =
          gif.preview;

      }

    }
  );

  body.appendChild(
    image
  );

  el.appendChild(
    head
  );

  el.appendChild(
    body
  );

  chatArea.appendChild(
    el
  );

  scrollToBottom();

}


// =====================================================
// SYSTEM MESSAGE
// =====================================================

function addSystem(
  text
) {

  const el =
    document.createElement(
      'div'
    );

  el.className =
    'system';

  el.textContent =
    text;

  chatArea.appendChild(
    el
  );

  scrollToBottom();

}


// =====================================================
// VOICE RECORDING
// =====================================================

let mediaRecorder =
  null;

let audioChunks =
  [];

let recording =
  false;


if (
  voiceBtn
) {

  voiceBtn.addEventListener(
    'click',
    async () => {

      if (
        !recording
      ) {

        await startRecording();

      } else {

        stopRecording();

      }

    }
  );

}


async function startRecording() {

  try {

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {

      addSystem(
        'Voice recording is not supported ❌'
      );

      return;

    }

    const stream =
      await navigator.mediaDevices
        .getUserMedia({
          audio:
            true
        });

    audioChunks =
      [];

    let mimeType =
      '';

    if (
      MediaRecorder.isTypeSupported(
        'audio/webm;codecs=opus'
      )
    ) {

      mimeType =
        'audio/webm;codecs=opus';

    } else if (
      MediaRecorder.isTypeSupported(
        'audio/webm'
      )
    ) {

      mimeType =
        'audio/webm';

    }

    mediaRecorder =
      mimeType
        ? new MediaRecorder(
            stream,
            {
              mimeType
            }
          )
        : new MediaRecorder(
            stream
          );

    mediaRecorder.addEventListener(
      'dataavailable',
      e => {

        if (
          e.data &&
          e.data.size >
            0
        ) {

          audioChunks.push(
            e.data
          );

        }

      }
    );

    mediaRecorder.addEventListener(
      'stop',
      async () => {

        stream
          .getTracks()
          .forEach(
            track =>
              track.stop()
          );

        const blob =
          new Blob(
            audioChunks,
            {
              type:
                mediaRecorder.mimeType ||
                'audio/webm'
            }
          );

        await uploadVoice(
          blob
        );

      }
    );

    mediaRecorder.start();

    recording =
      true;

    voiceBtn.textContent =
      '⏹️';

    voiceBtn.classList.add(
      'recording'
    );

    addSystem(
      '🎤 Recording... click 🎤 again to send'
    );

  } catch (error) {

    console.error(
      error
    );

    recording =
      false;

    addSystem(
      'Microphone permission denied ❌'
    );

  }

}


function stopRecording() {

  if (
    mediaRecorder &&
    mediaRecorder.state !==
      'inactive'
  ) {

    mediaRecorder.stop();

  }

  recording =
    false;

  voiceBtn.textContent =
    '🎤';

  voiceBtn.classList.remove(
    'recording'
  );

}


async function uploadVoice(
  blob
) {

  try {

    const name =
      nameInput.value.trim() ||
      null;

    const filename =
      `voice-${Date.now()}.webm`;

    const form =
      new FormData();

    form.append(
      'file',
      blob,
      filename
    );

    form.append(
      'filename',
      filename
    );

    const response =
      await fetch(
        '/upload',
        {

          method:
            'POST',

          body:
            form

        }
      );

    if (
      !response.ok
    ) {

      throw new Error(
        'Voice upload failed'
      );

    }

    const info =
      await response.json();

    socket.emit(
      'fileShared',
      {

        link:
          info.link,

        filename:
          info.filename,

        size:
          info.size,

        mime:
          info.mime,

        ttlMinutes:
          info.ttlMinutes,

        name

      }
    );

  } catch (error) {

    console.error(
      error
    );

    addSystem(
      'Voice message failed ❌'
    );

  }

}


// =====================================================
// CLOSE PICKERS
// =====================================================

document.addEventListener(
  'click',
  e => {

    if (
      emojiPicker &&
      emojiBtn &&
      !emojiPicker.contains(
        e.target
      ) &&
      !emojiBtn.contains(
        e.target
      )
    ) {

      emojiPicker.classList.remove(
        'open'
      );

    }

    if (
      gifPicker &&
      gifBtn &&
      !gifPicker.contains(
        e.target
      ) &&
      !gifBtn.contains(
        e.target
      )
    ) {

      gifPicker.classList.remove(
        'open'
      );

    }

  }
);


// =====================================================
// HELPERS
// =====================================================

function scrollToBottom() {

  chatArea.scrollTop =
    chatArea.scrollHeight;

}


function safe(
  s
) {

  return String(
    s ?? ''
  )
    .replace(
      /[&<>"]/g,
      c => ({

        '&':
          '&amp;',

        '<':
          '&lt;',

        '>':
          '&gt;',

        '"':
          '&quot;'

      }[c])
    );

}


function linkify(
  text
) {

  return text.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

}


function fmtSize(
  n
) {

  const units =
    [
      'B',
      'KB',
      'MB',
      'GB'
    ];

  let i =
    0;

  let v =
    Number(n) || 0;

  while (
    v >= 1024 &&
    i <
      units.length - 1
  ) {

    v /=
      1024;

    i++;

  }

  return (
    v.toFixed(
      i === 0
        ? 0
        : 1
    ) +
    ' ' +
    units[i]
  );

}


// =====================================================
// READY
// =====================================================

console.log(
  'Anon Fun Chat client loaded successfully.'
);
