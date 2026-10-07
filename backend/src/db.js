import mysql from 'mysql2/promise';

/**
 * Conexión a MySQL.
 * En Aiven copia el "Service URI" en DATABASE_URL, por ejemplo:
 *   mysql://avnadmin:CLAVE@mysql-xxxx.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED
 * Opcional: pega el contenido del certificado CA de Aiven en DB_CA_CERT
 * para validar el certificado del servidor.
 */
function buildConfig() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Falta la variable DATABASE_URL (Service URI de Aiven).');
  }

  const parsed = new URL(url);
  const sslMode = (parsed.searchParams.get('ssl-mode') || process.env.DB_SSL || '').toUpperCase();
  const useSsl = sslMode === 'REQUIRED' || sslMode === 'TRUE' || !!process.env.DB_CA_CERT;

  let ssl;
  if (useSsl) {
    ssl = process.env.DB_CA_CERT
      ? { ca: process.env.DB_CA_CERT.replace(/\\n/g, '\n'), rejectUnauthorized: true }
      : { rejectUnauthorized: false };
  }

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, '') || 'defaultdb',
    ssl,
    waitForConnections: true,
    connectionLimit: 5,
    charset: 'utf8mb4',
  };
}

export const pool = mysql.createPool(buildConfig());

const DEFAULT_GIFTS = [
  ['Pack de pañales talla RN', 'Cualquier marca, ¡nunca sobran!'],
  ['Pack de pañales talla P', 'Para cuando crezca un poquito'],
  ['Toallitas húmedas', 'Sin perfume, idealmente'],
  ['Set de bodys de algodón 0-3 meses', 'Colores neutros'],
  ['Pijamas enteritos 3-6 meses', ''],
  ['Mantita de apego', 'Suave y lavable'],
  ['Bañera para bebé', 'Con soporte antideslizante'],
  ['Set de toallas con capucha', ''],
  ['Termómetro digital', ''],
  ['Monitor de bebé', 'Con cámara si es posible'],
  ['Silla de auto (huevito)', 'Regalo grupal 💛'],
  ['Mochila o bolso maternal', ''],
  ['Set de mamaderas', 'Anticólicos'],
  ['Cojín de lactancia', ''],
  ['Libros de tela', 'Para estimulación temprana'],
  ['Móvil para la cuna', ''],
];

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      comment VARCHAR(500) NOT NULL DEFAULT '',
      reserved_by VARCHAR(120) NULL,
      reserved_at DATETIME NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM gifts');
  if (total === 0 && process.env.SEED_DEFAULT_GIFTS !== 'false') {
    const rows = DEFAULT_GIFTS.map(([name, comment], i) => [name, comment, i]);
    await pool.query('INSERT INTO gifts (name, comment, sort_order) VALUES ?', [rows]);
    console.log(`🎁 Se cargaron ${rows.length} regalos de ejemplo.`);
  }
}
