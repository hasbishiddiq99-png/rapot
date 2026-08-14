// Membuat (atau memperbarui password) akun login.
// Cara pakai:
//   node scripts/create-admin.js <username> <password> "<Nama Lengkap>" [role]
// Contoh:
//   node scripts/create-admin.js admin RahasiaKuat123 "Ust. Admin Pesantren" admin

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function main() {
  const [username, password, name, role = 'staff'] = process.argv.slice(2);
  if (!username || !password || !name) {
    console.log('Cara pakai: node scripts/create-admin.js <username> <password> "<Nama Lengkap>" [role]');
    process.exit(1);
  }
  if (password.length < 6) {
    console.log('Kata sandi minimal 6 karakter.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (username, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = EXCLUDED.role`,
    [username, hash, name, role]
  );

  console.log(`Akun "${username}" berhasil dibuat/diperbarui.`);
  await pool.end();
}

main().catch((err) => {
  console.error('Gagal membuat akun:', err.message);
  process.exit(1);
});
