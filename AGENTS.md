<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:personal-project-simplicity-rules -->
# Keep the project appropriately simple

This is a personal project, not a workplace or enterprise codebase. Prefer the smallest clear implementation that solves the current requirement.

- Reuse existing types, functions, and patterns instead of creating parallel or duplicate versions.
- Do not add speculative abstractions, extra architectural layers, generalized frameworks, or enterprise-oriented patterns for needs that do not exist yet.
- Add a new type or abstraction only when it provides concrete value to the code being changed now, such as removing real duplication, enforcing a necessary boundary, or making current behavior easier to understand.
- Optimize for readability, directness, and ease of maintenance by one person. Preserve necessary correctness, security, and data integrity without designing for hypothetical scale or teams.
<!-- END:personal-project-simplicity-rules -->

<!-- BEGIN:owner-learning-preference -->
# Teach while implementing

The project owner is a beginner and wants to learn while changes are made.

- Explain the purpose of each meaningful step in plain language, including how data and requests move through the existing stack.
- Break non-trivial implementation work into small checkpoints with a clear way to verify each checkpoint.
- Introduce technical terms when they are useful, but define them on first use.
- Show the important commands and explain what they prove; do not treat tooling output as self-explanatory.
- Point out security or maintenance tradeoffs without adding unnecessary architecture.
<!-- END:owner-learning-preference -->

<!-- BEGIN:post-push-documentation-reconciliation -->
# Reconcile project documentation after every push

After every successful Git push, perform a documentation audit against the state that was pushed.

- Read `dev_notes.md` from beginning to end. Do not rely only on searches, the last edited section, or the files changed in the latest commit.
- Compare the entire file with the pushed repository state, including architecture, implemented features, routes, data flow, scoring and retrieval behavior, environment setup, tests and test counts, known limitations, and roadmap status.
- Correct stale, contradictory, duplicated, or superseded statements. Keep `dev_notes.md` as a current source of truth rather than a chronological change log.
- Review `README.md` when the push changes user-facing capabilities, setup commands, required configuration, public project scope, or other overview information. Update it only when those general, reader-facing details are affected.
- Keep documentation changes factual and proportional. Do not document planned or unverified behavior as completed.
- When an audit finds discrepancies, make a focused documentation follow-up commit and push. That documentation-only follow-up push does not require another audit unless it introduces a substantive documentation change beyond applying the audit.

When a documentation impact is already known before a code push, update the relevant documentation in the same change; the post-push audit remains the final consistency check.
<!-- END:post-push-documentation-reconciliation -->
