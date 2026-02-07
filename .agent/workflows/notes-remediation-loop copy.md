---
description: Main iterative loop for Notes Remediation - executes stories with automated agent handoff and validation gates
auto_execution_mode: 3
---

# Notes Remediation Loop Workflow
// turbo-all

## Overview

This workflow orchestrates the complete remediation of the Notes workspace through
an iterative loop with automated agent handoffs. It processes 8 stories across 3 phases
with validation gates between phases.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  NOTES REMEDIATION LOOP                                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  PHASE 0     │───►│  PHASE 1     │───►│  PHASE 2     │───►│  COMPLETE    │  │
│  │  Immediate   │    │  AI Integ    │    │  Ecosystem   │    │              │  │
│  │  (2 stories) │    │  (3 stories) │    │  (3 stories) │    │              │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────────────┘  │
│         │                   │                   │                               │
│         ▼                   ▼                   ▼                               │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                    STORY EXECUTION LOOP                                   │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │  │
│  │  │ LOAD    │─►│ RESEARCH│─►│IMPLEMENT│─►│ REVIEW  │─►│ UPDATE STATE    │ │  │
│  │  │ STORY   │  │ (MCP)   │  │ (CODE)  │  │ (CHECK) │  │                 │ │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                    VALIDATION GATE (between phases)                       │  │
│  │  • Build: pnpm exec tsc --noEmit && pnpm build                           │  │
│  │  • Test: pnpm test                                                        │  │
│  │  • Manual: Test acceptance criteria                                       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Sprint Change Proposal approved: `SCP-NOTES-2025-12-31`
- Module manifest loaded: `_bmad-output/bmb-creations/notes-remediation-module/module.yaml`
- Development server running: `pnpm dev`

---

## LOOP STATE FILE

Location: `_bmad-output/bmb-creations/notes-remediation-module/LOOP_STATE.yaml`

```yaml
# Notes Remediation Loop State
current_iteration: 0
current_phase: "phase_0"
current_story: null
phase_status:
  phase_0: "IN_PROGRESS"
  phase_1: "PENDING"
  phase_2: "PENDING"
stories:
  NR-01:
    status: "PENDING"
    started_at: null
    completed_at: null
    files_changed: []
    tests_added: []
    review_status: null
  NR-02:
    status: "PENDING"
    started_at: null
    completed_at: null
    files_changed: []
    tests_added: []
    review_status: null
  NR-03:
    status: "PENDING"
    started_at: null
    completed_at: null
    files_changed: []
    tests_added: []
    review_status: null
  NR-04:
    status: "PENDING"
    started_at: null
    completed_at: null
    files_changed: []
    tests_added: []
    review_status: null
  NR-05:
    status: "PENDING"
    started_at: null
    completed_at: null
    files_changed: []
    tests_added: []
    review_status: null
  NR-06:
    status: "PENDING"
    started_at: null
    completed_at: null
    files_changed: []
    tests_added: []
    review_status: null
  NR-07:
    status: "PENDING"
    started_at: null
    completed_at: null
    files_changed: []
    tests_added: []
    review_status: null
  NR-08:
    status: "PENDING"
    started_at: null
    completed_at: null
    files_changed: []
    tests_added: []
    review_status: null
validation_gates:
  phase_0: null
  phase_1: null
  phase_2: null
last_updated: null
completion_signal: false
error_state: null
```

---

## Phase 0: Immediate Fixes

### Story NR-01: Wire AI Service to Agent System

**Agent:** `@bmad-bmm-dev`

**Objective:** Replace placeholder `note-ai-service.ts` with real AI integration.

**Steps:**

1. **Load Context**
   ```
   Read: src/lib/notes/note-ai-service.ts
   Read: src/stores/agents-store.ts
   Read: src/lib/state/provider-store.ts
   Read: src/lib/agent/factory.ts
   ```

2. **Research Required Patterns**
   - Query Context7 for TanStack AI generateText patterns
   - Check existing usage in `src/lib/agent/` for adapter creation

