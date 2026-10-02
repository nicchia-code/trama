# Trama for VS Code

Shows the Trama Model of your project (`.trama/model/`) as a read-only Diagram, its Requirements (`.trama/requirements/`) in a read-only Requirements tab, and a Board of Proposals, Drifts and Tasks. You never edit the Diagram: you ask your coding agent, then approve or reject its Proposals. Requirement files you may also edit by hand; the extension regenerates the `trama-req-*` agent skills whenever they change.

- **Trama: Open** opens the Diagram/Board/Requirements tab (offers **Initialize Project** when the workspace has no `.trama/`).
- **Trama: Design with Agent…**, **Trama: Scan System** and the Design, Scan and Run buttons send a prompt to your agent.
- **Trama: Import from Code** asks your agent to describe the existing code as Proposals (a first one for the System and its Actors, then one per Feature, each requiring the first). They describe the code as it is and list their doubts; approving them starts no Scan.
- **Trama: Update Agent Skills** installs this version's skills into the project, adds the starting Requirement Areas to projects created before they existed, and regenerates the Requirement skills.

Where the prompt goes is set by `trama.agentLauncher`:

- `terminal` (default): runs `trama.agentCommand` in the "Trama agent" terminal, for example `omp {prompt}`, `claude {prompt}`, `codex {prompt}`, `copilot -i {prompt}`; `{prompt}` is replaced by the shell-quoted prompt. A busy terminal is never reused. The terminal has `TRAMA_AGENT=1`, so the agent cannot approve, reject or resolve.
- `chat`: starts a new agent conversation in the editor's chat (Copilot in VS Code) with the prompt. In Cursor, or when the chat is not available, the prompt is copied to the clipboard to paste into the agent panel. Agents in the editor's chat do not get `TRAMA_AGENT`.

Agents run the `trama` CLI, so it must be on their `PATH`. `trama.autoScan` scans the touched Features after a Proposal is approved. `trama.skillsDir` is where Initialize installs the agent skills (`.claude/skills` for Claude Code).

The extension never calls an LLM.
