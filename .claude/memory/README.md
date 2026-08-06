# Memory Directory

This directory stores session memories for Claude agents working on Akros.

## Structure

Each memory file is one learning or decision from a prior session:
- `user_*.md` — about the user, their role, preferences
- `feedback_*.md` — guidance on how to approach work
- `project_*.md` — current project state, deadlines, blockers
- `reference_*.md` — pointers to external systems (APIs, dashboards, docs)

## How memories work

Each session can read prior memories to stay coherent across time. When adding new knowledge, agents create or update files here.

Use `/remember` in Claude Code to save explicitly; otherwise let agents decide what's worth keeping.

---

Indexed in: `.claude/memory/MEMORY.md`
