# Trama for VS Code

Shows the Trama Model of your project (`.trama/model/`) as a read-only Diagram and a Board of Proposals, Drifts and Tasks. You never edit the Diagram: you ask your coding agent, then approve or reject its Proposals.

- **Trama: Open** opens the Diagram/Board tab (offers **Initialize Project** when the workspace has no `.trama/`).
- **Trama: Design with Agent…**, **Trama: Scan System** and the Design, Scan and Run buttons send a prompt to your agent.
- **Trama: Update Agent Skills** installs this version's skills into the project.

Where the prompt goes is set by `trama.agentLauncher`:

- `terminal` (default): runs `trama.agentCommand` in the "Trama agent" terminal, for example `omp {prompt}`, `claude {prompt}`, `codex {prompt}`, `copilot -i {prompt}`; `{prompt}` is replaced by the shell-quoted prompt. A busy terminal is never reused. The terminal has `TRAMA_AGENT=1`, so the agent cannot approve, reject or resolve.
- `chat`: starts a new agent conversation in the editor's chat (Copilot in VS Code) with the prompt. In Cursor, or when the chat is not available, the prompt is copied to the clipboard to paste into the agent panel. Agents in the editor's chat do not get `TRAMA_AGENT`.

Agents run the `trama` CLI, so it must be on their `PATH`. `trama.autoScan` scans the touched Features after a Proposal is approved. `trama.skillsDir` is where Initialize installs the agent skills (`.claude/skills` for Claude Code).

The extension never calls an LLM.
