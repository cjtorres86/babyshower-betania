import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { pool, initDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const BETANIA_PASSWORD = process.env.BETANIA_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

if (!ADMIN_PASSWORD) {
  console.warn('⚠️  ADMIN_PASSWORD no está configurada: el panel de administración quedará deshabilitado.');
}
if (!BETANIA_PASSWORD) {
  console.warn('⚠️  BETANIA_PASSWORD no está configurada: el acceso de Betania quedará deshabilitado.');
}

// ---------- Middlewares ----------
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Sin FRONTEND_URL se permite todo (útil en desarrollo).
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Origen no permitido por CORS'));
    },
  })
);
app.use(express.json({ limit: '20kb' }));
app.set('trust proxy', 1); // Render está detrás de un proxy

const reserveLimiter = rateLimit({ windowMs: 60_000, max: 15, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Vista pública (SIN dedicatoria)
const toGift = (row) => ({
  id: row.id,
  name: row.name,
  comment: row.comment,
  reserved: !!row.reserved_by,
  reservedBy: row.reserved_by,
  reservedAt: row.reserved_at,
});

const toMessage = (m) => ({ id: m.id, author: m.author, body: m.body, createdAt: m.created_at });

// El comentario inicial del invitado es el primer mensaje del hilo
function buildThread(row, msgs) {
  if (!row.reserved_by) return [];
  const list = msgs.map(toMessage);
  if (row.guest_note) {
    list.unshift({ id: `note-${row.id}`, author: 'guest', body: row.guest_note, createdAt: row.reserved_at });
  }
  return list;
}

// Vista privada para admin y betania (CON dedicatoria y conversación)
const toGiftPrivate = (row, msgs = []) => ({
  ...toGift(row),
  guestNote: row.guest_note || '',
  dedication: row.dedication || '',
  messages: buildThread(row, msgs),
});

const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

function jwtRole(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    const p = jwt.verify(token, JWT_SECRET);
    return p.role === 'admin' || p.role === 'betania' ? p.role : null;
  } catch {
    return null;
  }
}

// 'betania' si trae sesión de admin/Betania; 'guest' si trae el código de quien reservó
function threadAccess(req, row) {
  if (jwtRole(req)) return 'betania';
  const t = req.headers['x-owner-token'];
  if (t && row.owner_token_hash) {
    const a = Buffer.from(hashToken(t));
    const b = Buffer.from(row.owner_token_hash);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return 'guest';
  }
  return null;
}

function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Acceso solo para administrador.' });
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada. Vuelve a ingresar.' });
  }
}

function requireAdminOrBetania(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin' && payload.role !== 'betania') {
      return res.status(403).json({ error: 'Acceso no autorizado.' });
    }
    req.userRole = payload.role;
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada. Vuelve a ingresar.' });
  }
}

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ---------- Rutas públicas ----------
app.get('/', (_req, res) => res.json({ ok: true, service: 'Baby Shower Betania API' }));

app.get('/api/health', wrap(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
}));

app.get('/api/gifts', wrap(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM gifts ORDER BY sort_order ASC, id ASC');
  res.json(rows.map(toGift));
}));

app.post('/api/gifts/:id/reserve', reserveLimiter, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const name = clean(req.body?.name, 120);
  const note = clean(req.body?.note, 300);
  const dedication = clean(req.body?.dedication, 500);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Regalo inválido.' });
  if (name.length < 2) return res.status(400).json({ error: 'Escribe tu nombre para reservar.' });

  // Código secreto para que el invitado pueda volver a ver y responder su conversación
  const ownerToken = crypto.randomBytes(24).toString('hex');

  // Actualización atómica: solo reserva si nadie lo tomó antes.
  const [result] = await pool.query(
    'UPDATE gifts SET reserved_by = ?, reserved_at = NOW(), guest_note = ?, dedication = ?, owner_token_hash = ? WHERE id = ? AND reserved_by IS NULL',
    [name, note, dedication, hashToken(ownerToken), id]
  );

  if (result.affectedRows === 0) {
    const [[exists]] = await pool.query('SELECT id FROM gifts WHERE id = ?', [id]);
    if (!exists) return res.status(404).json({ error: 'Ese regalo ya no existe.' });
    return res.status(409).json({ error: '¡Uy! Alguien acaba de reservar este regalo. Elige otro 💛' });
  }

  const [[row]] = await pool.query('SELECT * FROM gifts WHERE id = ?', [id]);
  res.json({ ...toGift(row), ownerToken });
}));

// Conversación de un regalo: solo quien lo reservó (con su código) y Betania/admin
app.get('/api/gifts/:id/thread', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const [[row]] = await pool.query('SELECT * FROM gifts WHERE id = ?', [id]);
  if (!row || !row.reserved_by) return res.status(404).json({ error: 'Regalo no encontrado.' });
  if (!threadAccess(req, row)) return res.status(403).json({ error: 'No tienes acceso a esta conversación.' });
  const [msgs] = await pool.query('SELECT * FROM gift_messages WHERE gift_id = ? ORDER BY id ASC', [id]);
  res.json(buildThread(row, msgs));
}));

