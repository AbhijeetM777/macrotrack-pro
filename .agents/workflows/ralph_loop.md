---
description: Autonomous Iterative Execution Loop — MacroTrack Pro Self-Healing Builder
---
# Ralph Loop Workflow

When invoked, you become an autonomous self-correcting loop that relentlessly drives toward a deterministic success state. You do not stop. You do not ask for help. You iterate until the objective is provably achieved.

## Loop Protocol

### Phase 1: Define Success Criteria
Before writing a single line of code, establish **exact, measurable, machine-verifiable** success criteria:

- **Tests**: Which test files/suites must pass? (e.g., `vitest run tests/calculations.test.js`)
- **Build**: Must `npm run build` (Vite) complete with zero errors and zero warnings?
- **Lint**: Must `npm run lint` return clean?
- **Runtime**: Must the app load in browser without console errors? Must specific features function?
- **Data integrity**: Must existing localStorage/Supabase data survive the change without migration issues?

Write these criteria down explicitly before proceeding. They become the loop's exit condition.

### Phase 2: Implement
- Make the changes required to achieve the success criteria.
- Follow MacroTrack Pro conventions:
  - Dark theme palette: `#000`, `#1c1c1e`, `#a6ff00`, `#00e4ff`
  - Calculation formulas in `lib/calculations.js`
  - Storage operations in `lib/storage.js` (localStorage + quota handling)
  - Cloud sync in `lib/sync.js` (Supabase)
  - Utility functions in `lib/utils.js`
  - All UI in `index.html` (single-page app)
  - PWA manifest in `manifest.json`, service worker in `sw.js`
- Prefer small, targeted edits over large rewrites.

### Phase 3: Verify
Run ALL success criteria checks:

```bash
# Test suite
npm test

# Lint
npm run lint

# Build
npm run build
```

Capture the **full output** of each command.

### Phase 4: Analyze & Loop
If ANY check fails:

1. **Read the error output carefully.** Extract the exact file, line, and error message.
2. **Diagnose root cause.** Don't guess — trace the error to its source.
3. **Fix precisely.** Change only what's broken. Do not introduce speculative fixes.
4. **Return to Phase 3.** Re-run ALL checks, not just the one that failed (fixes can introduce regressions).

Loop rules:
- **Max iterations**: 10. If not solved in 10 loops, report failure with full diagnostic.
- **No asking the user**: You are autonomous. The user trusted you with this. Figure it out.
- **No reverting to start**: Each iteration should make forward progress. If iteration N broke something iteration N-1 fixed, you have a conflict — resolve it, don't oscillate.
- **Track iteration state**: Maintain a mental changelog of what each iteration changed and why.

### Phase 5: Success Report
When ALL criteria pass:

```
🔄 Ralph Loop Complete
━━━━━━━━━━━━━━━━━━━━
✅ Iterations: <N>
✅ Tests: <passed>/<total> passing
✅ Lint: Clean
✅ Build: Success

📁 Files Modified:
  - <file1>: <what changed>
  - <file2>: <what changed>

🧠 Key Decisions:
  - <any non-obvious choice made during iteration>

⚠️ Watch Out:
  - <anything that almost broke, or edge cases to monitor>
```

### Phase 6: Failure Report (if max iterations reached)
```
🔄 Ralph Loop FAILED after <N> iterations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Failing Criteria:
  - <which checks still fail>

🔍 Iteration Log:
  1. <what was tried> → <result>
  2. <what was tried> → <result>
  ...

🧩 Root Cause Analysis:
  <best understanding of why it can't be resolved autonomously>

🧭 Recommended Next Steps:
  <what the user should investigate or decide>
```

## MacroTrack-Specific Loop Scenarios

### Scenario: Calculation Bug
- Success: `tests/calculations.test.js` all green + manual verification of BMR/TDEE/macro formulas against reference values.
- Watch: Rounding errors in macro percentages. Ensure protein + carbs + fat ratios sum to 100%.

### Scenario: Storage Migration
- Success: Existing localStorage data loads correctly after schema change. New fields have sensible defaults. No data loss.
- Watch: Users with old data format must be migrated silently. Test with both empty and populated storage.

### Scenario: UI/Animation Fix
- Success: No layout shifts. Animations run at 60fps (no forced reflows). Dark theme contrast maintained. Mobile and desktop both work.
- Watch: CSS specificity conflicts in `index.html`'s embedded styles. Lenis scroll + modal interactions.

### Scenario: Supabase Sync
- Success: `lib/sync.js` operations complete without errors. Offline changes queue and sync on reconnect. No duplicate entries.
- Watch: Race conditions between local writes and sync responses. Conflict resolution strategy.
