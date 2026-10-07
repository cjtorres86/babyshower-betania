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
  guestNote: row.guest_note || '',
});

// Vista privada para admin y betania (CON dedicatoria)
const toGiftPrivate = (row) => ({
  ...toGift(row),
  dedication: row.dedication || '',
});

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

  // Actualización atómica: solo reserva si nadie lo tomó antes.
  const [result] = await pool.query(
    'UPDATE gifts SET reserved_by = ?, reserved_at = NOW(), guest_note = ?, dedication = ? WHERE id = ? AND reserved_by IS NULL',
    [name, note, dedication, id]
  );

  if (result.affectedRows === 0) {
    const [[exists]] = await pool.query('SELECT id FROM gifts WHERE id = ?', [id]);
    if (!exists) return res.status(404).json({ error: 'Ese regalo ya no existe.' });
    return res.status(409).json({ error: '¡Uy! Alguien acaba de reservar este regalo. Elige otro 💛' });
  }

  const [[row]] = await pool.query('SELECT * FROM gifts WHERE id = ?', [id]);
  res.json(toGift(row));
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
  res.json(rows.map(toGiftPrivate));
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
  const [r] = await pool.query('UPDATE gifts SET reserved_by = NULL, reserved_at = NULL WHERE id = ?', [Number(req.params.id)]);
  if (r.affectedRows === 0) return res.status(404).json({ error: 'Regalo no encontrado.' });
  const [[row]] = await pool.query('SELECT * FROM gifts WHERE id = ?', [Number(req.params.id)]);
  res.json(toGift(row));
}));

app.delete('/api/admin/gifts/:id', requireAdmin, wrap(async (req, res) => {
  const [r] = await pool.query('DELETE FROM gifts WHERE id = ?', [Number(req.params.id)]);
  if (r.affectedRows === 0) return res.status(404).json({ error: 'Regalo no encontrado.' });
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
