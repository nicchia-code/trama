# Trama for VS Code

Shows the Trama Model of your project (`.trama/model/`) as a read-only Diagram, its Requirements (`.trama/requirements/`) in a read-only Requirements tab, and a Board of Proposals, Drifts and Tasks. Descriptions, Requirements, Proposal bodies, Task bodies and Drift texts are shown as Markdown. You never edit the Diagram: you ask your coding agent, then approve or reject its Proposals. Requirement files you may also edit by hand; the extension regenerates the `trama-req-*` agent skills whenever they change.

- **Trama: Open** opens the Diagram/Board/Requirements tab (offers **Initialize Project** when the workspace has no `.trama/`).
- **Trama: Design with Agent…**, **Trama: Scan System** and the Design, Scan and Run buttons send a prompt to your agent.
- **Trama: Import from Code** asks your agent to describe the existing code as Proposals (a first one for the System and its Actors, then one per Feature, each requiring the first). They describe the code as it is and list their doubts; approving them starts no Scan.
- **Trama: Update Agent Skills** installs this version's skills into the project, adds the starting Requirement Areas to projects created before they existed, and regenerates the Requirement skills.

Where the prompt goes is set by `trama.agentLauncher`:

- `terminal` (default): runs `trama.agentCommand` in the "Trama agent" terminal, for example `omp {prompt}`, `claude {prompt}`, `codex {prompt}`, `copilot -i {prompt}`; `{prompt}` is replaced by the shell-quoted prompt. A busy terminal is never reused; reuse also requires the same project and question endpoint. The terminal has `TRAMA_AGENT=1`, so the agent cannot approve, reject or resolve, and `TRAMA_QUESTION_ENDPOINT` routes its question rounds back to the launching window.
- `chat`: starts a new agent conversation in the editor's chat (Copilot in VS Code) with the prompt. In Cursor, or when the chat is not available, the prompt is copied to the clipboard to paste into the agent panel. Agents in the editor's chat do not get `TRAMA_AGENT`.

Agents run the `trama` CLI, so it must be on their `PATH`. `trama.autoScan` scans the touched Features after a Proposal is approved. `trama.skillsDir` is where Initialize installs the agent skills (`.claude/skills` for Claude Code).

## Agent questions

Agents use `trama_ask`, registered natively for Copilot and through MCP for Cursor and terminal clients. Without agent tools, `trama ask --root <project>` accepts the same JSON request on stdin; see the [request and result contract](https://github.com/nicchia-code/trama/blob/main/docs/cli.md#question-rounds).

The active round opens immediately at the top of the window in native Quick Picks, one question at a time. Recommendations are active or checked on the first visit; Back restores preceding answers. Other opens an input box and can accompany ordinary multi-choice selections. Empty free text shows validation feedback. Escape offers **Skip this one**, **Skip all** or **Go back**, never a silent skip. Focus loss does not dismiss the controls.

Each window has one FIFO shared by all three surfaces, with no response deadline. Caller cancellation removes only that round. Closing the window, losing its channel, or removing its project interrupts every admitted active and queued round with `editor-interrupted`, disposes the controls and returns no partial answers. The agent must stop its workflow without fallback or retry. Initial editor absence instead returns `unavailable`, allowing its own question interface.

Local discovery chooses the most recently focused live window for the project unless a launching endpoint was supplied. Its records contain no question content and stay outside the repository. Unix sockets and Windows named pipes are user-private; Windows requires its built-in Windows PowerShell 5.1/.NET Framework bridge, not an additional runtime library.

The extension never calls an LLM.
