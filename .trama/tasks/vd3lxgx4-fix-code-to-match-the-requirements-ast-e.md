---
column: done
technical: true
refs:
  - requirements/rules#prenotazione-file
drift: tgz359km
proposal: null
agent: false
created: 2026-10-24T20:14:27.708Z
finished: 2026-10-24T20:46:11.022Z
---
# Fix code to match the Requirements: ast_edit skips bracketed file paths

## What happens

In a Run, the ast_edit tool names a file by its path. When that path contains square brackets, braces, an asterisk or a question mark, the hook reads it as a pattern. The pattern matches no file, so no claim is taken and the write goes on, even while another sub-agent holds that file.

## What should happen

Each file an ast_edit call names in a Run is claimed under its own name, whatever characters the name has, so another sub-agent is stopped from writing it while its holder works. Only a name with no file of its own is read as a pattern.

## Chosen option

**Claim an existing name as written**

When a name exists as a file of the project, claim it as written and do not read it as a pattern. Read a name as a pattern only when no file has that exact name and it contains a wildcard. This keeps the check cheap and leaves the tool's input unchanged. Cost: a name that is both an existing file and a pattern is claimed as that file only, so its other matches stay unclaimed.

## Where in the code

extension/src/omp/trama-hook.ts: expandGlob (lines 18-22), used for the ast_edit paths in claimOf (line 77)
