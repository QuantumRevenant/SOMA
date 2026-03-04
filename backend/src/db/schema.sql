-- ============================================================
--  SOMA — Schema v1.2
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
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS periods (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  year      YEAR NOT NULL,
  type      TINYINT NOT NULL COMMENT '0=verano, 1=ciclo1, 2=ciclo2',
  label     VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  starts_at DATE NOT NULL,
  ends_at   DATE NOT NULL,
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
--  PLANTILLAS DE EVALUACIÓN (definidas por coordinador por curso)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluation_templates (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  course_id  INT NOT NULL,
  name       VARCHAR(100) NOT NULL,
  weight     DECIMAL(5,2) NOT NULL,
  created_by INT NOT NULL,
  FOREIGN KEY (course_id)  REFERENCES courses(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ------------------------------------------------------------
--  SECCIONES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_sections (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  course_id  INT NOT NULL,
  period_id  INT NOT NULL,
  docente_id INT NOT NULL,
  section    VARCHAR(10) NOT NULL DEFAULT 'A',
  FOREIGN KEY (course_id)  REFERENCES courses(id),
  FOREIGN KEY (period_id)  REFERENCES periods(id),
  FOREIGN KEY (docente_id) REFERENCES users(id),
  UNIQUE KEY uq_section (course_id, period_id, section)
);

-- ------------------------------------------------------------
--  MATRÍCULAS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  student_id        INT NOT NULL,
  course_section_id INT NOT NULL,
  enrolled_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id)        REFERENCES users(id),
  FOREIGN KEY (course_section_id) REFERENCES course_sections(id),
  UNIQUE KEY uq_enrollment (student_id, course_section_id)
);

-- ------------------------------------------------------------
--  EVALUACIONES (instancia por sección, basada en plantilla o libre)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluations (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  course_section_id   INT NOT NULL,
  template_id         INT NULL COMMENT 'NULL si fue creada libremente por el docente',
  name                VARCHAR(100) NOT NULL,
  weight              DECIMAL(5,2) NOT NULL,
  FOREIGN KEY (course_section_id) REFERENCES course_sections(id),
  FOREIGN KEY (template_id)       REFERENCES evaluation_templates(id)
);

-- ------------------------------------------------------------
--  NOTAS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grades (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT NOT NULL,
  evaluation_id INT NOT NULL,
  score         DECIMAL(5,2) NULL,
  recorded_at   TIMESTAMP NULL,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id),
  FOREIGN KEY (evaluation_id) REFERENCES evaluations(id),
  UNIQUE KEY uq_grade (enrollment_id, evaluation_id)
);

-- ------------------------------------------------------------
--  ASISTENCIA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT NOT NULL,
  date          DATE NOT NULL,
  status        ENUM('presente','ausente','tardanza') NOT NULL,
  recorded_by   INT NOT NULL,
  recorded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id),
  FOREIGN KEY (recorded_by)   REFERENCES users(id),
  UNIQUE KEY uq_attendance (enrollment_id, date)
);

