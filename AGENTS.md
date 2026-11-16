# Homeji frontend

## Agent skills

### Issue tracker

Track issues and PRDs in GitHub Issues for `fogit-hd/EXE101_Homeji`. External pull requests are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context layout: root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

### Ponytail (Full)

For implementation, fixes, refactors, code reviews, and dependency choices, apply [Ponytail Full](https://github.com/DietrichGebert/ponytail/blob/main/skills/ponytail/SKILL.md).

- Inspect the affected callers, contracts, configuration, and tests before editing. Fix bugs at their shared source.
- Make the smallest complete change. Reuse the repo's components, services, and conventions, then consider built-ins and existing dependencies.
- Preserve input validation, security, accessibility, and error handling that protects data. Verify the affected flows and add a focused check for new nontrivial logic.

### Design skills

Installed for this repo's Cursor agent. Routing and the stack lock live in `.cursor/rules/design-skills.mdc`.

- **impeccable** 4.8.2 from [pbakaus/impeccable](https://github.com/pbakaus/impeccable): `.cursor/skills/impeccable`, plus subagents in `.cursor/agents` and the design hook in `.cursor/hooks.json`. Refresh with `npx impeccable update`.
- **design-taste-frontend** (taste-skill 2.5.1) from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill): `.agents/skills/design-taste-frontend`.
- **motion** (Motion AI Kit) from [motiondivision/ai-kit](https://github.com/motiondivision/ai-kit): `.agents/skills/motion`. Free docs MCP is `https://mcp.motion.dev` in `.cursor/mcp.json`.

`skills-lock.json` records the taste and motion installs. `.cursor/skills` and `.agents/skills` stay local.
