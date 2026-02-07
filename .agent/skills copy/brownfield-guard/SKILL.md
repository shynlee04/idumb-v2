---
name: brownfield-guard
description: Enforce canonical paths and prevent file tree anarchy. Use when creating or modifying files to ensure they go to correct locations.
---

# Brownfield Guard

> **TRAP 6 Defense**: Prevent File Tree Anarchy

## Purpose

Before creating or moving any file, verify the path follows project conventions. The canonical path map is defined in architecture decision records (ADRs) - consult the current ADR for path definitions.

## Forbidden Path Patterns

Never create files matching these patterns:

- `src/lib/*` → Use domain or infrastructure directories
- `lib/*` → Use domain or infrastructure directories  
- `src/helpers/*` → Use domain-specific modules
- `src/utils/*.ts` → Move to relevant domain module

## Canonical Path Resolution

Path decisions should reference the project's architecture documentation:
- Check `docs/architecture.md` for layer definitions
- Check ADRs in `docs/adrs/` for path conventions
- Use `AGENTS.md` for quick reference patterns

## Validation Protocol

Before creating/modifying any file:

1. **Path check**: Does it match forbidden patterns? → Block
2. **Convention check**: Does it follow architecture layer rules? → Warn if non-standard
3. **Size check**: Would this file exceed 300 LOC? → Flag for splitting

## Action on Violation

```
⛔ BROWNFIELD GUARD VIOLATION

Path: {path}
Reason: {reason}
Convention source: {architecture_doc_path}

ACTION: Consult architecture documentation for correct path.
```

## Integration

After file operations, verify with governance scripts:
```bash
pnpm governance:imports  # Check import path compliance
pnpm governance:size     # Check file size limits
```

## Key Principle

**Never hardcode path rules in skills.** Path conventions evolve - always reference current architecture documentation which contains dated and versioned decisions.
