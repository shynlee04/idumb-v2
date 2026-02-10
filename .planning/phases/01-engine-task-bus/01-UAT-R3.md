---
status: testing
phase: 01-engine-task-bus
source: [01-09-SUMMARY.md, 01-10 execution]
started: 2026-02-10T06:00:00Z
updated: 2026-02-10T06:00:00Z
reverify_round: 3
reverify_reason: "01-09 config proxy + model selector, 01-10 settings page + enhanced indicator"
---

## Current Test

number: 1
name: Settings Page Navigation
expected: |
  Click "Settings" in the sidebar. The Settings page loads with a header ("Settings" with gear icon) and a tab bar showing 4 tabs: Appearance, AI, Connection, Governance. The AI tab is selected by default.
awaiting: user response

## Tests

### 1. Settings Page Navigation
expected: Click "Settings" in the sidebar. The Settings page loads with a header ("Settings" with gear icon) and a tab bar showing 4 tabs: Appearance, AI, Connection, Governance. The AI tab is selected by default.
result: [pending]

### 2. Settings — AI Tab (Providers)
expected: On the AI tab, a "Configured Providers" section shows the providers from your OpenCode config. Each provider displays its name/ID and a badge showing the number of models it has.
result: [pending]

### 3. Settings — AI Tab (Agents)
expected: Below providers, an "Available Agents" section lists agents registered with OpenCode. Each shows name and description (if any).
result: [pending]

### 4. Settings — Connection Tab
expected: Click the "Connection" tab. Shows engine connection status — a green dot with "Connected" if the engine is running, plus details (URL, port, project directory).
result: [pending]

### 5. Settings — Appearance Tab
expected: Click the "Appearance" tab. Shows a "Theme" section with 3 buttons: light, dark, system. The "dark" button is highlighted by default.
result: [pending]

### 6. Settings — Governance Tab
expected: Click the "Governance" tab. Shows 4 governance mode cards in a 2x2 grid: Strict, Standard, Relaxed, Retard. "Standard" is highlighted as the current mode.
result: [pending]

### 7. Engine Indicator — Provider Count
expected: In the sidebar bottom, the engine indicator now shows provider count. If engine is running and providers are configured, it reads "Engine OK · N providers" with a green dot. If no providers, yellow dot with "Engine running · no providers".
result: [pending]

### 8. Model Selector in Chat
expected: In the Chat page, the header area shows a ModelSelector dropdown. Clicking it reveals providers grouped with their models. Selecting a model changes the active selection displayed in the dropdown button.
result: [pending]

### 9. Sidebar Settings Active State
expected: When on the Settings page, the "Settings" link in the sidebar is highlighted (same active styling as Dashboard/Chat/Tasks links).
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0

## Gaps

[none yet]
