---
description: Start KSI (Knowledge Synthesis Integration) module loop for wiring knowledge platform components
---

# KSI Module Loop

Execute Knowledge Synthesis Integration Module course correction.

## Quick Start

1. This workflow initiates the KSI Ralph Loop for integrating knowledge synthesis features
2. Read `_bmad-output/bmb-creations/ksi-module/LOOP_STATE.yaml` for current task
3. Execute using workflows in `_bmad-output/bmb-creations/ksi-module/workflows/`
4. Update state on completion
5. Validate with `pnpm build`
6. Continue until all phases complete

## Phase Overview

| Phase | Name | Est. Hours |
|-------|------|------------|
| 0 | Analysis & Gap Identification | 4h |
| 1 | Source → RAG Wiring | 6h |
| 2 | Synthesis UI Layer | 10h |
| 3 | Chat → RAG Integration | 8h |
| 4 | Canvas Linkage Discovery | 12h |
| 5 | Gemini Multimodal Processing | 8h |
| 6 | Knowledge Matrix Auto-Org | 16h |
| 7 | Final Validation & Demo | 4h |

## Core Gaps to Fix

The module addresses 6 integration gaps:

1. **GAP-001**: Source Import → Orama Index
2. **GAP-002**: ChatPanel → Hybrid Retriever
3. **GAP-003**: Synthesis Button + Service
4. **GAP-004**: Canvas → Linkage Analyzer
5. **GAP-005**: CitationSidebar → Chat
6. **GAP-006**: Knowledge Matrix Auto-Org

## Execution

```bash
# Start the loop
# The agent reads LOOP_STATE.yaml and executes current task
```

## Key Files

- Module Definition: `_bmad-output/bmb-creations/ksi-module/module.yaml`
- Loop State: `_bmad-output/bmb-creations/ksi-module/LOOP_STATE.yaml`
- Integration Gaps: `_bmad-output/bmb-creations/ksi-module/data/integration-gaps.yaml`
- Gemini Prompts: `_bmad-output/bmb-creations/ksi-module/data/gemini-prompts.yaml`

## Completion

Output `<promise>KSI MODULE COMPLETE</promise>` when:
- All 8 phases DONE in LOOP_STATE.yaml
- All 4 use cases validated
- `pnpm build` passes
- Health score ≥80%
