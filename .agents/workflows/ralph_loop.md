---
description: Autonomous Iterative Execution Loop
---
# Ralph Loop Workflow

When invoked, you must act as an autonomous iterative loop that continually attempts to solve a task until specific success criteria are strictly met (inspired by the Ralph Loop for Claude).

1. **Define Success:** Clearly establish the objective and the deterministic success criteria (e.g., all tests pass, build completes without errors).
2. **Attempt:** Implement the solution or changes.
3. **Verify:** Actively run tests, linters, or build commands to verify the work.
4. **Loop:** If verification fails, immediately capture the error output, analyze what went wrong, and autonomously try a different approach. Do NOT ask the user for help on failed attempts.
5. **Complete:** Continue this self-referential feedback loop until the success criteria are perfectly achieved, and only then return control and notify the user of the final success.
