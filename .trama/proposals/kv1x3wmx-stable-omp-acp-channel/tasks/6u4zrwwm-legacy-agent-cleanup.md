---
technical: true
refs:
  - requirements/tech#project
  - requirements/tech#agent-launching
---
# Remove legacy agent code

Trama supports only omp, run by Trama in the integrated terminal or over ACP in omp Chat. The code and documents that existed only for Cursor, Copilot, Claude Code and older Trama versions go.

When this Task is done:

- The extension no longer cleans up what earlier versions wrote for Copilot: the deletion of `copilot-hooks.json` in `ExtensionContext.globalStorageUri` and of its entry in `chat.hookFilesLocations`, and the deletion of the Copilot user agent definition `~/.copilot/agents/trama-analysis.agent.md`, disappear from activation, from the check at Trama's opening and from Update skills, together with the lines of the Update skills report that mention them. Nothing reads or writes any Copilot or Cursor file.
- `docs/uat.md` no longer has the rows that test removed settings (`trama.agentLauncher`, `trama.terminalAgent`, `trama.agentCommand`, `trama.submitWhileRunning`: rows H18, H19 and Y1 today). The rows about Cursor rules and `CLAUDE.md` as files omp reads stay.
- `docs/adr/0004` says at its top that it is replaced by ADR 0013 (only omp), like ADR 0009 and 0010 already do.
- The files omp itself reads (`CLAUDE.md`, `.cursorrules`, `.cursor/rules/`, `~/.claude/CLAUDE.md`) keep their handling in `src/core/instruction-files.ts` and in the setup wizard: they are not legacy.
- `CHANGELOG.md` records the removal.
