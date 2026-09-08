const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Bağlantı Havuzu (Environment Variables ile yapılandırılır)
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'supersecret',
  database: process.env.DB_NAME || 'devops_db'
});

// Veritabanı Tablo Başlatma (Retry mekanizmalı)
async function initDatabase(retries = 10, delay = 2000) {
  while (retries > 0) {
    try {
      console.log(`[Database] PostgreSQL bağlantısı deneniyor (${process.env.DB_HOST || 'db'}:5432)...`);
      const client = await pool.connect();
      
      // Tablo yoksa otomatik oluştur
      await client.query(`
        CREATE TABLE IF NOT EXISTS notes (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      client.release();
      console.log('[Database] PostgreSQL bağlantısı başarılı ve "notes" tablosu hazır! 🚀');
      return;
    } catch (err) {
      console.error(`[Database] Bağlantı henüz hazır değil: ${err.message}. Kalan deneme: ${retries - 1}`);
      retries--;
      if (retries === 0) {
        console.error('[Database] PostgreSQL bağlantısı kurulamadı. Sunucu yine de çalışmaya devam edecek.');
        return;
      }
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

// 1. Healthcheck Endpoint'i (Konteynır Sağlık Kontrolü)
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW() as current_time');
    res.json({
      status: 'UP',
      uptime_seconds: Math.floor(process.uptime()),
      database: 'CONNECTED',
      db_time: dbResult.rows[0].current_time
    });
  } catch (error) {
    res.status(503).json({
      status: 'DEGRADED',
      database: 'DISCONNECTED',
      error: error.message
    });
  }
});

// 2. Notları Listele (GET /api/notes)
app.get('/api/notes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notes ORDER BY id DESC');
    res.json({
      count: result.rowCount,
      notes: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Yeni Not Ekle (POST /api/notes)
app.post('/api/notes', async (req, res) => {
  const { title, content } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Başlık (title) alanı zorunludur!' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *',
      [title.trim(), content || '']
    );
    res.status(201).json({
      message: 'Not başarıyla PostgreSQL veritabanına kaydedildi!',
      note: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Not Sil (DELETE /api/notes/:id)
app.delete('/api/notes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM notes WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: `ID ${id} olan not bulunamadı!` });
    }
    res.json({
      message: `ID ${id} olan not veritabanından silindi!`,
      deleted_note: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { app, pool, initDatabase };
