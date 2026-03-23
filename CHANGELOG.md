# Changelog
All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.1] - 2025-03-23

### Added
- ➕ `frontend/public/js/chat-widget.js` — self-contained support bubble widget, injected via JS (no per-page HTML duplication)
- ➕ `frontend/public/js/config.js` — centralized frontend configuration (`SOMA_CONFIG`), controls support link, label and target across all portals
- ➕ Psicólogo: student panel redesigned with 5 grouped sections by recency (next 24h, upcoming, last month, last 3 months, older), collapsible, with student deduplication by priority
- ➕ Docente: drag-and-drop reordering of evaluation types with persistent `position` column in DB
- ➕ Docente: weight normalization button — adjusts all evaluation weights proportionally to 100%
- ➕ Docente: popup for editing evaluations (replaces native `prompt()`)
- ➕ Docente: popup for editing observations (replaces native `prompt()`)
- ➕ Coordinador: `pedirConfirm()` modal ported — replaces native `confirm()` and `alert()` calls
- ➕ Coordinador: datetime system for talleres — 15-min step picker, Google Calendar-style start/end sync, time validation
- ➕ Demo users expanded: 6 students (estudiante4–6) with historical appointment seeds covering all recency groups
- ➕ `Dockerfile` elevated to project root — frontend bundled into image, no volume mount needed
- ➕ `SOMA_Informe.pdf` — full project report (in Spanish) included in repository

### Changed
- ♻️ `db.js`: removed `dateStrings` and `timezone` — mysql2 now returns native Date objects, serialized as ISO UTC by `JSON.stringify`; frontend parses with plain `new Date(dt)` without manual offset handling
- ♻️ Psicólogo/Docente/Coordinador: all datetime inputs use `step="900"` (15-min blocks); `toLocalISOWithOffset` sends offset-aware strings to backend; `toMySQLDatetime` stores UTC in MariaDB
- ♻️ Docente/Coordinador: `ORDER BY starts_at ASC` for asesorías and talleres — upcoming first
- ♻️ Coordinador: `pct_asistencia` recalculated via independent subquery — fixes inflation caused by cross-join with evaluations
- ♻️ `docker-compose.yml`: `build` points to project root; frontend volume mount removed
- ♻️ `backend/src/app.js`: `express.static` paths updated to `../../frontend/public` to match new Docker layout
- ♻️ `popup-confirm` moved to end of DOM in docente and coordinador portals with `z-index: 1100` — fixes confirm modal rendering behind other popups

### Fixed
- 🐛 Docente: `popup-confirm` was rendering behind `popup-asistencia` when attendance warning triggered
- 🐛 Docente: slot delete blocked by FK constraint on `slot_bookings` — now deletes bookings before slot
- 🐛 Psicólogo: tab switch did not reload data — now reloads on every tab activation
- 🐛 Psicólogo/Docente: datetime inputs showed wrong hour due to UTC misinterpretation — fixed by dropping `dateStrings` in pool config
- 🐛 Coordinador: attendance percentage incorrectly inflated when student had multiple evaluations — fixed with subquery
- 🐛 Coordinador: native `confirm()` and `alert()` replaced with styled `pedirConfirm()` modal

---

## [0.3.0] - 2025-12-08

### Added
- ✨ Coordinador portal: full academic structure management (periods, courses, sections, evaluation templates)
- ✨ Coordinador portal: workshop creation and management with capacity and external expositor support
- ✨ Coordinador portal: at-risk student filtering by GPA and attendance thresholds with configurable settings per coordinator
- ✨ Docente portal: multi-student chip assignment for tutoring slots with capacity enforcement
- ✨ Psicólogo portal: manual capacity field for appointment slots
- ✨ Psicólogo portal: multi-student chip assignment matching docente pattern
- ✨ Past-date validation on slot creation (both asesoría and cita) — frontend and backend
- ✨ Slot editing allowed without date restriction to permit error corrections
- ✨ Batch INSERT for slot bookings via `student_ids[]` array
- ✨ `capacity` field added to edit popup for citas psicológicas

### Changed
- ♻️ Docente portal: full structural refactor — sidebar removed, tab pills, inline forms replaced with modal popups
- ♻️ Unified CSS design system across all 4 portals: logo, avatar, buttons, tabs, popups, welcome banner
- ♻️ All native `confirm()` and `alert()` replaced with custom `pedirConfirm()` modal
- ♻️ `getMisCitas`: `capacity` added to SELECT and response map
- ♻️ `crearSlot`: `capacity` no longer hardcoded to 1

---

## [0.2.0] - 2025-12-08

Final university presentation version. First functional version with real backend and database.

### Added
- ✨ JWT authentication with role-based access control and `bcrypt` password hashing
- ✨ Docente portal: grade registration by evaluation type, attendance tracking via modal popup, academic observations per student
- ✨ Psicólogo portal: psychological evaluations, session history, weekly availability grid, scheduled appointments view
- ✨ Estudiante portal: course cards with grade breakdown and resource access, appointment booking UI, calendar of upcoming activities, notifications panel
- ✨ MySQL database with normalized schema: users, roles, courses, sections, enrollments, grades, attendance, observations, appointments
- ✨ REST API with Express, single-file entry point (`server.js`), CommonJS modules

### Known issues at release
- 🐛 Student could view appointment availability but could not complete booking (RF2 failed)
- 🐛 Docente grade and observation write operations failing on frontend (RF4 partially broken)
- 🐛 No Coordinador role or portal
- 🐛 No Docker — manual setup required

---

## [0.1.0] - 2025-11-01

Static prototype presented in class. No backend, no real data — all content simulated in the frontend.

### Added
- ➕ Fully static HTML/CSS/JS interfaces for Psicólogo, Estudiante, and Docente portals
- ➕ Navigable prototype deployable on GitHub Pages
- ➕ Login page with role selector (Docente, Psicólogo, Estudiante)
- ➕ Simulated data for courses, grades, appointments, and observations
- ➕ Initial database schema design (conceptual, not implemented)
- ➕ UI mockups for all portals