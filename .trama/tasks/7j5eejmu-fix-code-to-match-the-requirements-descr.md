---
column: done
technical: true
refs:
  - requirements/ui#General
  - requirements/ui#panel/Settings
drift: ddymt9ri
proposal: idthe088
agent: false
created: 2026-10-22T05:10:32.766Z
finished: 2026-10-22T05:11:25.581Z
---
# Fix code to match the Requirements: Descrizione oltre il limite

## What happens

The setting `trama.ignoreInstructionFiles` would carry the description fixed by the Requirement: 181 characters, two sentences. The existing check on manifest descriptions allows 170 and fails on it.

## What should happen

The tooltip rule says the description of a setting, shown in the «i» bubble, is at most two short sentences of about 160 characters. The Requirement for the Agent terminal fixes a text that exceeds it, so two Requirements disagree.

## Chosen option

**Shorten the description**

Rewrite the Requirement text under 170 characters, keeping the meaning (omp, the four file kinds, off by default). The check stays as it is.

## Where in the code

extension/package.json, `trama.ignoreInstructionFiles`; test/settings-schema.test.ts, the description length check.
