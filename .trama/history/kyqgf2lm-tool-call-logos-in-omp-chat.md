---
created: 2026-10-24T11:23:02.692Z
updated: 2026-10-24T11:25:25.482Z
summary: Tool call rows in omp Chat show a language or file-type logo when Trama recognises the title or the file, instead of the generic icon.
tasks:
  - j68hqn2i
---
# Tool call logos in omp Chat

Tool call rows in omp Chat, including those inside permission requests, show a logo when the title or the file path identifies a language or file type. Cells prefixed with [py] or [js] lose the prefix and show that language's logo; shell commands keep the terminal icon without the dollar sign. Files read, searched or edited show the logo of their extension, and unknown types keep the generic icon. Each logo has role img and an aria-label with its name, read before the title. The logo paths come from simple-icons, listed in .trama/specs.yaml as approved by Proposal srkyrbvl. The committed Drift g54bu2mf and its History entry predate that Proposal and say simple-icons is not a runtime dependency. Implemented by Task j68hqn2i.
