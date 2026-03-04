-- ============================================================
--  SOMA — Schema v1.0
-- ============================================================

-- ------------------------------------------------------------
--  USUARIOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('coordinador','docente','estudiante','psicologo') NOT NULL,
  full_name  VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
--  PERIODOS ACADÉMICOS
--  tipo: 0 = verano, 1 = primer ciclo, 2 = segundo ciclo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS periods (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  year       YEAR NOT NULL,
  type       TINYINT NOT NULL COMMENT '0=verano, 1=ciclo1, 2=ciclo2',
  label      VARCHAR(20) NOT NULL COMMENT 'Ej: 2025-I, 2025-II, 2025-V',
  is_active  BOOLEAN DEFAULT FALSE,
  starts_at  DATE NOT NULL,
  ends_at    DATE NOT NULL,
  UNIQUE KEY uq_period (year, type)
);

-- ------------------------------------------------------------
--  CURSOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(20) UNIQUE NOT NULL,
  name        VARCHAR(255) NOT NULL,
  credits     TINYINT NOT NULL DEFAULT 3,
  description TEXT
);

-- ------------------------------------------------------------
--  CURSOS ABIERTOS EN UN PERIODO (sección)
--  Un mismo curso puede tener varias secciones por periodo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_sections (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  course_id   INT NOT NULL,
  period_id   INT NOT NULL,
  docente_id  INT NOT NULL,
  section     VARCHAR(10) NOT NULL DEFAULT 'A',
  FOREIGN KEY (course_id)  REFERENCES courses(id),
  FOREIGN KEY (period_id)  REFERENCES periods(id),
  FOREIGN KEY (docente_id) REFERENCES users(id),
  UNIQUE KEY uq_section (course_id, period_id, section)
);

-- ------------------------------------------------------------
--  MATRÍCULAS (estudiante inscrito en una sección)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  student_id         INT NOT NULL,
  course_section_id  INT NOT NULL,
  enrolled_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id)        REFERENCES users(id),
  FOREIGN KEY (course_section_id) REFERENCES course_sections(id),
  UNIQUE KEY uq_enrollment (student_id, course_section_id)
);

-- ------------------------------------------------------------
--  EVALUACIONES (el docente define el tipo y el peso)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluations (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  course_section_id  INT NOT NULL,
  name               VARCHAR(100) NOT NULL COMMENT 'Ej: Parcial, Final, Práctica 1',
  weight             DECIMAL(5,2) NOT NULL COMMENT 'Porcentaje, ej: 30.00',
  FOREIGN KEY (course_section_id) REFERENCES course_sections(id)
);

-- ------------------------------------------------------------
--  NOTAS (puede ser NULL si aún no se registra)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grades (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id  INT NOT NULL,
  evaluation_id  INT NOT NULL,
  score          DECIMAL(5,2) NULL COMMENT 'NULL = aún no registrada',
  recorded_at    TIMESTAMP NULL,
  FOREIGN KEY (enrollment_id)  REFERENCES enrollments(id),
  FOREIGN KEY (evaluation_id)  REFERENCES evaluations(id),
  UNIQUE KEY uq_grade (enrollment_id, evaluation_id)
);

-- ------------------------------------------------------------
--  SLOTS DE DISPONIBILIDAD
--  Sirve tanto para asesorías (docente) como citas (psicologo)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slots (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  owner_id     INT NOT NULL COMMENT 'docente o psicologo',
  type         ENUM('asesoria','cita_psicologica') NOT NULL,
  starts_at    DATETIME NOT NULL,
  ends_at      DATETIME NOT NULL,
  capacity     TINYINT NOT NULL DEFAULT 1 COMMENT 'Psicólogo casi siempre 1',
  location     VARCHAR(255) COMMENT 'Aula, Meet link, etc.',
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
--  RESERVAS DE SLOTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slot_bookings (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  slot_id     INT NOT NULL,
  student_id  INT NOT NULL,
  booked_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status      ENUM('pendiente','confirmada','cancelada') DEFAULT 'pendiente',
  FOREIGN KEY (slot_id)    REFERENCES slots(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  UNIQUE KEY uq_booking (slot_id, student_id)
);

-- ------------------------------------------------------------
--  TALLERES (creados por coordinador, inscritos por estudiantes)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workshops (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  coordinator_id INT NOT NULL,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  starts_at    DATETIME NOT NULL,
  ends_at      DATETIME NOT NULL,
  capacity     INT NOT NULL DEFAULT 30,
  location     VARCHAR(255),
  FOREIGN KEY (coordinator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS workshop_enrollments (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  workshop_id  INT NOT NULL,
  student_id   INT NOT NULL,
  enrolled_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id),
  FOREIGN KEY (student_id)  REFERENCES users(id),
  UNIQUE KEY uq_workshop_enrollment (workshop_id, student_id)
);

-- ------------------------------------------------------------
--  OBSERVACIONES (docente y psicólogo sobre un estudiante)
--  El estudiante NO puede leer las del psicólogo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS observations (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  author_id    INT NOT NULL COMMENT 'docente o psicologo',
  student_id   INT NOT NULL,
  type         ENUM('docente','psicologo') NOT NULL,
  content      TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id)  REFERENCES users(id),
  FOREIGN KEY (student_id) REFERENCES users(id)
);

-- ============================================================
--  DATOS DE PRUEBA
-- ============================================================

INSERT IGNORE INTO users (email, password, role, full_name) VALUES
  ('coordinador@soma.edu', '1234', 'coordinador', 'Ana Coordinadora'),
  ('docente@soma.edu',     '1234', 'docente',      'Carlos Docente'),
  ('psicologo@soma.edu',   '1234', 'psicologo',    'María Psicóloga'),
  ('estudiante@soma.edu',  '1234', 'estudiante',   'Luis Estudiante');

INSERT IGNORE INTO periods (year, type, label, is_active, starts_at, ends_at) VALUES
  (2025, 1, '2025-I',  FALSE, '2025-03-01', '2025-07-31'),
  (2025, 2, '2025-II', TRUE,  '2025-08-01', '2025-12-15');

INSERT IGNORE INTO courses (code, name, credits) VALUES
  ('MAT101', 'Matemáticas I',   4),
  ('COM101', 'Comunicación I',  3),
  ('INF101', 'Introducción a la Programación', 4);