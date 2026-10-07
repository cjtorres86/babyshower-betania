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
  const sslParam = (parsed.searchParams.get('ssl-mode') || parsed.searchParams.get('ssl') || process.env.DB_SSL || '').toUpperCase();
  const isTiDB = parsed.hostname.includes('tidbcloud.com');
  const useSsl = isTiDB || sslParam === 'REQUIRED' || sslParam === 'TRUE' || sslParam === '1' || !!process.env.DB_CA_CERT;

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
  ['Almohada de lactancia', ''],
  ['Bañera plegable para bebé', 'Con soporte antideslizante'],
  ['Baberos', ''],
  ['Bodies manga corta/larga 0-3 meses', 'Colores neutros'],
  ['Bodies manga corta/larga 3-6 meses', 'Colores neutros'],
  ['Calcetines', ''],
  ['Canasto organizador para mudador', ''],
  ['Chupetes', ''],
  ['Crema para muda', ''],
  ['Dosificador de leche en polvo', ''],
  ['Escobilla para lavar mamaderas', ''],
  ['Esterilizador de mamaderas', ''],
  ['Fular portabebé', 'Ignacio 💛'],
  ['Gimnasio para bebé', ''],
  ['Gorro de algodón', ''],
  ['Juguetes sensoriales pequeños', ''],
  ['Kit de higiene bebé', 'Lima eléctrica, cortaúñas, peineta'],
  ['Libros de tela', 'Para estimulación temprana'],
  ['Luz nocturna / lámpara tenue', 'Para las tomas nocturnas'],
  ['Mamadera anticólicos', ''],
  ['Manta de actividades', ''],
  ['Manta de algodón o polar', ''],
  ['Mochila o bolso maternal', ''],
  ['Mordedores', ''],
  ['Mudador', ''],
  ['Muselinas / pañales de tela', ''],
  ['Organizador de pañales', ''],
  ['Pañales talla RN', 'Cualquier marca, ¡nunca sobran!'],
  ['Pañales talla P', 'Para cuando crezca un poquito'],
  ['Pañales talla M', ''],
  ['Pañitos para sacar chanchitos', ''],
  ['Pijamas con cierre 0-3 meses', ''],
  ['Pijamas con cierre 3-6 meses', ''],
  ['Saco de dormir para bebé', ''],
  ['Silla mecedora para bebé', ''],
  ['Sonajeros', ''],
  ['Termómetro digital', ''],
  ['Toalla con capucha', ''],
  ['Toallas de mano para bebé', ''],
  ['Toallitas húmedas', 'Sin perfume, idealmente'],
];

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      comment VARCHAR(500) NOT NULL DEFAULT '',
      reserved_by VARCHAR(120) NULL,
      reserved_at DATETIME NULL,
      guest_note VARCHAR(300) NOT NULL DEFAULT '',
      dedication VARCHAR(500) NOT NULL DEFAULT '',
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Agrega columna guest_note si no existe (para bases de datos ya creadas)
  try {
    await pool.query(`ALTER TABLE gifts ADD COLUMN guest_note VARCHAR(300) NOT NULL DEFAULT ''`);
  } catch {
    // Ya existe, ignorar
  }

  // Agrega columna dedication si no existe (para bases de datos ya creadas)
  try {
    await pool.query(`ALTER TABLE gifts ADD COLUMN dedication VARCHAR(500) NOT NULL DEFAULT ''`);
  } catch {
    // Ya existe, ignorar
  }

  // Hash del código secreto de quien reservó (permite ver y responder su conversación)
  try {
    await pool.query(`ALTER TABLE gifts ADD COLUMN owner_token_hash VARCHAR(64) NULL`);
  } catch {
    // Ya existe, ignorar
  }

  // Mensajes entre quien reservó el regalo y Betania
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gift_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      gift_id INT NOT NULL,
      author VARCHAR(10) NOT NULL,
      body VARCHAR(500) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_gift (gift_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM gifts');
  if (total === 0 && process.env.SEED_DEFAULT_GIFTS !== 'false') {
    const rows = DEFAULT_GIFTS.map(([name, comment], i) => [name, comment, i]);
    await pool.query('INSERT INTO gifts (name, comment, sort_order) VALUES ?', [rows]);
    console.log(`🎁 Se cargaron ${rows.length} regalos de ejemplo.`);
  }
}
