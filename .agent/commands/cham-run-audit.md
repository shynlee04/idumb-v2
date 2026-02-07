---
command: cham-run-audit
description: Run complete CHAM full audit workflow
---

# CHAM Run Audit

Execute the complete 5-phase codebase health audit.

## Usage

```
cham-run-audit
```

## Process

1. Discovery phase (Cartographer + Pattern Analyzer)
2. Scanning phase (8 agents in parallel)
3. Synthesis phase (Synthesizer)
4. Remediation phase (interactive cluster fixing)
5. Validation phase (Final Validator + Documenter)

## Output

Status tracked in: `.bmad/custom/src/modules/cham/status/audit-status.json`

## Integration

- Agent: cham-synthesizer
- Workflow: .windsurf/workflows/cham/full-audit.md
