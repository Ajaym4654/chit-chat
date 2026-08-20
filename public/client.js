// =====================================================
// ANON FUN CHAT - CLIENT.JS
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
// GIF ELEMENTS
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
// ANONYMOUS NAME
// =====================================================

const anonTag =
  'Anon#' +
  Math.random()
    .toString(36)
    .slice(2, 6);

nameInput.placeholder =
  `Name (optional, e.g., ${anonTag})`;


// =====================================================
// USER STATS
// =====================================================

socket.on(
  'userStats',
  (stats) => {

    if (liveUsersEl) {

      liveUsersEl.textContent =
        stats.live ?? 0;

    }

    if (totalUsersEl) {

      totalUsersEl.textContent =
        stats.total ?? 0;

    }

  }
);


// =====================================================
// JOIN
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
      audioContext.currentTime + 0.16
    );


    oscillator.connect(gain);

    gain.connect(
      audioContext.destination
    );


    oscillator.start();

    oscillator.stop(
      audioContext.currentTime + 0.17
    );

  } catch (error) {

    console.log(
      'Notification sound unavailable'
    );

  }

}


// =====================================================
// UNLOCK AUDIO
// =====================================================

document.addEventListener(
  'click',
  () => {

    try {

      if (!audioContext) {

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
    once: true
  }
);


// =====================================================
// BROWSER NOTIFICATIONS
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
        icon: '/favicon.ico'
      }
    );

  } catch {}

}


// =====================================================
// CHAT MESSAGE RECEIVE
// =====================================================

socket.on(
  'chat',
  (data) => {

    addMessage(
      data.name,
      data.text,
      data.at
    );


    playNotificationSound();


    showNotification(
      '💬 Anon Fun Chat',
      `${
        data.name ||
        'Anon'
      }: ${data.text}`
    );

  }
);


// =====================================================
// SYSTEM JOIN / LEAVE
// =====================================================

socket.on(
  'system',
  (evt) => {

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

    }


    else if (
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
  (f) => {

    addFileMessage(
      f,
      f.at
    );


    playNotificationSound();


    showNotification(
      '📎 New file',
      `${
        f.name ||
        'Anon'
      } shared ${
        f.filename
      }`
    );

  }
);


// =====================================================
// GIF SHARED
// =====================================================

socket.on(
  'gifShared',
  (gif) => {

    addGifMessage(
      gif,
      gif.at
    );


    playNotificationSound();


    showNotification(
      '😂 New GIF',
      `${
        gif.name ||
        'Anon'
      } sent a GIF`
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


if (controls) {

  controls.addEventListener(
    'submit',
    (e) => {

      e.preventDefault();


      const text =
        msgInput.value.trim();


      if (
        !text &&
        fileInput.files.length === 0
      ) {

        return;

      }


      const name =
        nameInput.value.trim() ||
        null;


      // ---------------------------------------------
      // TEXT
      // ---------------------------------------------

      if (text) {

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


      // ---------------------------------------------
      // FILES
      // ---------------------------------------------

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
// AUTO GROW TEXTAREA
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
            method: 'POST',
            body: form
          }
        );


      if (!res.ok) {

        addSystem(
          `Upload failed for ${file.name} ❌`
        );

        continue;

      }


      const info =
        await res.json();


      const fileInfo = {

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

      };


      socket.emit(
        'fileShared',
        fileInfo
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
    typeof mime === 'string' &&
    mime.startsWith('image/')
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

  if (!emojiPicker) {
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


          emojiPicker.classList
            .remove(
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


if (emojiBtn) {

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

        if (emojiPicker) {

          emojiPicker.classList.remove(
            'open'
          );

        }


        if (gifSearch) {

          gifSearch.focus();

        }


        if (
          gifResults &&
          gifResults.children.length === 0
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
// GIF SEARCH BUTTON
// =====================================================

if (gifSearchBtn) {

  gifSearchBtn.addEventListener(
    'click',
    () => {

      const query =
        gifSearch.value.trim();


      searchGifs(
        query ||
        'funny'
      );

    }
  );

}


// =====================================================
// GIF SEARCH ENTER
// =====================================================

if (gifSearch) {

  gifSearch.addEventListener(
    'keydown',
    (e) => {

      if (
        e.key === 'Enter'
      ) {

        e.preventDefault();


        const query =
          gifSearch.value.trim();


        searchGifs(
          query ||
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

  if (!gifResults) {

    return;

  }


  const cleanQuery =
    String(
      query || 'funny'
    )
    .trim()
    .slice(
      0,
      100
    );


  gifResults.innerHTML =
    '<div class="gif-loading">Searching GIFs... 🎬</div>';


  try {

    const res =
      await fetch(
        `/api/gifs/search?q=${encodeURIComponent(
          cleanQuery || 'funny'
        )}`
      );


    let data = null;


    try {

      data =
        await res.json();

    } catch {

      data = {};

    }


    if (!res.ok) {

      throw new Error(
        data.error ||
        'GIF search failed'
      );

    }


    gifResults.innerHTML =
      '';


    if (
      !data.gifs ||
      data.gifs.length === 0
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


            gifPicker.classList
              .remove(
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
      'GIF error:',
      error
    );


    gifResults.innerHTML =
      `<div class="gif-loading">
        GIFs could not be loaded ❌
      </div>`;

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


  const name =
    nameInput.value.trim() ||
    null;


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

      name

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


  // ---------------------------------------------
  // IMAGE
  // ---------------------------------------------

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

  }


  // ---------------------------------------------
  // AUDIO
  // ---------------------------------------------

  else if (
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

  }


  // ---------------------------------------------
  // OTHER FILE
  // ---------------------------------------------

  else {

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
    `Expires in ${
      f.ttlMinutes || 10
    }m`;


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
        image.src !== gif.preview
      ) {

        image.src =
          gif.preview;

      }

    }
  );


  body.appendChild(
    image
  );


  const label =
    document.createElement(
      'div'
    );


  label.className =
    'gif-label';


  label.textContent =
    'GIF 🎬';


  body.appendChild(
    label
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


if (voiceBtn) {

  voiceBtn.addEventListener(
    'click',
    async () => {

      if (!recording) {

        await startRecording();

      } else {

        stopRecording();

      }

    }
  );

}


// =====================================================
// START RECORDING
// =====================================================

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
          audio: true
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

    }

    else if (
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
          e.data.size > 0
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
      'Microphone error:',
      error
    );


    recording =
      false;


    addSystem(
      'Microphone permission denied ❌'
    );

  }

}


// =====================================================
// STOP RECORDING
// =====================================================

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


// =====================================================
// UPLOAD VOICE
// =====================================================

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


    if (!response.ok) {

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
      'Voice upload error:',
      error
    );


    addSystem(
      'Voice message failed ❌'
    );

  }

}


// =====================================================
// CLOSE PICKERS WHEN CLICKING OUTSIDE
// =====================================================

document.addEventListener(
  'click',
  (e) => {

    if (
      emojiPicker &&
      emojiBtn &&
      !emojiPicker.contains(e.target) &&
      !emojiBtn.contains(e.target)
    ) {

      emojiPicker.classList.remove(
        'open'
      );

    }


    if (
      gifPicker &&
      gifBtn &&
      !gifPicker.contains(e.target) &&
      !gifBtn.contains(e.target)
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
    i < units.length - 1
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
// CLIENT READY
// =====================================================

console.log(
  'Anon Fun Chat client loaded successfully.'
);
