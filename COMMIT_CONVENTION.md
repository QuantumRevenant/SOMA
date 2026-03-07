# 📝 Commit Convention Guide

This project uses a **Gitmoji + Conventional Commits** hybrid for better readability and context.

---

## 🎯 Format

```
<gitmoji> <type>(<optional-scope>): <short description>

<optional body>
```

### Examples

```
✨ feat(psicologo): add manual capacity field to appointment slots
🐛 fix(auth): redirect to login on expired token instead of blank page
♻️ refactor(docente): replace sidebar with tab pill navigation
📚 docs(readme): add demo credentials table
```

---

## 🧩 Gitmoji + Types

| Gitmoji | Type | Use case |
|--------:|------|----------|
| ✨ | feat | Add a new feature |
| 🐛 | fix | Fix a bug or unexpected behavior |
| 📚 | docs | Documentation changes only |
| 🎨 | style | Code formatting, no logic change |
| ♻️ | refactor | Code refactoring without feature change |
| ✅ | test | Add or update tests |
| 🔧 | chore | Build scripts, configs, maintenance |
| ⬆️ | build | Dependency or build tool changes |
| 🚀 | perf | Performance improvements |
| 🛡️ | security | Security-related additions or fixes |
| 🔥 | remove | Remove code or files |
| ➕ | add | Add non-code or support files |

---

## 🌐 Scope Reference

Common scopes for this project:

| Scope | Refers to |
|-------|-----------|
| `auth` | Authentication and middleware |
| `docente` | Docente portal (frontend or controller) |
| `estudiante` | Estudiante portal |
| `psicologo` | Psicólogo portal |
| `coordinador` | Coordinador portal |
| `db` | Schema or seed changes |
| `docker` | Docker or Compose configuration |
| `api` | General API or routing changes |

---

## ✍️ Tips

- Keep messages short and meaningful.
- Use **English** for commit messages to maintain international readability — even though the project content is in Spanish.
- Group related changes into a single commit when possible.
- Avoid committing generated files, `.env`, or `node_modules`.
- For more Gitmoji references: [https://gitmoji.dev](https://gitmoji.dev)