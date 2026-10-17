import { randomBytes, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(derive);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${key.toString('hex')}`;
}
const scryptShape = stored => {
  const [,salt,encoded] = stored.split('$');
  return /^[a-f0-9]{32}$/.test(salt || '') && /^[a-f0-9]{128}$/.test(encoded || '');
};
// 'hashed' is usable as-is, 'legacy' is a convertible stored credential,
// 'unconvertible' is empty or a malformed hash — those need an operator-issued reset, never a guess.
export function classifyStoredPassword(stored) {
  if (typeof stored !== 'string' || stored.trim() === '') return 'unconvertible';
  if (!stored.startsWith('scrypt$')) return 'legacy';
  return scryptShape(stored) ? 'hashed' : 'unconvertible';
}
export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  if (!stored.startsWith('scrypt$')) {
    // Compatibility for existing accounts; successful login immediately replaces this value.
    const a = Buffer.from(password), b = Buffer.from(stored);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  const [,salt,encoded] = stored.split('$');
  if (!/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(encoded || '')) return false;
  return timingSafeEqual(await scrypt(password, salt, 64), Buffer.from(encoded, 'hex'));
}
export function createRateLimiter(limit = 10, windowMs = 15 * 60 * 1000) {
  const attempts = new Map();
  return (req,res,next) => {
    const now=Date.now();
    for (const [key,value] of attempts) if(value.until<=now) attempts.delete(key);
    const key=req.ip;
    const entry=attempts.get(key)||{count:0,until:now+windowMs};
    entry.count++;attempts.set(key,entry);
    if(entry.count>limit) { res.set('Retry-After',String(Math.ceil((entry.until-now)/1000))); return res.status(429).json({error:'Too many attempts. Please try again later.'}); }
    next();
  };
}