-- ------------------------------------------------------------
--  SLOTS (asesorías y citas psicológicas)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slots (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  owner_id  INT NOT NULL,
  type      ENUM('asesoria','cita_psicologica') NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at   DATETIME NOT NULL,
  capacity  TINYINT NOT NULL DEFAULT 1,
  location  VARCHAR(255),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
--  RESERVAS DE SLOTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slot_bookings (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  slot_id    INT NOT NULL,
  student_id INT NOT NULL,
  booked_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status     ENUM('pendiente','confirmada','cancelada') DEFAULT 'pendiente',
  FOREIGN KEY (slot_id)    REFERENCES slots(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  UNIQUE KEY uq_booking (slot_id, student_id)
);

-- ------------------------------------------------------------
--  TALLERES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workshops (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  coordinator_id INT NOT NULL,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  starts_at      DATETIME NOT NULL,
  ends_at        DATETIME NOT NULL,
  capacity       INT NOT NULL DEFAULT 30,
  location       VARCHAR(255),
  FOREIGN KEY (coordinator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS workshop_enrollments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  workshop_id INT NOT NULL,
  student_id  INT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id),
  FOREIGN KEY (student_id)  REFERENCES users(id),
  UNIQUE KEY uq_workshop_enrollment (workshop_id, student_id)
);

-- ------------------------------------------------------------
--  OBSERVACIONES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS observations (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  author_id  INT NOT NULL,
  student_id INT NOT NULL,
  type       ENUM('docente','psicologo') NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id)  REFERENCES users(id),
  FOREIGN KEY (student_id) REFERENCES users(id)
);

-- ============================================================
--  DATOS DE PRUEBA
-- ============================================================

INSERT IGNORE INTO users (email, password, role, full_name) VALUES
  ('coordinador@soma.edu', '1234', 'coordinador', 'Ana Coordinadora'),
  ('docente@soma.edu',     '1234', 'docente',      'Carlos Docente'),
  ('docente2@soma.edu',    '1234', 'docente',      'Rosa Docente'),
  ('psicologo@soma.edu',   '1234', 'psicologo',    'María Psicóloga'),
  ('estudiante@soma.edu',  '1234', 'estudiante',   'Luis Estudiante'),
  ('estudiante2@soma.edu', '1234', 'estudiante',   'Ana Estudiante'),
  ('estudiante3@soma.edu', '1234', 'estudiante',   'Pedro Estudiante');

INSERT IGNORE INTO periods (year, type, label, is_active, starts_at, ends_at) VALUES
  (2025, 1, '2025-I',  FALSE, '2025-03-01', '2025-07-31'),
  (2025, 2, '2025-II', TRUE,  '2025-08-01', '2025-12-15');

INSERT IGNORE INTO courses (code, name, credits) VALUES
  ('MAT101', 'Matemáticas I',                  4),
  ('COM101', 'Comunicación I',                 3),
  ('INF101', 'Introducción a la Programación', 4),
  ('FIS101', 'Física I',                       4),
  ('QUI101', 'Química General',                3);

-- Plantillas del coordinador para MAT101
INSERT IGNORE INTO evaluation_templates (course_id, name, weight, created_by) VALUES
  (1, 'Práctica Calificada 1', 15.00, 1),
  (1, 'Práctica Calificada 2', 15.00, 1),
  (1, 'Examen Parcial',        30.00, 1),
  (1, 'Examen Final',          40.00, 1);

-- Plantillas para INF101
INSERT IGNORE INTO evaluation_templates (course_id, name, weight, created_by) VALUES
  (3, 'Tarea Académica',  10.00, 1),
  (3, 'Práctica 1',       20.00, 1),
  (3, 'Examen Parcial',   30.00, 1),
  (3, 'Proyecto Final',   40.00, 1);

-- Plantillas para FIS101
INSERT IGNORE INTO evaluation_templates (course_id, name, weight, created_by) VALUES
  (4, 'Laboratorio 1',  20.00, 1),
  (4, 'Examen Parcial', 40.00, 1),
  (4, 'Examen Final',   40.00, 1);

-- Secciones periodo activo (2025-II = id 2)
INSERT IGNORE INTO course_sections (course_id, period_id, docente_id, section) VALUES
  (1, 2, 2, 'A'),  -- MAT101-A → Carlos
  (3, 2, 2, 'A'),  -- INF101-A → Carlos
  (2, 2, 3, 'A'),  -- COM101-A → Rosa
  (4, 2, 2, 'B'),  -- FIS101-B → Carlos
  (1, 1, 2, 'A'),  -- MAT101-A 2025-I → Carlos
  (2, 1, 3, 'A');  -- COM101-A 2025-I → Rosa

-- Matrículas
INSERT IGNORE INTO enrollments (student_id, course_section_id) VALUES
  (5, 1), (5, 2), (5, 4),
  (6, 1), (6, 3),
  (7, 2), (7, 3), (7, 4);

-- Evaluaciones instanciadas desde plantilla para MAT101-A (section 1)
INSERT IGNORE INTO evaluations (course_section_id, template_id, name, weight) VALUES
  (1, 1, 'Práctica Calificada 1', 15.00),
  (1, 2, 'Práctica Calificada 2', 15.00),
  (1, 3, 'Examen Parcial',        30.00),
  (1, 4, 'Examen Final',          40.00);

-- Evaluaciones para INF101-A (section 2)
INSERT IGNORE INTO evaluations (course_section_id, template_id, name, weight) VALUES
  (2, 5, 'Tarea Académica', 10.00),
  (2, 6, 'Práctica 1',      20.00),
  (2, 7, 'Examen Parcial',  30.00),
  (2, 8, 'Proyecto Final',  40.00);

-- Evaluaciones para FIS101-B (section 4)
INSERT IGNORE INTO evaluations (course_section_id, template_id, name, weight) VALUES
  (4, 9,  'Laboratorio 1',  20.00),
  (4, 10, 'Examen Parcial', 40.00),
  (4, 11, 'Examen Final',   40.00);

-- Notas parciales
INSERT IGNORE INTO grades (enrollment_id, evaluation_id, score, recorded_at) VALUES
  (1, 1, 16.00, NOW()),
  (1, 2, 14.50, NOW()),
  (1, 3, 15.00, NOW()),
  (4, 1, 18.00, NOW()),
  (4, 2, 17.00, NOW());

-- Asistencia de prueba
INSERT IGNORE INTO attendance (enrollment_id, date, status, recorded_by) VALUES
  (1, '2025-08-05', 'presente', 2),
  (1, '2025-08-12', 'presente', 2),
  (1, '2025-08-19', 'ausente',  2),
  (1, '2025-08-26', 'tardanza', 2),
  (4, '2025-08-05', 'presente', 2),
  (4, '2025-08-12', 'ausente',  2);

-- Slots
INSERT IGNORE INTO slots (owner_id, type, starts_at, ends_at, capacity, location) VALUES
  (2, 'asesoria',        '2025-09-10 10:00:00', '2025-09-10 12:00:00', 5, 'Aula B-204'),
  (2, 'asesoria',        '2025-09-17 10:00:00', '2025-09-17 12:00:00', 5, 'Aula B-204'),
  (4, 'cita_psicologica','2025-09-11 09:00:00', '2025-09-11 10:00:00', 1, 'Consultorio 3'),
  (4, 'cita_psicologica','2025-09-12 09:00:00', '2025-09-12 10:00:00', 1, 'Consultorio 3');

INSERT IGNORE INTO slot_bookings (slot_id, student_id, status) VALUES (1, 5, 'confirmada');

INSERT IGNORE INTO workshops (coordinator_id, title, description, starts_at, ends_at, capacity, location) VALUES
  (1, 'Taller de Gestión del Tiempo', 'Estrategias para organizar el estudio universitario',
   '2025-09-20 14:00:00', '2025-09-20 17:00:00', 30, 'Auditorio Principal');

INSERT IGNORE INTO workshop_enrollments (workshop_id, student_id) VALUES (1, 5);

INSERT IGNORE INTO observations (author_id, student_id, type, content) VALUES
  (2, 5, 'docente',   'El estudiante muestra buen desempeño pero necesita mejorar puntualidad.'),
  (3, 5, 'docente',   'Participa activamente en clase de Comunicación.'),
  (4, 5, 'psicologo', 'Presenta signos leves de estrés académico. Seguimiento recomendado.');