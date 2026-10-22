/* Загрузка городских данных для локального режима (без сервера). */
const loadSeed = async () => {
  if (window.__RYADOM_SEED__) return window.__RYADOM_SEED__;
  const r = await fetch('/seed.json', { cache: 'no-store' });
  if (!r.ok) throw new Error('Не удалось загрузить данные города');
  return r.json();
};

const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
const randHex = (bytes) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
const rid = (p) => p + randHex(8);

async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  if (window.crypto && crypto.subtle) {
    try {
      const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
      const salt = new Uint8Array(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        key,
        256
      );
      return Array.from(new Uint8Array(bits))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      /* резервный вариант ниже */
    }
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  const str = saltHex + '|' + password;
  for (let round = 0; round < 2000; round++) {
    for (let i = 0; i < str.length; i++) {
      h1 = ((h1 ^ str.charCodeAt(i)) * 16777619) >>> 0;
      h2 = (h2 + str.charCodeAt(i) * (round + 1)) >>> 0;
    }
  }
  return ('00000000' + h1.toString(16)).slice(-8) + ('00000000' + h2.toString(16)).slice(-8);
}

export { loadSeed, minutesAgo, randHex, rid, hashPassword };
