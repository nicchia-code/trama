---
status: approved
base:
  system.md: b532daa7581ce4301e20931b3c5812f49c37b0ca069a4e2d51e7f5c9f7cc663d
  actors/agent.md: 6219c45c98ecd3198b5bc95e2c4e12d08d43f53bcbe63e1f09212e4994a4e6d4
  work/task.md: 2ec11efc38b0e51b801c8352f1c463ede9b02a6266203995199c8def78e9519d
  agent-questions/feature.md: c423e6f311a4e94a262ee3602bdd56dca584d1c089bca6843d042d2ddd3d3146
  requirements/tech.md: 984c24c76a25a1e1e212ed13cb4548b138b46b55398da100ca69f9a2248ea98b
  requirements/rules.md: e70c775d5a390e1fe9e2a1f8eb9e7c2b4c969caaf5ec86b65380e6735651856d
  requirements/ui.md: 3cc98878f4bcde151d0f71827697dc377f0c1983bf0c2decb639011dad7da74d
delete: []
---
# Remove MCP and the agent tools: agents use the command line only

Trama stops serving agent tools over MCP and stops registering them as VS Code language-model tools. Every agent, in Copilot, Cursor or a terminal, reaches Trama through the command line, and asks the developer with `trama ask`. Decisions from the interview: the native VS Code tools go too (not only `trama mcp`); in Cursor the extension just stops writing .cursor/mcp.json and leaves any existing entry alone; the developer-only guard keeps relying on TRAMA_AGENT, so outside Trama's terminal it does not hold (accepted, ADR 0005); an agent outside Trama's terminal still does not take a Task (accepted); the question title always names `trama ask`.
