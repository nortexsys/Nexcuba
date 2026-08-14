# AGENTS.md — OpenSpec instructions for NexCuba

This project uses OpenSpec for spec-driven development. Read `openspec/project.md`
for project context before proposing or implementing changes.

## Workflow (Perfil B — full Specboot flow)

```
enrich-us → propose → apply → verify → adversarial-review → archive → commit
```

- Specs live in `openspec/specs/<capability>/spec.md` (established truth).
- Active work lives in `openspec/changes/<change-id>/`:
  `proposal.md`, `design.md`, `tasks.md`, `specs/<capability>/spec.md` (deltas).
- **Nothing is implemented without an approved spec.** A post-apply fix is a
  spec update first, then code, then re-verify.
- Small tasks, one at a time, in dependency order (`tasks.md`).
- TDD is mandatory (Profile B): failing test first, then implementation.
- Strict TypeScript. Coverage ≥90% before merge to `main`.
- The executor agent never approves its own work; validation is a separate pass.

## Language conventions

- Product-Owner artifacts (proposals, capability specs): **Spanish**.
- Technical artifacts (code, commits, tests, design/tasks docs): **English**.
- UI copy: Spanish (centralized strings module).

## Repo rules

- `.env` and `docs/` are **never committed** (local-only; see `.gitignore`).
- Branches: `main` protected (production), work happens in `change/<slug>` branches.
