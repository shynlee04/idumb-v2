/**
 * Zod boundary validation schemas for @opencode-ai/sdk types.
 *
 * These schemas validate SDK data at server function return boundaries,
 * catching runtime shape mismatches before they cause cryptic UI errors.
 *
 * Design decisions:
 * - `.passthrough()` everywhere — SDK may add fields between minor versions
 * - Graceful degradation — validation failures log warnings, don't throw
 * - Schemas mirror 11-CONTRACTS.md shapes, NOT hand-rolled approximations
 *
 * @see .planning/phases/11-sdk-type-realignment/11-CONTRACTS.md
 */

import { z } from "zod"

// ─── Part Base Fields ──────────────────────────────────────────────────────
// Every Part has these three identity fields per SDK contract.

const partBase = {
  id: z.string(),
  sessionID: z.string(),
  messageID: z.string(),
}

// ─── Tool State (discriminated on `status`) ────────────────────────────────

const ToolStateSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("pending"),
    input: z.record(z.string(), z.unknown()),
    raw: z.string(),
  }).passthrough(),
  z.object({
    status: z.literal("running"),
    input: z.record(z.string(), z.unknown()),
    title: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    time: z.object({ start: z.number() }).passthrough(),
  }).passthrough(),
  z.object({
    status: z.literal("completed"),
    input: z.record(z.string(), z.unknown()),
    output: z.string(),
    title: z.string(),
    metadata: z.record(z.string(), z.unknown()),
    time: z.object({ start: z.number(), end: z.number() }).passthrough(),
  }).passthrough(),
  z.object({
    status: z.literal("error"),
    input: z.record(z.string(), z.unknown()),
    error: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    time: z.object({ start: z.number(), end: z.number() }).passthrough(),
  }).passthrough(),
])

// ─── Part Schema (12-member discriminated union on `type`) ─────────────────

export const PartSchema = z.discriminatedUnion("type", [
  // TextPart
  z.object({
    ...partBase,
    type: z.literal("text"),
    text: z.string(),
    synthetic: z.boolean().optional(),
    ignored: z.boolean().optional(),
    time: z.object({ start: z.number(), end: z.number().optional() }).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).passthrough(),

  // SubtaskPart (inline anonymous type in SDK — no named export)
  z.object({
    ...partBase,
    type: z.literal("subtask"),
    prompt: z.string(),
    description: z.string(),
    agent: z.string(),
  }).passthrough(),

  // ReasoningPart
  z.object({
    ...partBase,
    type: z.literal("reasoning"),
    text: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    time: z.object({ start: z.number(), end: z.number().optional() }),
  }).passthrough(),

  // FilePart
  z.object({
    ...partBase,
    type: z.literal("file"),
    mime: z.string(),
    filename: z.string().optional(),
    url: z.string(),
  }).passthrough(),

  // ToolPart
  z.object({
    ...partBase,
    type: z.literal("tool"),
    callID: z.string(),
    tool: z.string(),
    state: ToolStateSchema,
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).passthrough(),

  // StepStartPart
  z.object({
    ...partBase,
    type: z.literal("step-start"),
    snapshot: z.string().optional(),
  }).passthrough(),

  // StepFinishPart
  z.object({
    ...partBase,
    type: z.literal("step-finish"),
    reason: z.string(),
    snapshot: z.string().optional(),
    cost: z.number(),
    tokens: z.object({
      input: z.number(),
      output: z.number(),
      reasoning: z.number(),
      cache: z.object({ read: z.number(), write: z.number() }),
    }).passthrough(),
  }).passthrough(),

  // SnapshotPart
  z.object({
    ...partBase,
    type: z.literal("snapshot"),
    snapshot: z.string(),
  }).passthrough(),

  // PatchPart
  z.object({
    ...partBase,
    type: z.literal("patch"),
    hash: z.string(),
    files: z.array(z.string()),
  }).passthrough(),

  // AgentPart
  z.object({
    ...partBase,
    type: z.literal("agent"),
    name: z.string(),
    source: z.object({ value: z.string(), start: z.number(), end: z.number() }).optional(),
  }).passthrough(),

  // RetryPart
  z.object({
    ...partBase,
    type: z.literal("retry"),
    attempt: z.number(),
    error: z.object({ name: z.string(), data: z.record(z.string(), z.unknown()) }).passthrough(),
    time: z.object({ created: z.number() }).passthrough(),
  }).passthrough(),

  // CompactionPart
  z.object({
    ...partBase,
    type: z.literal("compaction"),
    auto: z.boolean(),
  }).passthrough(),
])

// ─── Message Schema (discriminated on `role`) ──────────────────────────────

const messageTimeSchema = z.object({
  created: z.number(),
  completed: z.number().optional(),
}).passthrough()

const UserMessageSchema = z.object({
  id: z.string(),
  sessionID: z.string(),
  role: z.literal("user"),
  time: messageTimeSchema,
  parts: z.array(PartSchema),
  parentID: z.string().optional(),
}).passthrough()

const AssistantMessageSchema = z.object({
  id: z.string(),
  sessionID: z.string(),
  role: z.literal("assistant"),
  time: messageTimeSchema,
  error: z.object({ name: z.string(), data: z.record(z.string(), z.unknown()) }).passthrough().optional(),
  parentID: z.string(),
  modelID: z.string(),
  providerID: z.string(),
  mode: z.string(),
  path: z.object({ cwd: z.string(), root: z.string() }).passthrough(),
  summary: z.boolean().optional(),
  cost: z.number(),
  tokens: z.object({
    input: z.number(),
    output: z.number(),
    reasoning: z.number(),
    cache: z.object({ read: z.number(), write: z.number() }),
  }).passthrough(),
  finish: z.string().optional(),
}).passthrough()

export const MessageSchema = z.discriminatedUnion("role", [
  UserMessageSchema,
  AssistantMessageSchema,
])

// ─── SessionStatus Schema (discriminated on `type`) ────────────────────────
// Per SDK contract: idle | retry | busy (NOT completed/running/error/interrupted)

export const SessionStatusSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("idle") }).passthrough(),
  z.object({
    type: z.literal("retry"),
    attempt: z.number(),
    message: z.string(),
    next: z.number(),
  }).passthrough(),
  z.object({ type: z.literal("busy") }).passthrough(),
])

