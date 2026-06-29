const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function runMigration() {
  const schemaPath = path.join(__dirname, 'models', 'schema.sql');
  console.log(`Membaca file schema dari ${schemaPath}...`);
  
  try {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Menghubungkan ke database...');
    
    // 1. Bersihkan status dokumen yang tidak valid sebelum menerapkan check constraint
    console.log('Membersihkan status dokumen yang tidak valid...');
    await pool.query(`
      UPDATE documents 
      SET status = 'draft' 
      WHERE status NOT IN ('draft', 'wait_for_finalization', 'final', 'rejected', 'archived');
    `);
    
    // 2. Jalankan query schema.sql
    console.log('Menjalankan schema.sql...');
    await pool.query(sql);
    console.log('Migrasi berhasil dijalankan!');
  } catch (error) {
    console.error('Terjadi kesalahan saat migrasi:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
