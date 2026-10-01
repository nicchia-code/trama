# Trama for VS Code

Shows the Trama Model of your project (`.trama/model/`) as a read-only Diagram and a Board of Proposals, Drifts and Tasks. You never edit the Diagram: you ask your coding agent, then approve or reject its Proposals.

- **Trama: Open** opens the Diagram/Board tab (offers **Initialize Project** when the workspace has no `.trama/`).
- **Trama: Design with Agent…** and **Trama: Scan System** launch your agent in the "Trama agent" terminal.

Set `trama.agentCommand` (for example `claude {prompt}` or `codex {prompt}`); `{prompt}` is replaced by the shell-quoted prompt. `trama.autoScan` scans the touched Features after a Proposal is approved. `trama.skillsDir` is where Initialize installs the agent skills (`.claude/skills` for Claude Code).

The extension never calls an LLM.
