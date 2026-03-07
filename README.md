# SOMA 🎓
**SOMA** (Sistema de Orientación y Monitoreo Académico-Emocional) is a web platform that centralizes academic and psychological information for educational institutions, enabling structured follow-up and coordination between teachers, psychologists, and coordinators.

> ⚠️ The system interface and all content are in **Spanish**, as it is designed for Spanish-speaking educational institutions.

---

## Requirements 📦

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)

That's it. No local Node.js or database installation required.

---

## Installation ⚙️

Clone this repository:

```bash
git clone https://github.com/QuantumRevenant/SOMA.git
cd SOMA
```

Create your environment file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=3000
JWT_SECRET=your_secret_here
DB_ROOT_PASSWORD=root_password
DB_NAME=soma
DB_USER=soma_user
DB_PASSWORD=soma_password
```

---

## Usage 🚀

Start the system:

```bash
docker compose up -d
```

Access the app at `http://localhost:3000`

The database schema and demo data are loaded automatically on first run.

To stop the system:

```bash
docker compose down
```

> **Note:** Data persists in a Docker volume (`db_data`). To reset completely, run `docker compose down -v`.

---

## Demo Credentials 🔑

The system includes demo users for testing. All accounts use the password `1234`.

| Role | Email |
|------|-------|
| Coordinador | coordinador@soma.edu |
| Docente | docente@soma.edu |
| Docente 2 | docente2@soma.edu |
| Psicólogo | psicologo@soma.edu |
| Estudiante | estudiante@soma.edu |
| Estudiante 2 | estudiante2@soma.edu |
| Estudiante 3 | estudiante3@soma.edu |

---

## Key Features 🧩

**Docente**
- Register grades and attendance by section
- Create and manage tutoring slots with capacity control and multi-student assignment
- Write academic observations per student

**Psicólogo**
- Manage appointment availability with configurable capacity
- Maintain psychological observation history per student
- Calendar view of upcoming sessions

**Estudiante**
- Book tutoring sessions and psychological appointments
- View grades by course, evaluation, and academic period
- Track personal attendance history

**Coordinador**
- Manage academic structure: periods, courses, sections, and evaluation templates
- Create and manage institutional workshops
- Filter at-risk students by GPA or attendance thresholds

---

## Tech Stack 🛠️

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 (Alpine) |
| Framework | Express 4 |
| Database | MariaDB 11 |
| Auth | JWT + bcrypt |
| Frontend | HTML5 + CSS3 + Vanilla JS |
| Deploy | Docker + Docker Compose |

---

## Project Report 📄 (Not available yet)

The full project report (in Spanish) will be available in the repository: [`SOMA_Informe.pdf`](./SOMA_Informe.pdf)

It will covers problem analysis, requirements, database design, development, testing, and implementation planning.

---

## Roadmap 🗺️

**v0.3.1** *(upcoming)*
- External chat support bubble (WhatsApp / Telegram redirect)
- Minor UI fixes

**v0.4.0** *(planned)*
- Admin role with user registration and management via UI
- User profile customization and avatar upload
- SMTP email notifications with dev-mode disable flag

---

## License 📝

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

---

## Contact ✉️

[![X (Formerly Twitter)](https://img.shields.io/badge/X_(Twitter)%09--%40QuantumRevenant-%23000000.svg?logo=X&logoColor=white)](https://twitter.com/QuantumRevenant)
[![GitHub](https://img.shields.io/badge/GitHub%09--%40QuantumRevenant-%23121011.svg?logo=github&logoColor=white)](https://github.com/QuantumRevenant)

---

## Contributing 🤝

See [CONTRIBUTING](CONTRIBUTING.md) for guidelines.

---

## Authors 👥

- [QuantumRevenant](https://github.com/QuantumRevenant)

---

## Changelog 📘

See [CHANGELOG](CHANGELOG.md) for the list of updates.