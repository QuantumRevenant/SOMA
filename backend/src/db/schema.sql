-- ============================================================
--  SOMA — Schema v1.3
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
--  PLANTILLAS DE EVALUACIÓN
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
--  EVALUACIONES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluations (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  course_section_id   INT NOT NULL,
  template_id         INT NULL,
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

-- ------------------------------------------------------------
--  NOTIFICACIONES (preparado para uso futuro)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  type       VARCHAR(50) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  body       TEXT NOT NULL,
  read_at    TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
--  DATOS DE PRUEBA
-- ============================================================

-- Usuarios (password: 1234)
INSERT IGNORE INTO users (email, password, role, full_name) VALUES
  ('coordinador@soma.edu', '$2a$10$M0cKElr.7X9wonS1Q8yVw.cnzLxbbNQZDQ6.vVy6590/0fG0dkWNu', 'coordinador', 'Ana Coordinadora'),
  ('docente@soma.edu',     '$2a$10$M0cKElr.7X9wonS1Q8yVw.cnzLxbbNQZDQ6.vVy6590/0fG0dkWNu', 'docente',      'Carlos Docente'),
  ('docente2@soma.edu',    '$2a$10$M0cKElr.7X9wonS1Q8yVw.cnzLxbbNQZDQ6.vVy6590/0fG0dkWNu', 'docente',      'Rosa Docente'),
  ('psicologo@soma.edu',   '$2a$10$M0cKElr.7X9wonS1Q8yVw.cnzLxbbNQZDQ6.vVy6590/0fG0dkWNu', 'psicologo',    'María Psicóloga'),
  ('estudiante@soma.edu',  '$2a$10$M0cKElr.7X9wonS1Q8yVw.cnzLxbbNQZDQ6.vVy6590/0fG0dkWNu', 'estudiante',   'Luis Estudiante'),
  ('estudiante2@soma.edu', '$2a$10$M0cKElr.7X9wonS1Q8yVw.cnzLxbbNQZDQ6.vVy6590/0fG0dkWNu', 'estudiante',   'Ana Estudiante'),
  ('estudiante3@soma.edu', '$2a$10$M0cKElr.7X9wonS1Q8yVw.cnzLxbbNQZDQ6.vVy6590/0fG0dkWNu', 'estudiante',   'Pedro Estudiante');

-- Periodos: uno pasado, uno activo
INSERT IGNORE INTO periods (year, type, label, is_active, starts_at, ends_at) VALUES
  (2025, 1, '2025-I',  FALSE, DATE_SUB(CURDATE(), INTERVAL 9 MONTH), DATE_SUB(CURDATE(), INTERVAL 5 MONTH)),
  (2025, 2, '2025-II', TRUE,  DATE_SUB(CURDATE(), INTERVAL 4 MONTH), DATE_ADD(CURDATE(), INTERVAL 2 MONTH));

-- Cursos
INSERT IGNORE INTO courses (code, name, credits) VALUES
  ('MAT101', 'Matemáticas I',                  4),
  ('COM101', 'Comunicación I',                 3),
  ('INF101', 'Introducción a la Programación', 4),
  ('FIS101', 'Física I',                       4),
  ('QUI101', 'Química General',                3);

-- Plantillas MAT101
INSERT IGNORE INTO evaluation_templates (course_id, name, weight, created_by) VALUES
  (1, 'Práctica Calificada 1', 15.00, 1),
  (1, 'Práctica Calificada 2', 15.00, 1),
  (1, 'Examen Parcial',        30.00, 1),
  (1, 'Examen Final',          40.00, 1);

-- Plantillas INF101
INSERT IGNORE INTO evaluation_templates (course_id, name, weight, created_by) VALUES
  (3, 'Tarea Académica', 10.00, 1),
  (3, 'Práctica 1',      20.00, 1),
  (3, 'Examen Parcial',  30.00, 1),
  (3, 'Proyecto Final',  40.00, 1);

-- Plantillas FIS101
INSERT IGNORE INTO evaluation_templates (course_id, name, weight, created_by) VALUES
  (4, 'Laboratorio 1',  20.00, 1),
  (4, 'Examen Parcial', 40.00, 1),
  (4, 'Examen Final',   40.00, 1);

-- Secciones ciclo actual (period 2) y pasado (period 1)
INSERT IGNORE INTO course_sections (course_id, period_id, docente_id, section) VALUES
  (1, 2, 2, 'A'),  -- MAT101-A actual  → Carlos  (id=1)
  (3, 2, 2, 'A'),  -- INF101-A actual  → Carlos  (id=2)
  (2, 2, 3, 'A'),  -- COM101-A actual  → Rosa    (id=3)
  (4, 2, 2, 'B'),  -- FIS101-B actual  → Carlos  (id=4)
  (1, 1, 2, 'A'),  -- MAT101-A pasado  → Carlos  (id=5)
  (2, 1, 3, 'A');  -- COM101-A pasado  → Rosa    (id=6)

-- Matrículas (Luis=5, Ana=6, Pedro=7)
INSERT IGNORE INTO enrollments (student_id, course_section_id) VALUES
  (5, 1), (5, 2), (5, 4),   -- Luis: MAT101, INF101, FIS101 (actual)
  (5, 5), (5, 6),            -- Luis: MAT101, COM101 (pasado)
  (6, 1), (6, 3),            -- Ana: MAT101, COM101 (actual)
  (7, 2), (7, 3), (7, 4);   -- Pedro: INF101, COM101, FIS101 (actual)

-- Evaluaciones MAT101-A actual
INSERT IGNORE INTO evaluations (course_section_id, template_id, name, weight) VALUES
  (1, 1, 'Práctica Calificada 1', 15.00),
  (1, 2, 'Práctica Calificada 2', 15.00),
  (1, 3, 'Examen Parcial',        30.00),
  (1, 4, 'Examen Final',          40.00);

-- Evaluaciones INF101-A actual
INSERT IGNORE INTO evaluations (course_section_id, template_id, name, weight) VALUES
  (2, 5, 'Tarea Académica', 10.00),
  (2, 6, 'Práctica 1',      20.00),
  (2, 7, 'Examen Parcial',  30.00),
  (2, 8, 'Proyecto Final',  40.00);

-- Evaluaciones FIS101-B actual
INSERT IGNORE INTO evaluations (course_section_id, template_id, name, weight) VALUES
  (4, 9,  'Laboratorio 1',  20.00),
  (4, 10, 'Examen Parcial', 40.00),
  (4, 11, 'Examen Final',   40.00);

-- Evaluaciones MAT101-A pasado (libres, sin template)
INSERT IGNORE INTO evaluations (course_section_id, template_id, name, weight) VALUES
  (5, NULL, 'Examen Parcial', 40.00),
  (5, NULL, 'Examen Final',   60.00);

-- Evaluaciones COM101-A pasado
INSERT IGNORE INTO evaluations (course_section_id, template_id, name, weight) VALUES
  (6, NULL, 'Trabajo Grupal', 40.00),
  (6, NULL, 'Examen Final',   60.00);

-- Notas ciclo actual (Luis: enrollment 1=MAT101, 2=INF101, 3=FIS101)
INSERT IGNORE INTO grades (enrollment_id, evaluation_id, score, recorded_at) VALUES
  (1, 1, 16.00, NOW()),   -- Luis MAT101 PC1
  (1, 2, 14.50, NOW()),   -- Luis MAT101 PC2
  (1, 3, 15.00, NOW()),   -- Luis MAT101 Parcial
  (2, 5, 18.00, NOW()),   -- Luis INF101 Tarea
  (2, 6, 17.00, NOW()),   -- Luis INF101 Práctica
  (6, 1, 18.00, NOW()),   -- Ana  MAT101 PC1
  (6, 2, 17.50, NOW());   -- Ana  MAT101 PC2

-- Notas ciclo pasado (Luis: enrollment 4=MAT101pasado, 5=COM101pasado)
INSERT IGNORE INTO grades (enrollment_id, evaluation_id, score, recorded_at) VALUES
  (4, 13, 14.00, NOW()),  -- Luis MAT101-pasado Parcial
  (4, 14, 16.00, NOW()),  -- Luis MAT101-pasado Final
  (5, 15, 15.00, NOW()),  -- Luis COM101-pasado Trabajo
  (5, 16, 13.00, NOW());  -- Luis COM101-pasado Final

-- Asistencia ciclo actual (Luis en MAT101, últimas semanas)
INSERT IGNORE INTO attendance (enrollment_id, date, status, recorded_by) VALUES
  (1, DATE_SUB(CURDATE(), INTERVAL 28 DAY), 'presente', 2),
  (1, DATE_SUB(CURDATE(), INTERVAL 21 DAY), 'presente', 2),
  (1, DATE_SUB(CURDATE(), INTERVAL 14 DAY), 'ausente',  2),
  (1, DATE_SUB(CURDATE(), INTERVAL 7  DAY), 'tardanza', 2),
  (1, DATE_SUB(CURDATE(), INTERVAL 2  DAY), 'presente', 2),
  (6, DATE_SUB(CURDATE(), INTERVAL 28 DAY), 'presente', 2),
  (6, DATE_SUB(CURDATE(), INTERVAL 21 DAY), 'ausente',  2),
  (6, DATE_SUB(CURDATE(), INTERVAL 14 DAY), 'presente', 2);

-- Slots de asesoría (Carlos Docente) — próximas semanas
-- slot 1: cap 2, lleno (Luis + Ana)
-- slot 2: cap 3, 1 libre (Luis + Pedro)
-- slot 3 y 4: cap 5, libres
INSERT IGNORE INTO slots (owner_id, type, starts_at, ends_at, capacity, location) VALUES
  (2, 'asesoria', DATE_ADD(NOW(), INTERVAL 2  DAY), DATE_ADD(NOW(), INTERVAL 2  DAY) + INTERVAL 2 HOUR, 2, 'Aula B-204'),
  (2, 'asesoria', DATE_ADD(NOW(), INTERVAL 5  DAY), DATE_ADD(NOW(), INTERVAL 5  DAY) + INTERVAL 2 HOUR, 3, 'Aula B-204'),
  (2, 'asesoria', DATE_ADD(NOW(), INTERVAL 9  DAY), DATE_ADD(NOW(), INTERVAL 9  DAY) + INTERVAL 2 HOUR, 5, 'Aula B-204'),
  (2, 'asesoria', DATE_ADD(NOW(), INTERVAL 12 DAY), DATE_ADD(NOW(), INTERVAL 12 DAY) + INTERVAL 2 HOUR, 5, 'Aula B-204');

-- Slots de cita psicológica (María Psicóloga) — próximas semanas
INSERT IGNORE INTO slots (owner_id, type, starts_at, ends_at, capacity, location) VALUES
  (4, 'cita_psicologica', DATE_ADD(NOW(), INTERVAL 1  DAY), DATE_ADD(NOW(), INTERVAL 1  DAY) + INTERVAL 1 HOUR, 1, 'Consultorio 3'),
  (4, 'cita_psicologica', DATE_ADD(NOW(), INTERVAL 3  DAY), DATE_ADD(NOW(), INTERVAL 3  DAY) + INTERVAL 1 HOUR, 1, 'Consultorio 3'),
  (4, 'cita_psicologica', DATE_ADD(NOW(), INTERVAL 6  DAY), DATE_ADD(NOW(), INTERVAL 6  DAY) + INTERVAL 1 HOUR, 1, 'Consultorio 3'),
  (4, 'cita_psicologica', DATE_ADD(NOW(), INTERVAL 8  DAY), DATE_ADD(NOW(), INTERVAL 8  DAY) + INTERVAL 1 HOUR, 1, 'Consultorio 3'),
  (4, 'cita_psicologica', DATE_ADD(NOW(), INTERVAL 10 DAY), DATE_ADD(NOW(), INTERVAL 10 DAY) + INTERVAL 1 HOUR, 1, 'Consultorio 3');

-- Reservas de asesorías
INSERT IGNORE INTO slot_bookings (slot_id, student_id, status) VALUES
  (1, 5, 'confirmada'),  -- Luis  en asesoría +2 días (slot cap=2, quedan 1)
  (1, 6, 'confirmada'),  -- Ana   en asesoría +2 días (slot cap=2, LLENO)
  (2, 5, 'confirmada'),  -- Luis  en asesoría +5 días (slot cap=3, quedan 1)
  (2, 7, 'confirmada'),  -- Pedro en asesoría +5 días (slot cap=3, quedan 1)
  (5, 5, 'confirmada');  -- Luis  en cita psicológica +1 día

-- Talleres futuros
INSERT IGNORE INTO workshops (coordinator_id, title, description, starts_at, ends_at, capacity, location) VALUES
  (1, 'Taller de Gestión del Tiempo',
   'Estrategias para organizar el estudio universitario',
   DATE_ADD(NOW(), INTERVAL 4 DAY), DATE_ADD(NOW(), INTERVAL 4 DAY) + INTERVAL 3 HOUR,
   30, 'Auditorio Principal'),
  (1, 'Taller de Técnicas de Estudio',
   'Métodos de aprendizaje activo y mapas mentales',
   DATE_ADD(NOW(), INTERVAL 11 DAY), DATE_ADD(NOW(), INTERVAL 11 DAY) + INTERVAL 3 HOUR,
   25, 'Sala de Conferencias B'),
  (1, 'Manejo del Estrés Universitario',
   'Herramientas para afrontar la presión académica',
   DATE_ADD(NOW(), INTERVAL 18 DAY), DATE_ADD(NOW(), INTERVAL 18 DAY) + INTERVAL 2 HOUR,
   20, 'Auditorio Principal');

-- Luis inscrito en primer taller
INSERT IGNORE INTO workshop_enrollments (workshop_id, student_id) VALUES (1, 5);

-- Observaciones
INSERT IGNORE INTO observations (author_id, student_id, type, content) VALUES
  (2, 5, 'docente',   'El estudiante muestra buen desempeño pero necesita mejorar puntualidad.'),
  (2, 6, 'docente',   'Ana demuestra excelente comprensión de los temas. Muy participativa.'),
  (3, 5, 'docente',   'Participa activamente en clase de Comunicación.'),
  (4, 5, 'psicologo', 'Presenta signos leves de estrés académico. Seguimiento recomendado.'),
  (4, 5, 'psicologo', 'Segunda sesión: mejora notable en manejo de ansiedad ante exámenes.');