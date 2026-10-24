---
column: done
technical: true
refs:
  - requirements/tech#General
drift: juqxmvxj
proposal: srkyrbvl
agent: false
created: 2026-10-24T11:48:15.866Z
finished: 2026-10-24T11:51:56.366Z
---
# Fix code to match the Requirements: Simple Icons runtime dependency again

## What happens

The omp Chat tool logos import the simple-icons package at runtime (extension/src/webview/omp-chat/tool-logo.ts), and package.json lists simple-icons as a dependency. test/specs-icons.test.tsx fails on this: it asserts the panel has no simple-icons runtime dependency.

## What should happen

The Requirements (requirements/tech#General) say the runtime libraries are the ones the Specs list. The committed .trama/specs.yaml does not list simple-icons, and the resolved Drift g54bu2mf (fix-code, Task 1tlibd6x) removed Simple Icons as a runtime dependency. The working-tree .trama/specs.yaml now lists simple-icons for the omp Chat tool logos, which Task j68hqn2i requires. The Specs and the Requirement disagree, and the test still pins the old decision, so the Model and the code cannot both be right until one is chosen.

## Chosen option

**Keep simple-icons as a runtime dependency**

Keep the import in tool-logo.ts and the entry in the Specs, and change the Requirement and the test so that only the Specs panel's own logos must avoid simple-icons. Costs: the package is in the bundle (only the used icons are imported), the resolved Drift g54bu2mf and the 1hil5y6l history stop being the current decision, and the Requirements need a new Proposal.

## Note

Just update the specs and insert simple icons

## Where in the code

extension/src/webview/omp-chat/tool-logo.ts (import from simple-icons); package.json (simple-icons ^16.35.0); test/specs-icons.test.tsx (test 'the panel needs no simple-icons runtime dependency' fails); .trama/specs.yaml (working tree adds simple-icons)
