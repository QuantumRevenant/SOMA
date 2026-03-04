CREATE TABLE IF NOT EXISTS users (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  email    VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role     ENUM('coordinador','docente','estudiante','psicologo') NOT NULL
);

-- Usuario de prueba (password: 1234)
INSERT IGNORE INTO users (email, password, role) VALUES
  ('docente@soma.edu',      '1234', 'docente'),
  ('estudiante@soma.edu',   '1234', 'estudiante'),
  ('psicologo@soma.edu',    '1234', 'psicologo'),
  ('coordinador@soma.edu',  '1234', 'coordinador');