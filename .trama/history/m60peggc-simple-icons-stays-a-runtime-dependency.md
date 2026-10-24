---
created: 2026-10-24T11:52:14.371Z
updated: 2026-10-24T11:52:59.163Z
summary: Simple Icons stays a runtime dependency for omp Chat tool logos; the Specs panel's own logos stay copied in code and import nothing from it. The Requirement change is in open Proposal eq85uqye.
tasks:
  - k8yj60qz
cleared:
  k8yj60qz:
    title: "Fix code to match the Requirements: Simple Icons runtime dependency again"
    proposal: srkyrbvl
    tag: Chat & panel polish
    finished: 2026-10-24T11:51:56.366Z
    refs:
      - requirements/tech#General
---
# Simple Icons stays a runtime dependency

Drift juqxmvxj chose option 2: keep simple-icons as a runtime dependency. Code, package.json, bun.lock and the Specs entry in .trama/specs.yaml are unchanged. test/specs-icons.test.tsx: the old assertion that the panel needs no simple-icons dependency was replaced by a narrowed test that checks extension/src/webview/specs/icons.tsx and logos.ts do not import simple-icons (regex on the import statement, so the copied-logos header comment is not a false hit). The Requirement change (tech General: simple-icons listed as runtime library for omp Chat tool rows only; Specs logos are copied) is in Proposal eq85uqye, submitted open for developer review. Checks: typecheck clean, full bun test suite 1932 pass 0 fail after the test fix, build and build:extension succeed.
