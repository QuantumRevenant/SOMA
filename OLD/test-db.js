const db = require('./backend/db');

db.query('SELECT * FROM usuarios', (err, results) => {
  if (err) {
    console.error('❌ Error en la consulta:', err);
    return;
  }
  console.log('Resultados:', results);
});