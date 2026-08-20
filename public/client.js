// =====================================================
// ANON FUN CHAT - CLIENT.JS
// =====================================================


// =====================================================
// SOCKET
// =====================================================

const socket = io();


// =====================================================
// DOM ELEMENTS
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

const gifBtn =
  document.getElementById('gifBtn');

const gifPicker =
  document.getElementById('gifPicker');

const gifSearch =
  document.getElementById('gifSearch');

const gifResults =
  document.getElementById('gifResults');

const voiceBtn =
  document.getElementById('voiceBtn');

const liveUsersEl =
  document.getElementById('liveUsers');

const totalUsersEl =
  document.getElementById('totalUsers');


// =====================================================
// ANONYMOUS HANDLE
// =====================================================

const anonTag =
  'Anon#' +
  Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();

nameInput.placeholder =
  `Name (optional, e.g., ${anonTag})`;


// =====================================================
// USER STATS
// =====================================================

socket.on('userStats', (stats) => {

  if (liveUsersEl) {
    liveUsersEl.textContent =
      Number(stats.live || 0);
  }

  if (totalUsersEl) {
    totalUsersEl.textContent =
      Number(stats.total || 0);
  }

});


// =====================================================
// NOTIFICATION SOUND
// =====================================================

let audioContext = null;

function playNotificationSound() {

  try {

    if (!audioContext) {

      audioContext =
        new (
          window.AudioContext ||
          window.webkitAudioContext
        )();

    }

    if (
      audioContext.state === 'suspended'
    ) {

      audioContext.resume();

    }


    const oscillator =
      audioContext.createOscillator();

    const gain =
      audioContext.createGain();


    oscillator.type = 'sine';


    oscillator.frequency.setValueAtTime(
      880,
      audioContext.currentTime
    );


    oscillator.frequency.exponentialRampToValueAtTime(
      660,
      audioContext.currentTime + 0.12
    );


    gain.gain.setValueAtTime(
      0.0001,
      audioContext.currentTime
    );


    gain.gain.exponentialRampToValueAtTime(
      0.12,
      audioContext.currentTime + 0.01
    );


    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + 0.2
    );


    oscillator.connect(gain);

    gain.connect(
      audioContext.destination
    );


    oscillator.start();

    oscillator.stop(
      audioContext.currentTime + 0.2
    );

  } catch (error) {

    console.log(
      'Notification sound unavailable'
    );

  }

}


// =====================================================
// BROWSER NOTIFICATION
// =====================================================

async function requestNotificationPermission() {

  if (
    !('Notification' in window)
  ) {
    return;
  }


  if (
    Notification.permission === 'default'
  ) {

    try {

      await Notification.requestPermission();

    } catch (error) {

      console.log(
        'Notification permission unavailable'
      );

    }

  }

}


// Ask permission after user interaction

document.addEventListener(
  'click',
  requestNotificationPermission,
  {
    once: true
  }
);


// =====================================================
// NOTIFY
// =====================================================