// ─── Session Schema ────────────────────────────────────────────────────────
// Note: Session does NOT contain `status`. SessionStatus is a separate type
// returned by client.session.status().

export const SessionSchema = z.object({
  id: z.string(),
  projectID: z.string(),
  directory: z.string(),
  parentID: z.string().optional(),
  summary: z.object({
    additions: z.number(),
    deletions: z.number(),
    files: z.number(),
    diffs: z.array(z.object({
      file: z.string(),
      before: z.string(),
      after: z.string(),
      additions: z.number(),
      deletions: z.number(),
    }).passthrough()).optional(),
  }).passthrough().optional(),
  share: z.object({ url: z.string() }).optional(),
  title: z.string(),
  version: z.string(),
  time: z.object({
    created: z.number(),
    updated: z.number(),
    compacting: z.number().optional(),
  }).passthrough(),
  revert: z.object({
    messageID: z.string(),
    partID: z.string().optional(),
    snapshot: z.string().optional(),
    diff: z.string().optional(),
  }).passthrough().optional(),
}).passthrough()

// ─── Validation Helper Functions ───────────────────────────────────────────
// Graceful degradation: log warnings on failure, return data as-is.
// This prevents a schema bug from crashing the entire app.

/**
 * Validate an array of sessions from SDK.
 * On failure: logs warning, returns data unchanged.
 */
export function validateSessionList<T>(data: T): T {
  const result = z.array(SessionSchema).safeParse(data)
  if (!result.success) {
    console.warn(
      "[sdk-validators] Session list validation failed — returning raw data.",
      result.error.issues.slice(0, 3),
    )
  }
  return data
}

/**
 * Validate a single session from SDK.
 * On failure: logs warning, returns data unchanged.
 */
export function validateSession<T>(data: T): T {
  const result = SessionSchema.safeParse(data)
  if (!result.success) {
    console.warn(
      "[sdk-validators] Session validation failed — returning raw data.",
      result.error.issues.slice(0, 3),
    )
  }
  return data
}

/**
 * Validate an array of messages from SDK.
 * On failure: logs warning, returns data unchanged.
 */
export function validateMessages<T>(data: T): T {
  const result = z.array(MessageSchema).safeParse(data)
  if (!result.success) {
    console.warn(
      "[sdk-validators] Message list validation failed — returning raw data.",
      result.error.issues.slice(0, 3),
    )
  }
  return data
}

/**
 * Validate a SessionStatus from SDK.
 * On failure: logs warning, returns data unchanged.
 */
export function validateSessionStatus<T>(data: T): T {
  const result = SessionStatusSchema.safeParse(data)
  if (!result.success) {
    console.warn(
      "[sdk-validators] SessionStatus validation failed — returning raw data.",
      result.error.issues.slice(0, 3),
    )
  }
  return data
}

/**
 * Parse an SSE event data string with basic shape check.
 * Returns typed result instead of `any` from raw JSON.parse.
 */
export function parseSSEEvent(raw: string): { type: string; [key: string]: unknown } | null {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === "object" && parsed !== null && typeof parsed.type === "string") {
      return parsed as { type: string; [key: string]: unknown }
    }
    return null
  } catch {
    return null
  }
}
