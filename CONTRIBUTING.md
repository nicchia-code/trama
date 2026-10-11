# Contributing

Thanks for helping with Trama.

## License and CLA

Trama is released under the [GNU AGPL v3](./LICENSE) and is also offered under a commercial license. To keep that possible, every contribution must be covered by a Contributor License Agreement (CLA): before your first pull request is merged you will be asked to sign it.

## Setup

Requires [Bun](https://bun.sh).

```sh
bun install
bun test
bun run typecheck
bun run build            # dist/trama, a single binary
bun run build:extension  # extension/dist/{host,webview}.js
bun run harness          # extension/dist/harness.html: the webview in a plain browser, demo data
bun run package          # a .vsix per platform (linux-x64, darwin-arm64) with the CLI inside
```

If the shell was launched as a Trama agent or by Cursor's chat agent, use `env -u TRAMA_AGENT -u CURSOR_AGENT bun test`: the isolated test fixtures exercise developer-only commands as well.

Try the CLI on the example Model:

```sh
cd examples/shop
bun run ../../src/cli/bin.ts machine order
bun run ../../src/cli/bin.ts paths order Draft Shipped
```

To run the extension, open `extension/` in VS Code and press F5 after `bun run build:extension`.

## Layout

- `src/core`: Model, Requirements, Proposals, Tasks and Drifts. No dependency on Bun, so the extension reuses it.
- `src/cli`: the `trama` command line.
- `extension/`: the VS Code / Cursor extension.
- `skills/`: the agent skills `trama init` installs.
- `docs/`: [file format](./docs/model-format.md), [CLI](./docs/cli.md), [decisions](./docs/adr).

Read [CONTEXT.md](./CONTEXT.md) first: Trama's words (Model, Machine, Proposal, Drift…) have precise meanings, used the same way in code, docs and skills.

## Releases

Pushing a `v*` tag builds and tests the packages on GitHub Actions and attaches them to a prerelease. Note user-visible changes in [CHANGELOG.md](./CHANGELOG.md).