app.post('/api/gifts/:id/messages', reserveLimiter, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const text = clean(req.body?.text, 500);
  if (text.length < 1) return res.status(400).json({ error: 'Escribe un mensaje.' });
  const [[row]] = await pool.query('SELECT * FROM gifts WHERE id = ?', [id]);
  if (!row || !row.reserved_by) return res.status(404).json({ error: 'Regalo no encontrado.' });
  const access = threadAccess(req, row);
  if (!access) return res.status(403).json({ error: 'No tienes acceso a esta conversación.' });
  const author = access === 'betania' ? 'betania' : 'guest';
  const [r] = await pool.query('INSERT INTO gift_messages (gift_id, author, body) VALUES (?, ?, ?)', [id, author, text]);
  const [[msg]] = await pool.query('SELECT * FROM gift_messages WHERE id = ?', [r.insertId]);
  res.status(201).json(toMessage(msg));
}));

// ---------- Rutas de administración ----------
app.post('/api/admin/login', loginLimiter, (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'El panel de administración no está configurado.' });
  const given = Buffer.from(String(req.body?.password ?? ''));
  const expected = Buffer.from(ADMIN_PASSWORD);
  const ok = given.length === expected.length && crypto.timingSafeEqual(given, expected);
  if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta.' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, role: 'admin' });
});

// Login único: la contraseña define si entra admin o Betania
app.post('/api/login', loginLimiter, (req, res) => {
  const given = Buffer.from(String(req.body?.password ?? ''));
  const matches = (pw) => {
    if (!pw) return false;
    const expected = Buffer.from(pw);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  };
  if (matches(ADMIN_PASSWORD)) {
    return res.json({ token: jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' }), role: 'admin' });
  }
  if (matches(BETANIA_PASSWORD)) {
    return res.json({ token: jwt.sign({ role: 'betania' }, JWT_SECRET, { expiresIn: '24h' }), role: 'betania' });
  }
  res.status(401).json({ error: 'Contraseña incorrecta.' });
});

// Login de Betania
app.post('/api/betania/login', loginLimiter, (req, res) => {
  if (!BETANIA_PASSWORD) return res.status(503).json({ error: 'El acceso de Betania no está configurado.' });
  const given = Buffer.from(String(req.body?.password ?? ''));
  const expected = Buffer.from(BETANIA_PASSWORD);
  const ok = given.length === expected.length && crypto.timingSafeEqual(given, expected);
  if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta.' });
  const token = jwt.sign({ role: 'betania' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, role: 'betania' });
});

// Regalos con dedicatorias (solo admin y betania)
app.get('/api/private/gifts', requireAdminOrBetania, wrap(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM gifts ORDER BY sort_order ASC, id ASC');
  const [msgs] = await pool.query('SELECT * FROM gift_messages ORDER BY id ASC');
  const byGift = {};
  for (const m of msgs) (byGift[m.gift_id] ||= []).push(m);
  res.json(rows.map((r) => toGiftPrivate(r, byGift[r.id] || [])));
}));

app.post('/api/admin/gifts', requireAdmin, wrap(async (req, res) => {
  const name = clean(req.body?.name, 160);
  const comment = clean(req.body?.comment, 500);
  if (name.length < 2) return res.status(400).json({ error: 'El regalo necesita un nombre.' });
  const [[{ next }]] = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM gifts');
  const [r] = await pool.query('INSERT INTO gifts (name, comment, sort_order) VALUES (?, ?, ?)', [name, comment, next]);
  const [[row]] = await pool.query('SELECT * FROM gifts WHERE id = ?', [r.insertId]);
  res.status(201).json(toGift(row));
}));

app.put('/api/admin/gifts/:id', requireAdmin, wrap(async (req, res) => {
  const name = clean(req.body?.name, 160);
  const comment = clean(req.body?.comment, 500);
  if (name.length < 2) return res.status(400).json({ error: 'El regalo necesita un nombre.' });
  const [r] = await pool.query('UPDATE gifts SET name = ?, comment = ? WHERE id = ?', [name, comment, Number(req.params.id)]);
  if (r.affectedRows === 0) return res.status(404).json({ error: 'Regalo no encontrado.' });
  const [[row]] = await pool.query('SELECT * FROM gifts WHERE id = ?', [Number(req.params.id)]);
  res.json(toGift(row));
}));

app.post('/api/admin/gifts/:id/release', requireAdmin, wrap(async (req, res) => {
  const [r] = await pool.query(
    "UPDATE gifts SET reserved_by = NULL, reserved_at = NULL, guest_note = '', dedication = '', owner_token_hash = NULL WHERE id = ?",
    [Number(req.params.id)]
  );
  if (r.affectedRows === 0) return res.status(404).json({ error: 'Regalo no encontrado.' });
  await pool.query('DELETE FROM gift_messages WHERE gift_id = ?', [Number(req.params.id)]);
  const [[row]] = await pool.query('SELECT * FROM gifts WHERE id = ?', [Number(req.params.id)]);
  res.json(toGift(row));
}));

app.delete('/api/admin/gifts/:id', requireAdmin, wrap(async (req, res) => {
  const [r] = await pool.query('DELETE FROM gifts WHERE id = ?', [Number(req.params.id)]);
  if (r.affectedRows === 0) return res.status(404).json({ error: 'Regalo no encontrado.' });
  await pool.query('DELETE FROM gift_messages WHERE gift_id = ?', [Number(req.params.id)]);
  res.status(204).end();
}));

// ---------- Errores ----------
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.message?.includes('CORS')) return res.status(403).json({ error: err.message });
  res.status(500).json({ error: 'Ocurrió un error en el servidor. Intenta de nuevo.' });
});

initDb()
  .then(() => app.listen(PORT, () => console.log(`🍼 API escuchando en el puerto ${PORT}`)))
  .catch((err) => {
    console.error('No se pudo conectar a MySQL:', err.message);
    process.exit(1);
  });