3. **Implement Changes**
   
   Replace `src/lib/notes/note-ai-service.ts`:
   
   ```typescript
   /**
    * @fileoverview Note AI Service
    * @module lib/notes/note-ai-service
    * @story NR-01 - Wire AI Service to Agent System
    * @fixed 2025-12-31 - Connected to real agent system
    */
   
   import { useAgentsStore } from '@/stores/agents-store';
   import { useProviderStore } from '@/lib/state/provider-store';
   import type { Block } from '@blocknote/core';
   
   export interface NoteAIOptions {
       /** Override default active agent */
       agentId?: string;
       /** Context blocks from current note */
       contextBlocks?: Block[];
       /** Override agent's system prompt */
       systemPromptOverride?: string;
   }
   
   /**
    * Generate content for a note based on a prompt
    * @param prompt User's instruction
    * @param options Configuration options
    * @returns Generated text content
    */
   export async function generateNoteContent(
       prompt: string,
       options?: NoteAIOptions
   ): Promise<string> {
       // 1. Get active agent
       const { activeAgentId, getAgent } = useAgentsStore.getState();
       const agentId = options?.agentId || activeAgentId;
       
       if (!agentId) {
           throw new Error('No active agent configured. Please select an agent first.');
       }
       
       const agent = getAgent(agentId);
       if (!agent) {
           throw new Error(`Agent ${agentId} not found in store.`);
       }
       
       // 2. Get provider configuration with API key
       const { providers } = useProviderStore.getState();
       const providerConfig = providers[agent.providerId];
       
       if (!providerConfig?.apiKey) {
           throw new Error(
               `No API key configured for provider "${agent.providerId}". ` +
               `Please add your API key in Settings.`
           );
       }
       
       // 3. Build request
       const systemPrompt = options?.systemPromptOverride || agent.systemPrompt;
       
       // Add context if provided
       let fullPrompt = prompt;
       if (options?.contextBlocks?.length) {
           const contextText = options.contextBlocks
               .map(block => extractBlockText(block))
               .filter(Boolean)
               .join('\n');
           
           if (contextText) {
               fullPrompt = `Context from current note:\n\`\`\`\n${contextText}\n\`\`\`\n\n${prompt}`;
           }
       }
       
       // 4. Call AI via fetch (works in browser)
       const response = await callProviderAPI({
           providerId: agent.providerId,
           modelId: agent.modelId,
           apiKey: providerConfig.apiKey,
           baseUrl: providerConfig.baseUrl,
           systemPrompt,
           userPrompt: fullPrompt,
           temperature: agent.temperature ?? 0.7,
           maxTokens: agent.maxTokens ?? 2048,
       });
       
       return response;
   }
   
   /**
    * Extract text content from a BlockNote block
    */
   function extractBlockText(block: Block): string {
       if (!block.content) return '';
       if (Array.isArray(block.content)) {
           return block.content
               .map(item => (item as any).text || '')
               .join('');
       }
       return '';
   }
   
   /**
    * Call the appropriate provider API
    */
   async function callProviderAPI(params: {
       providerId: string;
       modelId: string;
       apiKey: string;
       baseUrl?: string;
       systemPrompt: string;
       userPrompt: string;
       temperature: number;
       maxTokens: number;
   }): Promise<string> {
       const { providerId, modelId, apiKey, baseUrl, systemPrompt, userPrompt, temperature, maxTokens } = params;
       
       // Determine endpoint based on provider
       let endpoint: string;
       let headers: Record<string, string>;
       let body: object;
       
       switch (providerId) {
           case 'openrouter':
               endpoint = baseUrl || 'https://openrouter.ai/api/v1/chat/completions';
               headers = {
                   'Authorization': `Bearer ${apiKey}`,
                   'Content-Type': 'application/json',
                   'HTTP-Referer': window.location.origin,
                   'X-Title': 'Via-gent Notes'
               };
               body = {
                   model: modelId,
                   messages: [
                       { role: 'system', content: systemPrompt },
                       { role: 'user', content: userPrompt }
                   ],
                   temperature,
                   max_tokens: maxTokens
               };
               break;
               
           case 'openai':
               endpoint = baseUrl || 'https://api.openai.com/v1/chat/completions';
               headers = {
                   'Authorization': `Bearer ${apiKey}`,
                   'Content-Type': 'application/json'
               };
               body = {
                   model: modelId,
                   messages: [
                       { role: 'system', content: systemPrompt },
                       { role: 'user', content: userPrompt }
                   ],
                   temperature,
                   max_tokens: maxTokens
               };
               break;
               
           case 'anthropic':
               endpoint = baseUrl || 'https://api.anthropic.com/v1/messages';
               headers = {
                   'x-api-key': apiKey,
                   'Content-Type': 'application/json',
                   'anthropic-version': '2023-06-01'
               };
               body = {
                   model: modelId,
                   system: systemPrompt,
                   messages: [{ role: 'user', content: userPrompt }],
                   max_tokens: maxTokens
               };
               break;
               
           case 'google':
               endpoint = baseUrl || `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
               headers = { 'Content-Type': 'application/json' };
               body = {
                   contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                   generationConfig: { temperature, maxOutputTokens: maxTokens }
               };
               break;
               
           default:
               // Assume OpenAI-compatible for custom providers
               endpoint = baseUrl || 'https://api.openai.com/v1/chat/completions';
               headers = {
                   'Authorization': `Bearer ${apiKey}`,
                   'Content-Type': 'application/json'
               };
               body = {
                   model: modelId,
                   messages: [
                       { role: 'system', content: systemPrompt },
                       { role: 'user', content: userPrompt }
                   ],
                   temperature,
                   max_tokens: maxTokens
               };
       }
       
       console.log(`[NoteAIService] Calling ${providerId}/${modelId}`);
       
       const response = await fetch(endpoint, {
           method: 'POST',
           headers,
           body: JSON.stringify(body)
       });
       
       if (!response.ok) {
           const error = await response.text();
           console.error('[NoteAIService] API error:', error);
           throw new Error(`AI API error: ${response.status} - ${error}`);
       }
       
       const data = await response.json();
       
       // Extract content based on provider response format
       if (providerId === 'anthropic') {
           return data.content?.[0]?.text || '';
       } else if (providerId === 'google') {
           return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
       } else {
           // OpenAI / OpenRouter format
           return data.choices?.[0]?.message?.content || '';
       }
   }
   ```

4. **Update Loop State**
   ```yaml
   stories:
     NR-01:
       status: "DONE"
       completed_at: "{timestamp}"
       files_changed:
         - "src/lib/notes/note-ai-service.ts"
   ```

5. **Validation**
   ```bash
   pnpm exec tsc --noEmit
   ```
   - Manual: Open /notes, use AI Magic slash command, verify real AI response

---

### Story NR-02: Fix Editor Hot-Reload Reactivity

**Agent:** `@bmad-bmm-dev`

**Objective:** Fix the issue where switching notes doesn't update the editor content.

**Steps:**

1. **Load Context**
   ```
   Read: src/presentation/components/notes/NoteEditor.tsx
   Research: BlockNote documentation on replaceBlocks or editor reinitialization
   ```

2. **Implement Fix**
   
   Option A: Add `key` prop to force remount
   ```typescript
   // In NoteEditor.tsx, change return statement wrapping div:
   return (
       <div key={`note-editor-${noteId}`} className={cn('note-editor', className)}>
           {/* ... existing content ... */}
       </div>
   );
   ```

   Option B: Use replaceBlocks on noteId change
   ```typescript
   // Add useEffect after editor creation (around line 110):
   useEffect(() => {
       if (editor && note?.blocks && note.blocks.length > 0) {
           // Replace all document blocks with new note's blocks
           try {
               const newBlocks = note.blocks as Block[];
               editor.replaceBlocks(editor.document, newBlocks);
           } catch (err) {
               console.warn('[NoteEditor] Failed to replace blocks:', err);
           }
       }
   }, [noteId]); // Only on noteId change, not on editor or blocks change
   ```

3. **Update Loop State**
   ```yaml
   stories:
     NR-02:
       status: "DONE"
       completed_at: "{timestamp}"
       files_changed:
         - "src/presentation/components/notes/NoteEditor.tsx"
   ```

4. **Validation**
   ```bash
   pnpm exec tsc --noEmit
   ```
   - Manual: Create 2 notes with different content, switch between them without refresh

---

### Phase 0 Validation Gate

**Before proceeding to Phase 1:**

```bash
# Build validation
pnpm exec tsc --noEmit && pnpm build

# Test suite
pnpm test

# Manual tests:
# 1. AI Magic returns real AI content (not mock)
# 2. Switching notes shows correct content immediately
# 3. Agent selector is visible in Notes sidebar
```

**Update Loop State:**
```yaml
phase_status:
  phase_0: "DONE"
  phase_1: "IN_PROGRESS"
validation_gates:
  phase_0:
    passed: true
    validated_at: "{timestamp}"
    notes: "Build passes, AI connected, reactivity fixed"
```

---

## Phase 1: AI Integration

### Story NR-03: Connect AgentSelector to AI Service

**Steps:**
1. Modify `AIPromptDialog.tsx` to show selected agent
2. Pass `agentId` to `generateNoteContent()`
3. Subscribe to agent selection events

### Story NR-04: Add Text Selection AI Transform

**Steps:**
1. Create `AITransformMenu.tsx` component
2. Add selection listener in NoteEditor
3. Implement transform actions (summarize, expand, explain, improve, translate)

### Story NR-05: Implement Command Palette AI Actions

**Steps:**
1. Add AI commands to slash menu
2. Implement note-level operations
3. Add progress indicators

---

## Phase 2: Ecosystem Integration

### Story NR-06: Implement Notes → FileSync Binding

**Steps:**
1. Create `NoteFileSyncAdapter` class
2. Implement export/import methods
3. Add menu options

### Story NR-07: Cross-Workspace Note Access

**Steps:**
1. Add note events to event bus
2. Emit from note-store
3. Subscribe in knowledge workspace

### Story NR-08: Markdown Import/Export UI

**Steps:**
1. Create import dialog
2. Add export options
3. Implement batch operations

---

## Completion Signal

When all stories are DONE:

```yaml
completion_signal: true
phase_status:
  phase_0: "DONE"
  phase_1: "DONE"
  phase_2: "DONE"
stories:
  NR-01: { status: "DONE" }
  NR-02: { status: "DONE" }
  NR-03: { status: "DONE" }
  NR-04: { status: "DONE" }
  NR-05: { status: "DONE" }
  NR-06: { status: "DONE" }
  NR-07: { status: "DONE" }
  NR-08: { status: "DONE" }
```

**Post-Completion:**
1. Update `bmm-workflow-status.yaml` with remediation results
2. Close Sprint Change Proposal SCP-NOTES-2025-12-31
3. Run sweeping validation L1-L6

---

## Quick Commands

```bash
# Start the loop
/notes-remediation-loop

# Check status
cat _bmad-output/bmb-creations/notes-remediation-module/LOOP_STATE.yaml

# Validate phase
/validate-phase phase_0

# Skip to story
/notes-story NR-03
```
