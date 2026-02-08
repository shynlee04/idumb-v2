/**
 * Brain Paths — single source of truth for all .idumb/ file paths.
 *
 * Unifies the path constants previously duplicated across persistence.ts
 * and state-reader.ts. All consumers import from here.
 *
 * Convention: paths are relative to the project root directory.
 * Consumers join with the project directory before disk I/O.
 */

// ─── Brain Paths ────────────────────────────────────────────────────

export const BRAIN_PATHS = {
  // ─── Current paths ──────────────────────────────────────────────
  state: ".idumb/brain/state.json",
  tasks: ".idumb/brain/tasks.json",
  taskGraph: ".idumb/brain/graph.json",
  delegations: ".idumb/brain/delegations.json",
  planState: ".idumb/brain/plan.json",
  knowledge: ".idumb/brain/knowledge.json",
  codemap: ".idumb/brain/codemap.json",
  projectMap: ".idumb/brain/project-map.json",
  planningRegistry: ".idumb/brain/registry.json",
  config: ".idumb/config.json",

  // ─── Legacy paths (pre-Phase 8 migration) ──────────────────────
  legacy: {
    state: ".idumb/brain/hook-state.json",
    taskGraph: ".idumb/brain/task-graph.json",
    planState: ".idumb/brain/plan-state.json",
  },
} as const

/**
 * Type for the BRAIN_PATHS constant.
 * Useful for consumers that need to iterate or type-check path keys.
 */
export type BrainPaths = typeof BRAIN_PATHS