function notifyUser(
  title,
  body
) {

  playNotificationSound();


  if (
    document.hidden &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {

    try {

      new Notification(
        title,
        {
          body: body,
          icon: '/icon.png'
        }
      );

    } catch (error) {

      console.log(
        'Browser notification failed'
      );

    }

  }

}


// =====================================================
// HELLO
// =====================================================

socket.emit(
  'hello',
  {
    name:
      nameInput.value || null
  }
);


// =====================================================
// CHAT MESSAGE RECEIVED
// =====================================================

socket.on(
  'chat',
  (data) => {

    addMessage(
      data.name,
      data.text,
      data.at
    );


    const myName =
      nameInput.value.trim() ||
      null;


    // Don't notify yourself
    if (
      data.name !== myName
    ) {

      notifyUser(
        data.name || 'Anon',
        data.text
      );

    }

  }
);


// =====================================================
// SYSTEM EVENTS
// =====================================================

socket.on(
  'system',
  (evt) => {

    if (
      evt.type === 'join'
    ) {

      addSystem(
        `Someone joined${
          evt.name
            ? ' as ' + evt.name
            : ''
        } ✨`
      );

    }


    else if (
      evt.type === 'leave'
    ) {

      addSystem(
        'Someone left 👋'
      );

    }

  }
);


// =====================================================
// FILE RECEIVED
// =====================================================

socket.on(
  'fileShared',
  (file) => {

    addFileMessage(
      file,
      file.at
    );


    const myName =
      nameInput.value.trim() ||
      null;


    if (
      file.name !== myName
    ) {

      notifyUser(
        file.name || 'Anon',
        `📎 ${file.filename}`
      );

    }

  }
);


// =====================================================
// GIF RECEIVED
// =====================================================

socket.on(
  'gifShared',
  (gif) => {

    addGifMessage(
      gif,
      gif.at
    );


    const myName =
      nameInput.value.trim() ||
      null;


    if (
      gif.name !== myName
    ) {

      notifyUser(
        gif.name || 'Anon',
        '😂 Sent a GIF'
      );

    }

  }
);


// =====================================================
// SEND MESSAGE / FILE
// =====================================================

document
  .getElementById('controls')
  .addEventListener(
    'submit',
    (e) => {

      e.preventDefault();


      const text =
        msgInput.value.trim();


      const files =
        Array.from(
          fileInput.files
        );


      if (
        !text &&
        files.length === 0
      ) {

        return;

      }


      const name =
        nameInput.value.trim() ||
        null;


      // Send text

      if (text) {

        socket.emit(
          'chat',
          {
            text,
            name
          }
        );


        msgInput.value = '';

        msgInput.style.height =
          'auto';

      }


      // Upload files

      if (
        files.length > 0
      ) {

        uploadFiles(
          files,
          name
        );


        fileInput.value = '';

        fileQueue.innerHTML =
          '';

      }

    }
  );


// =====================================================
// AUTO GROW MESSAGE BOX
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
// ENTER TO SEND
// =====================================================

msgInput.addEventListener(
  'keydown',
  (e) => {

    if (
      e.key === 'Enter' &&
      !e.shiftKey
    ) {

      e.preventDefault();

      sendBtn.click();

    }

  }
);


// =====================================================
// FILE QUEUE
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


    files.forEach(
      (file) => {

        const chip =
          document.createElement(
            'span'
          );

        chip.className =
          'file-chip';


        chip.textContent =
          `${file.name} (${fmtSize(file.size)})`;


        const x =
          document.createElement(
            'span'
          );

        x.textContent =
          '✕';

        x.className =
          'x';


        x.onclick = () => {

          const remaining =
            Array.from(
              fileInput.files
            ).filter(
              f => f !== file
            );


          const dt =
            new DataTransfer();


          remaining.forEach(
            f => dt.items.add(f)
          );


          fileInput.files =
            dt.files;


          chip.remove();

        };


        chip.appendChild(x);

        fileQueue.appendChild(
          chip
        );

      }
    );

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


      const response =
        await fetch(
          '/upload',
          {
            method: 'POST',
            body: form
          }
        );


      if (
        !response.ok
      ) {

        addSystem(
          `Upload failed for ${file.name} ❌`
        );

        continue;

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
// EMOJIS
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

  emojiPicker.innerHTML =
    '';


  EMOJIS.forEach(
    (emoji) => {

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


// Emoji button

emojiBtn.addEventListener(
  'click',
  () => {

    emojiPicker.classList.toggle(
      'open'
    );


    gifPicker.classList.remove(
      'open'
    );

  }
);


// =====================================================
// GIF
// =====================================================

// IMPORTANT:
// Replace this with your GIPHY API key.

const GIPHY_API_KEY =
  'YOUR_GIPHY_API_KEY';


// Open GIF picker

gifBtn.addEventListener(
  'click',
  () => {

    gifPicker.classList.toggle(
      'open'
    );


    emojiPicker.classList.remove(
      'open'
    );


    if (
      gifPicker.classList.contains(
        'open'
      )
    ) {

      loadGifs(
        'funny'
      );

    }

  }
);


// GIF search

gifSearch.addEventListener(
  'keydown',
  (e) => {

    if (
      e.key === 'Enter'
    ) {

      e.preventDefault();


      const query =
        gifSearch.value.trim() ||
        'funny';


      loadGifs(
        query
      );

    }

  }
);


// Load GIFs

async function loadGifs(
  query
) {

  if (
    !GIPHY_API_KEY ||
    GIPHY_API_KEY ===
      'YOUR_GIPHY_API_KEY'
  ) {

    gifResults.innerHTML =

      '<div class="gif-error">' +
      'Add your GIPHY API key in client.js' +
      '</div>';

    return;

  }


  gifResults.innerHTML =
    '<div class="gif-loading">Loading GIFs...</div>';


  try {

    const url =
      'https://api.giphy.com/v1/gifs/search' +
      `?api_key=${encodeURIComponent(
        GIPHY_API_KEY
      )}` +
      `&q=${encodeURIComponent(
        query
      )}` +
      '&limit=24' +
      '&rating=pg-13';


    const response =
      await fetch(
        url
      );


    if (
      !response.ok
    ) {

      throw new Error(
        'GIPHY request failed'
      );

    }


    const result =
      await response.json();


    gifResults.innerHTML =
      '';


    if (
      !result.data ||
      result.data.length === 0
    ) {

      gifResults.innerHTML =
        '<div class="gif-error">No GIFs found.</div>';

      return;

    }


    result.data.forEach(
      (gif) => {

        const image =
          document.createElement(
            'img'
          );


        image.src =
          gif.images
            .fixed_width_small
            .url;


        image.alt =
          'GIF';


        image.loading =
          'lazy';


        image.addEventListener(
          'click',
          () => {

            sendGif(
              gif.images
                .original
                .url,

              gif.images
                .fixed_width
                .url
            );


            gifPicker.classList.remove(
              'open'
            );

          }
        );


        gifResults.appendChild(
          image
        );

      }
    );


  } catch (error) {

    console.error(
      error
    );


    gifResults.innerHTML =
      '<div class="gif-error">Could not load GIFs.</div>';

  }

}


// Send GIF

function sendGif(
  url,
  preview
) {

  const name =
    nameInput.value.trim() ||
    null;


  socket.emit(
    'gifShared',
    {

      url,

      preview,

      name

    }
  );

}


// =====================================================
// VOICE RECORDER
// =====================================================

let mediaRecorder =
  null;

let audioChunks =
  [];

let recording =
  false;


// Voice button

voiceBtn.addEventListener(
  'click',
  () => {

    if (
      recording
    ) {

      stopRecording();

    } else {

      startRecording();

    }

  }
);


// Start recording

async function startRecording() {

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    addSystem(
      'Your browser does not support voice recording ❌'
    );

    return;

  }


  try {

    const stream =
      await navigator
        .mediaDevices
        .getUserMedia(
          {
            audio: true
          }
        );


    audioChunks =
      [];


    let mimeType =
      'audio/webm';


    if (
      MediaRecorder.isTypeSupported(
        'audio/webm;codecs=opus'
      )
    ) {

      mimeType =
        'audio/webm;codecs=opus';

    }


    mediaRecorder =
      new MediaRecorder(
        stream,
        {
          mimeType
        }
      );


    mediaRecorder.ondataavailable =
      (event) => {

        if (
          event.data &&
          event.data.size > 0
        ) {

          audioChunks.push(
            event.data
          );

        }

      };


    mediaRecorder.onstop =
      async () => {

        const blob =
          new Blob(
            audioChunks,
            {
              type:
                mimeType
            }
          );


        stream
          .getTracks()
          .forEach(
            track =>
              track.stop()
          );


        await uploadVoice(
          blob
        );

      };


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


    addSystem(
      'Microphone permission is required 🎤'
    );

  }

}


// Stop recording

function stopRecording() {

  if (
    mediaRecorder &&
    recording
  ) {

    recording =
      false;


    mediaRecorder.stop();


    voiceBtn.textContent =
      '🎤';


    voiceBtn.classList.remove(
      'recording'
    );

  }

}


// Upload voice

async function uploadVoice(
  blob
) {

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


  try {

    const response =
      await fetch(
        '/upload',
        {
          method: 'POST',
          body: form
        }
      );


    if (
      !response.ok
    ) {

      addSystem(
        'Voice message upload failed ❌'
      );

      return;

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
      'Voice message upload failed ❌'
    );

  }

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


  nameEl.textContent =
    name || 'Anon';


  const timeEl =
    document.createElement(
      'span'
    );


  timeEl.className =
    'time';


  timeEl.textContent =
    ' · ' +
    new Date(at)
      .toLocaleTimeString();


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


  chatArea.scrollTop =
    chatArea.scrollHeight;

}


// =====================================================
// ADD FILE MESSAGE
// =====================================================

function addFileMessage(
  file,
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


  who.textContent =
    file.name || 'Anon';


  const timeEl =
    document.createElement(
      'span'
    );


  timeEl.className =
    'time';


  timeEl.textContent =
    ' · ' +
    new Date(at)
      .toLocaleTimeString();


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


  // IMAGE

  if (
    file.mime &&
    file.mime.startsWith(
      'image/'
    )
  ) {

    const image =
      document.createElement(
        'img'
      );


    image.src =
      file.link;


    image.alt =
      file.filename ||
      'Image';


    image.className =
      'chat-image';


    image.loading =
      'lazy';


    image.addEventListener(
      'click',
      () => {

        window.open(
          file.link,
          '_blank'
        );

      }
    );


    body.appendChild(
      image
    );


    const info =
      document.createElement(
        'div'
      );


    info.className =
      'file-info';


    info.innerHTML =
      `🖼️ <strong>${safe(
        file.filename
      )}</strong> · ${fmtSize(
        file.size
      )} · `;


    const download =
      document.createElement(
        'a'
      );


    download.href =
      file.link;


    download.download =
      file.filename;


    download.textContent =
      'Download';


    info.appendChild(
      download
    );


    body.appendChild(
      info
    );

  }


  // AUDIO / VOICE

  else if (
    file.mime &&
    file.mime.startsWith(
      'audio/'
    )
  ) {

    const audio =
      document.createElement(
        'audio'
      );


    audio.controls =
      true;


    audio.src =
      file.link;


    audio.className =
      'voice-player';


    body.appendChild(
      audio
    );


    const info =
      document.createElement(
        'div'
      );


    info.className =
      'file-info';


    info.textContent =
      `🎤 ${file.filename}`;


    body.appendChild(
      info
    );

  }


  // NORMAL FILE

  else {

    body.innerHTML =
      `📎 <strong>${safe(
        file.filename
      )}</strong> — ${fmtSize(
        file.size
      )} · `;


    const download =
      document.createElement(
        'a'
      );


    download.href =
      file.link;


    download.download =
      file.filename;


    download.textContent =
      'Download';


    body.appendChild(
      download
    );


    const expiry =
      document.createElement(
        'span'
      );


    expiry.className =
      'time';


    expiry.textContent =
      ` (expires in ${
        file.ttlMinutes
      }m)`;


    body.appendChild(
      expiry
    );

  }


  el.appendChild(
    head
  );


  el.appendChild(
    body
  );


  chatArea.appendChild(
    el
  );


  chatArea.scrollTop =
    chatArea.scrollHeight;

}


// =====================================================
// ADD GIF
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


  who.textContent =
    gif.name || 'Anon';


  const timeEl =
    document.createElement(
      'span'
    );


  timeEl.className =
    'time';


  timeEl.textContent =
    ' · ' +
    new Date(at)
      .toLocaleTimeString();


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


  const image =
    document.createElement(
      'img'
    );


  image.src =
    gif.url;


  image.alt =
    'GIF';


  image.className =
    'chat-gif';


  image.loading =
    'lazy';


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


  chatArea.scrollTop =
    chatArea.scrollHeight;

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


  chatArea.scrollTop =
    chatArea.scrollHeight;

}


// =====================================================
// SAFE HTML
// =====================================================

function safe(
  value
) {

  return String(
    value ?? ''
  )
    .replace(
      /[&<>"]/g,
      (char) => {

        return {

          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;'

        }[char];

      }
    );

}


// =====================================================
// LINKIFY
// =====================================================

function linkify(
  text
) {

  return text.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

}


// =====================================================
// FILE SIZE
// =====================================================

function fmtSize(
  bytes
) {

  const units =
    [
      'B',
      'KB',
      'MB',
      'GB'
    ];


  let index =
    0;


  let value =
    Number(bytes) || 0;


  while (
    value >= 1024 &&
    index <
      units.length - 1
  ) {

    value /=
      1024;

    index++;

  }


  return (
    value.toFixed(
      index === 0
        ? 0
        : 1
    ) +
    ' ' +
    units[index]
  );

}
