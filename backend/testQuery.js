const db = require('./db');

db.query('SELECT * FROM usuarios', (err, results) => {
  if (err) {
    console.error('Error al consultar la base de datos:', err);
  } else {
    console.log('Lista de usuarios:', results);
  }
  db.end();
});