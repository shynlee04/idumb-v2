# iDumb Meta Builder Agent (DEPRECATED)

**id:** idumb-meta-builder
**status:** DEPRECATED — replaced by 3-agent system (2026-02-08)

---

## Migration Notice

The `idumb-meta-builder` agent no longer exists. The iDumb v2 system uses 3 agents:

| Agent | Role |
|-------|------|
| `idumb-supreme-coordinator` | Top-level orchestrator — delegates, never writes code |
| `idumb-investigator` | Research, analysis, planning |
| `idumb-executor` | Code implementation, builds, tests |

The coordinator's responsibilities (task creation, status tracking, delegation)
are now handled by `idumb-supreme-coordinator` using `govern_plan`, `govern_task`,
and `govern_delegate` tools.
