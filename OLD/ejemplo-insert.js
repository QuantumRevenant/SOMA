// ejemplo-insert.js
const { getPool } = require('./backend/db');

async function run() {
  try {
    const pool = await getPool();

    const [res] = await pool.execute(
      'INSERT INTO Personas (Nombre, Apellido, DNI, Correo) VALUES (?, ?, ?, ?)',
      ['Luis', 'Gomez', '87654321', 'luis@mail.com']
    );

    console.log('✔ Persona insertada con ID:', res.insertId);

    await pool.end();
  } catch (err) {
    console.error('❌ Error al insertar:', err.message);
  }
}

run();