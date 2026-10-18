---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#General
proposal: null
task: 4ce4gzox
origin: null
critical: false
option: 1
note: null
resolvedBy: 456gwpy9
created: 2026-10-18T20:39:22.008Z
---
# Line endings not normalized on reads

## What happens

Some files in the project's Trama folder are read without converting Windows line endings to the single line-ending rule the system uses. A short-number file saved with Windows line endings is then read as invalid, so its numbers are reassigned.

## What should happen

Every read of a file in the project's Trama folder converts line endings the same way, at one place, so a checkout with Windows line endings changes no number and no Proposal.

## Fix options

### Route every read through the shared line-ending helper

Read the short-number file and the timing records through the same helper used for the other files. Recommended.

### Exempt machine-only files from the rule in the Requirements

Keep those reads as they are and record in the Requirements that machine-only files are exempt, a developer decision.

## Where in the code

src/core/short-numbers.ts
