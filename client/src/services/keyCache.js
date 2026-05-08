const DB_NAME = 'habits-key-cache';
const STORE_NAME = 'keys';
const SESSION_KEY_STORAGE = 'habits_session_key';
const CACHE_BLOB_ID = 'master_key_blob';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

export async function writeCache(masterKey) {
  const sessionKeyBytes = crypto.getRandomValues(new Uint8Array(32));
  const sessionKey = await crypto.subtle.importKey(
    'raw', sessionKeyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const rawMasterKey = await crypto.subtle.exportKey('raw', masterKey);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sessionKey, rawMasterKey);

  const blob = new Uint8Array(12 + encrypted.byteLength);
  blob.set(iv, 0);
  blob.set(new Uint8Array(encrypted), 12);

  sessionStorage.setItem(SESSION_KEY_STORAGE, btoa(String.fromCharCode(...sessionKeyBytes)));

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, CACHE_BLOB_ID);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function readCache() {
  const sessionKeyB64 = sessionStorage.getItem(SESSION_KEY_STORAGE);
  if (!sessionKeyB64) return null;

  const db = await openDB();
  const blob = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(CACHE_BLOB_ID);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (!blob) return null;

  try {
    const sessionKeyBytes = Uint8Array.from(atob(sessionKeyB64), c => c.charCodeAt(0));
    const sessionKey = await crypto.subtle.importKey(
      'raw', sessionKeyBytes, { name: 'AES-GCM' }, false, ['decrypt']
    );
    const iv = blob.slice(0, 12);
    const ciphertext = blob.slice(12);
    const rawMasterKey = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sessionKey, ciphertext);
    return crypto.subtle.importKey('raw', rawMasterKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  } catch {
    return null;
  }
}

export async function clearCache() {
  sessionStorage.removeItem(SESSION_KEY_STORAGE);
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(CACHE_BLOB_ID);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}
