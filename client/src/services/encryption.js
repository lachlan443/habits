const ITERATIONS = 600_000;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

export function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return btoa(String.fromCharCode(...bytes));
}

export function generateMasterKey() {
  return crypto.getRandomValues(new Uint8Array(32));
}

export async function derivePasswordKey(password, saltBase64) {
  const saltBytes = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function importRawKey(rawBytes) {
  return crypto.subtle.importKey('raw', rawBytes, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

async function encryptWithKey(plaintext, cryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    new TextEncoder().encode(plaintext)
  );
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return btoa(String.fromCharCode(...combined));
}

async function decryptWithKey(base64blob, cryptoKey) {
  const bytes = Uint8Array.from(atob(base64blob), c => c.charCodeAt(0));
  const iv = bytes.slice(0, IV_LENGTH);
  const ciphertext = bytes.slice(IV_LENGTH);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
  return new TextDecoder().decode(plaintext);
}

export async function encryptMasterKey(masterKeyBytes, passwordKey) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, passwordKey, masterKeyBytes);
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptMasterKey(base64blob, passwordKey) {
  const bytes = Uint8Array.from(atob(base64blob), c => c.charCodeAt(0));
  const iv = bytes.slice(0, IV_LENGTH);
  const ciphertext = bytes.slice(IV_LENGTH);
  const rawKey = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, passwordKey, ciphertext);
  return new Uint8Array(rawKey);
}

export async function encryptHabitName(name, masterKey) {
  return encryptWithKey(name, masterKey);
}

export async function decryptHabitName(blob, masterKey) {
  return decryptWithKey(blob, masterKey);
}
