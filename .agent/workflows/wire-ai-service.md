---
description: Wire note-ai-service.ts to the actual AI agent system
story_id: NR-01
priority: P0
effort_hours: 4
---

# Wire AI Service Workflow

## Objective

Replace the placeholder `note-ai-service.ts` with a real implementation that:
1. Reads the active agent from `useAgentsStore`
2. Gets the API key from `useProviderStore`
3. Calls the actual AI provider API
4. Returns real generated content

## Prerequisites

- [ ] Agents store has at least one agent configured
- [ ] Provider store has at least one provider with API key
- [ ] Development server is running

## Steps

### Step 1: Analyze Current Implementation

```bash
# View current implementation
cat src/lib/notes/note-ai-service.ts
```

**Current Issues:**
- Returns hardcoded mock content after 1.5s delay
- No import of agent/provider stores
- No API call implementation

### Step 2: Research Dependencies

**Files to understand:**
- `src/stores/agents-store.ts` - Agent configuration, activeAgentId
- `src/lib/state/provider-store.ts` - Provider configs, API keys
- `src/lib/agent/factory.ts` - Adapter creation pattern

**Key APIs:**
```typescript
// From agents-store
useAgentsStore.getState().activeAgentId
useAgentsStore.getState().getAgent(id)

// From provider-store
useProviderStore.getState().providers[providerId]
```

### Step 3: Implement New Service

**Target file:** `src/lib/notes/note-ai-service.ts`

**New Implementation:**

```typescript
/**
 * @fileoverview Note AI Service - Real Implementation
 * @module lib/notes/note-ai-service
 * @story NR-01 - Wire AI Service to Agent System
 * @fixed 2025-12-31
 */

import { useAgentsStore } from '@/stores/agents-store';
import { useProviderStore } from '@/lib/state/provider-store';
import type { Block } from '@blocknote/core';

export interface NoteAIOptions {
    agentId?: string;
    contextBlocks?: Block[];
    systemPromptOverride?: string;
}

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
        throw new Error(`Agent ${agentId} not found.`);
    }
    
    // 2. Get provider config
    const { providers } = useProviderStore.getState();
    const providerConfig = providers[agent.providerId];
    
    if (!providerConfig?.apiKey) {
        throw new Error(
            `No API key for provider "${agent.providerId}". Add key in Settings.`
        );
    }
    
    // 3. Build context
    let fullPrompt = prompt;
    if (options?.contextBlocks?.length) {
        const contextText = options.contextBlocks
            .map(b => extractBlockText(b))
            .filter(Boolean)
            .join('\n');
        if (contextText) {
            fullPrompt = `Context:\n\`\`\`\n${contextText}\n\`\`\`\n\n${prompt}`;
        }
    }
    
    // 4. Call provider API
    const systemPrompt = options?.systemPromptOverride || agent.systemPrompt;
    
    return await callProviderAPI({
        providerId: agent.providerId,
        modelId: agent.modelId,
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl,
        systemPrompt,
        userPrompt: fullPrompt,
        temperature: agent.temperature ?? 0.7,
        maxTokens: agent.maxTokens ?? 2048,
    });
}

function extractBlockText(block: Block): string {
    if (!block.content) return '';
    if (Array.isArray(block.content)) {
        return block.content.map(item => (item as any).text || '').join('');
    }
    return '';
}

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
    
    let endpoint: string;
    let headers: Record<string, string>;
    let body: object;
    
    // Provider-specific configuration
    switch (providerId) {
        case 'openrouter':
            endpoint = baseUrl || 'https://openrouter.ai/api/v1/chat/completions';
            headers = {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
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
            endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
            headers = { 'Content-Type': 'application/json' };
            body = {
                contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                generationConfig: { temperature, maxOutputTokens: maxTokens }
            };
            break;
            
        default:
            // OpenAI-compatible fallback
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
        throw new Error(`AI API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract content based on provider response format
    if (providerId === 'anthropic') {
        return data.content?.[0]?.text || '';
    } else if (providerId === 'google') {
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
        return data.choices?.[0]?.message?.content || '';
    }
}
```

### Step 4: Test Implementation

```bash
# TypeScript validation
pnpm exec tsc --noEmit

# Manual test:
# 1. Open /notes
# 2. Create a note
# 3. Type /ai or /magic in editor
# 4. Enter a prompt
# 5. Verify real AI content appears (not mock)
```

### Step 5: Update State

After successful implementation, update LOOP_STATE.yaml:

```yaml
stories:
  NR-01:
    status: "DONE"
    completed_at: "2025-12-31T..."
    files_changed:
      - "src/lib/notes/note-ai-service.ts"
```

## Acceptance Criteria Checklist

- [ ] AI Magic slash command produces real AI content (not mock)
- [ ] Selected agent's model is used for generation
- [ ] API key from provider store is used
- [ ] Error messages shown if no agent/key configured
- [ ] Console logs show actual AI call, not mock (look for `[NoteAIService] Calling ...`)

## Rollback Plan

If issues occur, revert to mock implementation:
```bash
git checkout HEAD -- src/lib/notes/note-ai-service.ts
```
