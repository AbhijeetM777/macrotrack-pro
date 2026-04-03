---
description: Extreme Focus Mode — MacroTrack Pro Rapid Execution
---
# Get Shit Done (GSD) Workflow

When invoked, enter extreme focus mode. You are building MacroTrack Pro — the best fitness macro tracking PWA on the internet. No conversation. No hedging. Ship it.

## Execution Rules

### 1. Instant Breakdown
- Decompose the objective into atomic, ordered steps within 10 seconds of receiving it.
- Each step must be a single tool call or a tight sequence of 2-3 dependent calls.
- Identify which MacroTrack files are touched: `index.html`, `lib/calculations.js`, `lib/storage.js`, `lib/sync.js`, `lib/utils.js`, `sw.js`, `server.js`, `manifest.json`.
- If the task spans multiple files, batch independent edits in parallel.

### 2. Zero-Permission Execution
- Execute all steps automatically. Do NOT ask for permission between steps.
- Only pause if an action is **destructive** (deleting user data, dropping Supabase tables, force-pushing) or **ambiguous** (multiple valid interpretations of the request).
- If a step fails, diagnose immediately and retry with a different approach. Do not report failures unless 3 attempts have been exhausted.

### 3. MacroTrack-Aware Decisions
When making implementation choices, always prefer:
- **Offline-first**: LocalStorage/IndexedDB before Supabase calls.
- **Performance**: Canvas over SVG for charts. CSS transforms over JS animation. Debounced inputs.
- **Mobile-first**: Touch targets >= 44px. Bottom sheets over centered modals. Safe area insets.
- **Dark theme**: All new UI must use the existing palette — `#000`, `#1c1c1e`, `#a6ff00`, `#00e4ff`, `#f2f2f7`, `#8a8a8e`.
- **Regional food data**: New food items must include full macro breakdown (calories, protein, carbs, fat, fiber, sugar, sodium) and be categorized by cuisine.

### 4. Quality Gates (Auto-Run)
After completing the objective, automatically:
- [ ] Run `npm test` — all tests must pass.
- [ ] Run `npm run lint` — zero errors.
- [ ] Verify the change works in the PWA flow (check `sw.js` cache list if new assets added).
- [ ] Confirm no hardcoded secrets, API keys, or PII in committed code.
- [ ] If UI changed, verify dark theme contrast and mobile layout.

### 5. Communication Protocol
- **During execution**: Complete silence. No status updates. No "let me..." preamble.
- **On completion**: Single concise report:
  ```
  ✅ DONE: <what was built/fixed>
  📁 Files: <list of changed files>
  ⚠️ Notes: <anything the user should know, or "None">
  ```
- **On failure (after 3 attempts)**:
  ```
  ❌ BLOCKED: <what failed>
  🔍 Tried: <approaches attempted>
  🧭 Next: <recommended path forward>
  ```

### 6. Speed Priorities
When trade-offs arise:
1. **Working > Perfect** — Ship functional code, refine later.
2. **User-facing > Internal** — Visible improvements first, plumbing second.
3. **Core tracking > Nice-to-haves** — Macro logging, food search, and charts are sacred. Gamification and social features are secondary.
4. **Existing patterns > New abstractions** — Match the codebase's current style. Don't introduce new frameworks or patterns without explicit instruction.
