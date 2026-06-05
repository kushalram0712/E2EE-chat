// --- Global variables ---
let socket; 
let currentUser;
let myPublicKeysBase64 = null; 

// --- UI Elements ---
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

// --- Cryptography Variables ---
let localEcdhKeyPair;   
let localEcdsaKeyPair;  
let sharedAesKey;
let peerEcdsaPubKey; 

// --- UTILITY: Update UI ---
function appendMessage(text, sender) {
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  div.innerText = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// --- UTILITY: Buffer/Base64 Conversion ---
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}

function base64ToBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary_string.charCodeAt(i);
  return bytes.buffer;
}

// --- STEP 1: The Login Flow ---
loginBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
      currentUser = data.username;
      loginContainer.style.display = 'none';
      appContainer.style.display = 'flex';
      connectWebSocket(data.token);
    } else {
      loginError.innerText = data.message;
      loginError.style.display = 'block';
    }
  } catch (err) {
    loginError.innerText = "Server error. Try again.";
    loginError.style.display = 'block';
  }
});

function connectWebSocket(token) {
  socket = io({ auth: { token: token } });
  initCrypto();
  setupSocketListeners(); 
}

// --- STEP 2: Perfectly Persisted Cryptography Engine ---
async function initCrypto() {
  try {
    appendMessage("Loading or generating encryption keys...", "system");
    
    const savedEcdhPriv = localStorage.getItem(`${currentUser}_ecdh_priv`);
    const savedEcdhPub = localStorage.getItem(`${currentUser}_ecdh_pub`);
    const savedEcdsaPriv = localStorage.getItem(`${currentUser}_ecdsa_priv`);
    const savedEcdsaPub = localStorage.getItem(`${currentUser}_ecdsa_pub`);

    if (savedEcdhPriv && savedEcdhPub && savedEcdsaPriv && savedEcdsaPub) {
      localEcdhKeyPair = {
        privateKey: await window.crypto.subtle.importKey("jwk", JSON.parse(savedEcdhPriv), { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]),
        publicKey: await window.crypto.subtle.importKey("jwk", JSON.parse(savedEcdhPub), { name: "ECDH", namedCurve: "P-256" }, true, [])
      };
      localEcdsaKeyPair = {
        privateKey: await window.crypto.subtle.importKey("jwk", JSON.parse(savedEcdsaPriv), { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]),
        publicKey: await window.crypto.subtle.importKey("jwk", JSON.parse(savedEcdsaPub), { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"])
      };
      appendMessage("🔑 Perfect key pairs restored from vault.", "system");
    } else {
      localEcdhKeyPair = await window.crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
      localEcdsaKeyPair = await window.crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);

      localStorage.setItem(`${currentUser}_ecdh_priv`, JSON.stringify(await window.crypto.subtle.exportKey("jwk", localEcdhKeyPair.privateKey)));
      localStorage.setItem(`${currentUser}_ecdh_pub`, JSON.stringify(await window.crypto.subtle.exportKey("jwk", localEcdhKeyPair.publicKey)));
      localStorage.setItem(`${currentUser}_ecdsa_priv`, JSON.stringify(await window.crypto.subtle.exportKey("jwk", localEcdsaKeyPair.privateKey)));
      localStorage.setItem(`${currentUser}_ecdsa_pub`, JSON.stringify(await window.crypto.subtle.exportKey("jwk", localEcdsaKeyPair.publicKey)));
      appendMessage("🔑 New perfect key pairs generated and saved.", "system");
    }

    const rawEcdh = await window.crypto.subtle.exportKey("raw", localEcdhKeyPair.publicKey);
    const rawEcdsa = await window.crypto.subtle.exportKey("raw", localEcdsaKeyPair.publicKey);
    
    myPublicKeysBase64 = { ecdh: bufferToBase64(rawEcdh), ecdsa: bufferToBase64(rawEcdsa) };
    socket.emit('send-public-key', myPublicKeysBase64);

  } catch (err) {
    appendMessage("🚨 Cryptography failure. Clear browser data and refresh.", "system");
    console.error("Crypto init error:", err);
  }
}

// --- STEP 3: Network Listeners ---
function setupSocketListeners() {
  socket.on('peer-joined', () => {
    appendMessage("New peer detected. Resending public keys...", "system");
    if (myPublicKeysBase64) {
      socket.emit('send-public-key', myPublicKeysBase64);
    }
  });

  socket.on('load-history', async (historyItems) => {
    if (historyItems.length === 0) return;
    appendMessage(`Loading ${historyItems.length} previous messages...`, "system");
    window.encryptedHistoryQueue = historyItems;
  });

  socket.on('receive-public-key', async (peerKeys) => {
    try {
      const peerEcdhBuffer = base64ToBuffer(peerKeys.ecdh);
      const peerEcdsaBuffer = base64ToBuffer(peerKeys.ecdsa);

      const peerEcdhPubKey = await window.crypto.subtle.importKey(
        "raw", peerEcdhBuffer, { name: "ECDH", namedCurve: "P-256" }, true, []
      );
      sharedAesKey = await window.crypto.subtle.deriveKey(
        { name: "ECDH", public: peerEcdhPubKey }, localEcdhKeyPair.privateKey,
        { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
      );

      peerEcdsaPubKey = await window.crypto.subtle.importKey(
        "raw", peerEcdsaBuffer, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]
      );

      appendMessage("✅ Secure connection established!", "system");
      messageInput.disabled = false;
      sendBtn.disabled = false;

      // Decrypt history now that we have the keys
      if (window.encryptedHistoryQueue && window.encryptedHistoryQueue.length > 0) {
        appendMessage("Decrypting history...", "system");
        for (const item of window.encryptedHistoryQueue) {
          await decryptAndDisplay(item);
        }
        window.encryptedHistoryQueue = []; 
      }
    } catch (err) {
      console.error("Handshake failed:", err);
    }
  });

  socket.on('receive-ciphertext', async (payload) => {
    decryptAndDisplay(payload);
  });
}

// --- STEP 4: Smart Decryption & Verification ---
async function decryptAndDisplay(payload) {
    if (!sharedAesKey) return; 
    try {
      const ivBuffer = base64ToBuffer(payload.iv);
      const cipherBuffer = base64ToBuffer(payload.ciphertext);
      const sigBuffer = base64ToBuffer(payload.signature);

      let decrypted;
      try {
        decrypted = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: ivBuffer }, sharedAesKey, cipherBuffer
        );
      } catch (decryptErr) {
        return; // Key rotated, unreadable
      }

      const plaintext = new TextDecoder().decode(decrypted);
      const style = payload.sender === currentUser ? "me" : "them";

      if (payload.sender === currentUser) {
         appendMessage(`${payload.sender}: ${plaintext}`, style);
         return;
      }

      let isValid = false;
      try {
        if (peerEcdsaPubKey) {
           isValid = await window.crypto.subtle.verify(
             { name: "ECDSA", hash: { name: "SHA-256" } }, peerEcdsaPubKey, sigBuffer, cipherBuffer
           );
        }
      } catch (e) {
        console.warn("Signature check skipped.");
      }

      if (isValid) {
         appendMessage(`${payload.sender}: ${plaintext} (✔️ Verified)`, style); 
      } else {
         appendMessage(`${payload.sender}: ${plaintext} (⚠️ Old Key)`, style); 
      }
      
    } catch (err) {
      console.error("Decryption pipeline failed", err);
    }
}

// --- STEP 5: Sending Messages (With Error Alerts) ---
sendBtn.addEventListener('click', async () => {
  const text = messageInput.value;
  if (!text) return;

  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv }, sharedAesKey, encodedText
    );

    const signature = await window.crypto.subtle.sign(
      { name: "ECDSA", hash: { name: "SHA-256" } }, localEcdsaKeyPair.privateKey, ciphertext 
    );

    const payload = { 
      iv: bufferToBase64(iv), 
      ciphertext: bufferToBase64(ciphertext), 
      signature: bufferToBase64(signature) 
    };

    socket.emit('send-ciphertext', payload);
    appendMessage(`${currentUser}: ${text}`, "me");
    messageInput.value = '';

  } catch (err) {
    alert(`ENCRYPTION FAILED: ${err.name} - ${err.message}`);
    console.error("Full Error:", err);
  }
});