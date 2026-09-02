const SECRET_KEY = process.env.JWT_SECRET || 'geo-valig-secure-hmac-secret-key-987654321';

/**
 * A lightweight pure-JS SHA-256 implementation to avoid Node.js native dependencies (like 'crypto')
 * in Next.js Edge Runtime (Middleware).
 */
function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const words: number[] = [];
  const asciiLength = ascii.length;
  const wordsLength = ((asciiLength + 8) >> 6) + 1;
  const wordCount = wordsLength * 16;
  for (let i = 0; i < wordCount; i++) {
    words[i] = 0;
  }
  for (let i = 0; i < asciiLength; i++) {
    words[i >> 2] |= ascii.charCodeAt(i) << (24 - (i % 4) * 8);
  }
  words[asciiLength >> 2] |= 0x80 << (24 - (asciiLength % 4) * 8);
  words[wordCount - 1] = asciiLength * 8;

  for (let i = 0; i < wordCount; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);

    for (let j = 0; j < 64; j++) {
      if (j >= 16) {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const sigma0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const sigma1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const temp1 = (hash[7] + sigma1 + ch + k[j] + (w[j] || 0)) | 0;
      const temp2 = (sigma0 + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (let j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  let finalHex = '';
  for (let i = 0; i < 8; i++) {
    const word = hash[i];
    for (let j = 3; j >= 0; j--) {
      const byte = (word >> (j * 8)) & 0xff;
      finalHex += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return finalHex;
}

export interface SessionData {
  email: string;
  role: string;
  nome: string;
}

/**
 * Fallback name helper for legacy session tokens or default roles.
 */
function getFallbackName(email: string, role: string): string {
  if (role === 'viewer') return 'Usuário de Leitura';
  if (email.toLowerCase().includes('caio')) return 'Caio Rodrigues';
  if (email.toLowerCase().includes('luiz')) return 'Luiz Eduardo';
  if (email.toLowerCase().includes('christian')) return 'Christian Azevedo';
  if (email.toLowerCase().includes('guilherme')) return 'Guilherme Almeida';
  if (email.toLowerCase().includes('flaviane')) return 'Flaviane Marvilla';
  if (email.toLowerCase().includes('fernanda')) return 'Fernanda Brito';
  if (email.toLowerCase().includes('mayara')) return 'Mayara Ruany';
  return role === 'admin' ? 'Caio Rodrigues' : 'Usuário';
}

/**
 * Generates a cryptographically signed, tamper-proof session token embedding email, role, and nome.
 */
export function generateSessionToken(email: string, role: string = 'viewer', nome: string = 'Usuário'): string {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24; // 1 day
  // Encoding payload in Base64 or pipe concatenated format to avoid issues with colons/special chars in names
  const payloadData = JSON.stringify({ email, role, nome, expiresAt });
  const payloadBase64 = Buffer.from(payloadData).toString('base64url');
  const signature = sha256(`${payloadBase64}:${SECRET_KEY}`);
  return `${payloadBase64}.${signature}`;
}

/**
 * Validates a signed session token and returns session data { email, role, nome } if valid.
 */
export function verifySessionToken(token: string | undefined): SessionData | null {
  if (!token) return null;
  try {
    // New JSON/Base64 payload format: payloadBase64.signature
    if (token.includes('.')) {
      const parts = token.split('.');
      if (parts.length === 2) {
        const [payloadBase64, signature] = parts;
        const expectedSignature = sha256(`${payloadBase64}:${SECRET_KEY}`);
        if (signature !== expectedSignature) {
          return null;
        }

        const decodedStr = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
        const parsed = JSON.parse(decodedStr);

        if (Date.now() > parsed.expiresAt) {
          return null;
        }

        return {
          email: parsed.email,
          role: parsed.role,
          nome: parsed.nome || getFallbackName(parsed.email, parsed.role),
        };
      }
    }

    // Legacy colon-delimited token format fallbacks (email:role:expiresAt:signature or email:expiresAt:signature)
    const parts = token.split(':');
    if (parts.length === 4) {
      const [email, role, expiresAtStr, signature] = parts;
      const expiresAt = parseInt(expiresAtStr, 10);

      if (Date.now() > expiresAt) {
        return null;
      }

      const payload = `${email}:${role}:${expiresAt}`;
      const expectedSignature = sha256(`${payload}:${SECRET_KEY}`);

      if (signature === expectedSignature) {
        return { email, role, nome: getFallbackName(email, role) };
      }
    } else if (parts.length === 3) {
      const [email, expiresAtStr, signature] = parts;
      const expiresAt = parseInt(expiresAtStr, 10);

      if (Date.now() > expiresAt) {
        return null;
      }

      const payload = `${email}:${expiresAt}`;
      const expectedSignature = sha256(`${payload}:${SECRET_KEY}`);

      if (signature === expectedSignature) {
        const adminEmail = process.env.ADMIN_EMAIL || 'gestaodedados@ipda.com.br';
        const role = email === adminEmail ? 'admin' : 'viewer';
        return { email, role, nome: getFallbackName(email, role) };
      }
    }
    return null;
  } catch (err) {
    console.error('Session verification failed:', err);
    return null;
  }
}

/**
 * Extracts the email from a valid session token.
 */
export function getEmailFromSessionToken(token: string | undefined): string | null {
  const session = verifySessionToken(token);
  return session ? session.email : null;
}
