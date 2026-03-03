// hashPasswords.js
const bcrypt = require('bcrypt');
const db = require('./backend/db'); // <-- ruta corregida

// Lista de usuarios a actualizar con sus contraseñas reales
const usersToUpdate = [
  { username: 'Ana', password: 'Ana1234!' },
  { username: 'pedro.p', password: 'Pedro5678!' },
  { username: 'carlos.e', password: 'Carlos1234!' },
  { username: 'estudiante2', password: 'Estud1234!' },
  { username: 'psico.laura', password: 'PsicoLaura123!' },
  { username: 'agomez', password: 'Agomez123!' }
];

// Función para actualizar contraseñas
async function updatePasswords() {
  for (const user of usersToUpdate) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(user.password, salt);

      db.query(
        'UPDATE Usuarios SET Contrasena = ? WHERE Usuario = ?',
        [hash, user.username],
        (err, result) => {
          if (err) {
            console.error(`Error actualizando ${user.username}:`, err);
          } else {
            console.log(`${user.username} actualizado correctamente`);
          }
        }
      );
    } catch (error) {
      console.error(`Error generando hash para ${user.username}:`, error);
    }
  }
}

// Ejecutar
updatePasswords().then(() => {
  console.log('Proceso de actualización completado');
  db.end(); // Cierra la conexión a la base de datos
});