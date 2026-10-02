# Trama

Program from a layered Model of every state your software can be in, plus the Requirements that say how it must be built. Both are plain Markdown in `.trama/`; an agent explores them through tools or a CLI; you review changes as Proposals.

Vocabulary: [CONTEXT.md](./CONTEXT.md). Decisions: [docs/adr](./docs/adr). File format: [docs/model-format.md](./docs/model-format.md). CLI: [docs/cli.md](./docs/cli.md).

## Status

Implemented:
- Model format, validation and the `trama` CLI (exploring, Proposals, Tasks, Drifts, board).
- Agent tools: native VS Code language-model tools for Copilot, and `trama mcp` for Cursor, Claude Code, Codex, omp and any MCP client (ADR 0006). No tool can approve, reject or resolve.
- Requirements beside the Model (ADR 0007): one file per Area in `.trama/requirements/`, sections attached to Model elements, changed through Proposals, delivered to agents as generated `trama-req-<area>` skills and inside `task show` and the element views.
- Three agent skills in [skills/](./skills): `trama-design` (an interview in rounds of questions with recommendations, then a Proposal), `trama-scan` (Model vs code → Tasks and Drifts), `trama-implement` (Task → code, stops on a Drift). `trama init` installs them into `.agents/skills/` (VS Code, Codex, Cursor); `--skills-dir .claude/skills` for Claude Code; `trama skills update` refreshes them.
- The VS Code extension in [extension/](./extension): Diagram, Board, Requirements, and buttons that send prompts to the editor's agent chat or to a terminal agent (`trama.agentLauncher`).
- Packaging: `bun run package` builds a `.vsix` per platform (linux-x64, darwin-arm64) with the CLI inside; tagged releases are built by GitHub Actions.

Not done yet: licensing.

## Develop

```sh
bun install
bun test
bun run typecheck
bun run build          # dist/trama, a single binary
bun run build:extension # extension/dist/{host,webview}.js
bun run harness        # extension/dist/harness.html: the webview in a plain browser, demo data
```

Try it on the example Model:

```sh
cd examples/shop
bun run ../../src/cli/bin.ts machine order
bun run ../../src/cli/bin.ts paths order Draft Shipped
```

`src/core` has no dependency on Bun, so the extension reuses it. `src/cli` is the command line. To run the extension, open `extension/` in VS Code and press F5 after `bun run build:extension`.
