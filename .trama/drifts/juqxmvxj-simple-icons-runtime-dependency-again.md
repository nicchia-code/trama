---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#General
proposal: null
task: k8yj60qz
origin: j68hqn2i
option: 2
note: Just update the specs and insert simple icons
resolvedBy: mde5a1t1
created: 2026-10-24T11:20:29.130Z
job: 316a076a-d459-43d3-aefd-75d3ce732a90
---
# Simple Icons runtime dependency again

## What happens

The omp Chat tool logos import the simple-icons package at runtime (extension/src/webview/omp-chat/tool-logo.ts), and package.json lists simple-icons as a dependency. test/specs-icons.test.tsx fails on this: it asserts the panel has no simple-icons runtime dependency.

## What should happen

The Requirements (requirements/tech#General) say the runtime libraries are the ones the Specs list. The committed .trama/specs.yaml does not list simple-icons, and the resolved Drift g54bu2mf (fix-code, Task 1tlibd6x) removed Simple Icons as a runtime dependency. The working-tree .trama/specs.yaml now lists simple-icons for the omp Chat tool logos, which Task j68hqn2i requires. The Specs and the Requirement disagree, and the test still pins the old decision, so the Model and the code cannot both be right until one is chosen.

## Fix options

### Copy the used logos into a local file

Keep the logo paths of the icons used (about 20) in a local TypeScript file, as the Specs logos already are in extension/src/webview/specs/logos.ts, and drop simple-icons from package.json and bun.lock. The test stays as it is. Costs: the logo paths are copied, with the CC0 notice in extension/THIRD-PARTY-NOTICES.md; the specs.yaml entry for simple-icons is removed.

### Keep simple-icons as a runtime dependency

Keep the import in tool-logo.ts and the entry in the Specs, and change the Requirement and the test so that only the Specs panel's own logos must avoid simple-icons. Costs: the package is in the bundle (only the used icons are imported), the resolved Drift g54bu2mf and the 1hil5y6l history stop being the current decision, and the Requirements need a new Proposal.

## Where in the code

extension/src/webview/omp-chat/tool-logo.ts (import from simple-icons); package.json (simple-icons ^16.35.0); test/specs-icons.test.tsx (test 'the panel needs no simple-icons runtime dependency' fails); .trama/specs.yaml (working tree adds simple-icons)

## Prepared question

```json
{
  "question": {
    "id": "juqxmvxj",
    "question": "How should the omp Chat tool logos get their simple-icons paths?",
    "context": "Requirement tech#General says a new runtime library enters only through the Specs. The committed .trama/specs.yaml does not list simple-icons, and the resolved Drift g54bu2mf (fix-code, Task 1tlibd6x) removed Simple Icons as a runtime dependency; history 1hil5y6l records that. The working-tree .trama/specs.yaml lists simple-icons for the omp Chat tool logos, which Task j68hqn2i imports from it. The test test/specs-icons.test.tsx still asserts that the panel has no simple-icons runtime dependency and fails.",
    "options": [
      {
        "label": "Copy the used logos into a local file",
        "description": "Keep the logo paths of the icons used (about 20) in a local TypeScript file, as the Specs logos already are, and drop simple-icons from package.json and bun.lock. The test stays as it is."
      },
      {
        "label": "Keep simple-icons and update the test",
        "description": "Keep the import in tool-logo.ts and the Specs entry; change the test so that only the Specs panel's own logos must avoid simple-icons."
      },
      {
        "label": "Keep simple-icons and close the Drift",
        "description": "Keep the import and the Specs entry as they are, with no change to the Requirement; the Specs already allow it. The old test and the resolved Drift g54bu2mf stay as history."
      }
    ],
    "recommended": 0,
    "multi": false
  },
  "decisions": [
    {
      "decision": "fix-code",
      "option": 1
    },
    {
      "decision": "fix-code",
      "option": 2
    },
    {
      "decision": "dismissed"
    }
  ],
  "fingerprint": "e772079a1898571889010820f537aa6838d5a605c6bb6dad61d4dc98d26b552c",
  "prepared": "2026-10-24T11:21:17.141Z"
}
```
