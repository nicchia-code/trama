---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#prenotazione-file
proposal: null
task: vd3lxgx4
origin: null
option: 1
note: null
resolvedBy: 1t14il8d
created: 2026-10-24T19:38:16.134Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# ast_edit skips bracketed file paths

## What happens

In a Run, the ast_edit tool names a file by its path. When that path contains square brackets, braces, an asterisk or a question mark, the hook reads it as a pattern. The pattern matches no file, so no claim is taken and the write goes on, even while another sub-agent holds that file.

## What should happen

Each file an ast_edit call names in a Run is claimed under its own name, whatever characters the name has, so another sub-agent is stopped from writing it while its holder works. Only a name with no file of its own is read as a pattern.

## Fix options

### Claim an existing name as written

When a name exists as a file of the project, claim it as written and do not read it as a pattern. Read a name as a pattern only when no file has that exact name and it contains a wildcard. This keeps the check cheap and leaves the tool's input unchanged. Cost: a name that is both an existing file and a pattern is claimed as that file only, so its other matches stay unclaimed.

### Claim the name and its matches

Claim the name as written and also every file its pattern matches, whatever characters the name contains. Nothing is missed, and a file with brackets in its name is claimed by its own name. Cost: a pattern claims a few files more than the tool writes, which can stop a sub-agent that would have written only some of them, until the holder finishes, as it does now.

## Where in the code

extension/src/omp/trama-hook.ts: expandGlob (lines 18-22), used for the ast_edit paths in claimOf (line 77)

## Prepared question

```json
{
  "question": {
    "id": "tgz359km",
    "question": "In a Run, how should an ast_edit file name containing brackets, braces, * or ? be claimed?",
    "context": "In a Run, each file a sub-agent writes is claimed so that no other sub-agent writes it at the same time. The ast_edit tool names files by path, and a name containing `[`, `{`, `*` or `?` is read as a pattern. A file whose own name has such characters (for example `routes/[id].ts`) usually matches no pattern, so no claim is taken and the write goes on even while another sub-agent holds that file.",
    "options": [
      {
        "label": "Claim an existing name as written",
        "description": "A name that is an existing file is claimed as written; only a name with no such file is read as a pattern.",
        "details": "Cheap check, tool input unchanged. A name that is both an existing file and a pattern is claimed as that file only, so its other matches stay unclaimed."
      },
      {
        "label": "Claim the name and its matches",
        "description": "The name is claimed as written and every file its pattern matches is claimed too.",
        "details": "Nothing is missed. A pattern may claim a few files more than the tool writes, which can stop another sub-agent until the holder finishes."
      },
      {
        "label": "Read such names only as patterns",
        "description": "A name with those characters is always a pattern: only the files it matches are claimed, and nothing when it matches none.",
        "details": "No code change. The Requirements say that a bracketed file name can be written without a claim."
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
      "decision": "proposal"
    }
  ],
  "fingerprint": "10a584a5ea9c58d41aa2e0c77b466affabc5695d8492d001b0107679ede6556c",
  "prepared": "2026-10-24T20:09:04.919Z"
}
```
