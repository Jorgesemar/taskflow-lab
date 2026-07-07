const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'taskflow',
    password: process.env.DB_PASSWORD || 'taskflow',
    database: process.env.DB_NAME || 'taskflow',
    port: 5432,
});
// Crear tabla si no existe
async function initDb(retries = 10, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          done BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT now()
        )
      `);
      return;
    } catch (err) {
      console.log(`DB no lista todavia (intento ${i + 1}/${retries}), reintentando...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('No se pudo conectar a la base de datos tras varios intentos');
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/tasks', async (req, res) => {
    const result = await pool.query('SELECT * FROM tasks ORDER BY id DESC');
    res.json(result.rows);
});

app.post('/tasks', async (req, res) => {
    const { title } = req.body;
    const result = await pool.query(
        'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
        [title] 
    );
    res.status(201).json(result.rows[0]);
});

app.put('/tasks/:id/done', async (req, res) => {
    const result = await pool.query(
        'UPDATE tasks SET done = true WHERE id = $1 RETURNING *',
        [req.params.id]
    );
    res.json(result.rows[0]);
});

const PORT = process.env.PORT || 3000;
initDb().then(() => {
    app.listen(PORT, () => console.log(`TaskFlow API escuchando en puerto ${PORT}`));
});