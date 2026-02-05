# BMAD Builder Research

**Source:** `bmad-code-org/bmad-builder` via repomix  
**Date:** 2026-02-06

## What It Is

A meta-module for BMad Method that creates custom agents, workflows, and modules. NOT a framework itself — it builds framework components.

## Key Concepts Adapted for iDumb

- **Builder with modes:** Create / Edit / Validate — not monolithic
- **Facilitation over generation:** Guides discovery, doesn't generate solutions blindly
- **Step-file architecture:** Micro-files, just-in-time loading, sequential enforcement — prevents doing everything at once
- **Clean module structure:** `module.yaml` + `agents/` + `workflows/`
- **Agent definition format:** YAML with persona, menu, critical_actions, communication_style

## NOT Copied

- Full module/workflow/agent ecosystem — too heavy for our use case
- Slash command system — OpenCode plugin uses tools
- YAML agent format — OpenCode uses markdown agents

## Architecture Notes

- `src/module.yaml` defines module metadata, configurable output folders
- `src/agents/agent-builder.agent.yaml` — "Agent Architecture Specialist + BMAD Compliance Expert"
- `docs/explanation/facilitation-over-generation.md` — core philosophy:
  - Workflows guide users through DISCOVERY processes
  - AI asks questions, helps articulate needs, presents options with tradeoffs
  - Output reflects the user's actual requirements, not generic templates
- Builder agents have Create/Edit/Validate menu triggers
- Module structure: `_bmad/` directory with core/ + installed modules
