---
status: approved
kind: import
base:
  system.md: 05084671cc9e67e42d3b6696fb4b8c3fc816c4f21b6712412c7a2d9a2b84c698
  actors/developer.md: new
  actors/agent.md: new
  actors/terminal.md: new
  actors/workspace.md: new
  requirements/tech.md: 81abc6e97936a8ebee76d5c724c5013136e745295c4a6fbdc3db4cacd776d51f
  requirements/data.md: 997eafdc320cf9d3e58506cd9499ec9983bb28c286890e5f0827f54b8305a315
delete: []
created: 1970-01-01T00:00:00.001Z
---
# Import: System and Actors

Describes Trama itself as the System, from the repository's README, CONTEXT.md, docs/ and ADRs, the manifests (package.json, tsconfig.json, extension/package.json) and the code under src/, extension/src, skills/, scripts/ and .github/. Adds the System description, the four Actors that emit Events (developer, agent, terminal, workspace), and the General sections of the tech and data Requirements.

## Doubts

- `examples/shop` was selected for import but it is a complete Trama project of its own (a sample Model and Requirements, copied by `scripts/harness.ts:16` and used by the README and `docs/uat.md`). It is data, not behaviour of Trama, so it is only mentioned in the `tech` Requirements and not modelled.
- `scripts/` (build, packaging, harness, demo agent) and `.github/workflows/release.yml` are build and release tooling: they feed the `tech` Requirements only; no Machine was derived from them. `WATCHDOG.yml` (an advisor model name) is not documented anywhere and was ignored.
- `extension/package.json:10` declares the minimum editor version `^1.95.0`, while `package.json:22` types the editor API against `@types/vscode ^1.138.0`: the code could use APIs newer than the declared minimum (for example the terminal shell-execution events used in `extension/src/host/agent.ts:47-52`). Not determined whether 1.95 provides them.
- The Actor `terminal` and its Event COMMAND_ENDED rest on the editor's shell-integration events (`extension/src/host/agent.ts:44-52`); whether every supported editor and shell reports them was not determined.
