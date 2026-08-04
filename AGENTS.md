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
