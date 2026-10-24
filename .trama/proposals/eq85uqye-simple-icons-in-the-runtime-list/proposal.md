---
status: approved
base:
  requirements/tech/general.md: 11e00f78aa0738647a2360c57f88608c2f0a7e3e05b9882a14e8009d49cc5c6c
delete: []
created: 2026-10-24T11:50:18.831Z
label: Simple Icons runtime list
---
# Simple Icons in the runtime list

Drift juqxmvxj chose to keep `simple-icons` as a runtime dependency, for the language and file-type logos of omp Chat's tool rows. The Specs (`specs.yaml`) already list it, but the runtime list in `tech#General` does not name it, so the Requirement contradicts the Specs.

## Changes

- `requirements/tech/general.md`: add `simple-icons` to the runtime libraries, used only by the omp Chat webview for tool-row logos.
- The Specs panel's own logos stay copied in `extension/src/webview/specs/`; they do not import `simple-icons`.

## Already present

- `requirements/tech#General` — `extension/src/webview/omp-chat/tool-logo.ts` already imports `simple-icons`, listed in `.trama/specs.yaml`
