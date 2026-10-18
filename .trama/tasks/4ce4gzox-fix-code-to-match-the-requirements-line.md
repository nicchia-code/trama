---
column: done
technical: true
refs:
  - requirements/tech#General
drift: 6hjvct2z
proposal: null
agent: false
created: 2026-10-18T21:13:14.208Z
finished: 2026-10-18T21:19:21.207Z
---
# Fix code to match the Requirements: Line endings not normalized on reads

## What happens

Some files in the project's Trama folder are read without converting Windows line endings to the single line-ending rule the system uses. A short-number file saved with Windows line endings is then read as invalid, so its numbers are reassigned.

## What should happen

Every read of a file in the project's Trama folder converts line endings the same way, at one place, so a checkout with Windows line endings changes no number and no Proposal.

## Chosen option

**Route every read through the shared line-ending helper**

Read the short-number file and the timing records through the same helper used for the other files. Recommended.

## Where in the code

src/core/short-numbers.ts
