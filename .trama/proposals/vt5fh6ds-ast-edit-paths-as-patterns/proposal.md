---
status: discarded
base:
  requirements/rules/prenotazioni.md: 5a42dcb43e59a8acb1ef15b796531f6af0ae72f499d25fa3ccc135e165370d6e
  requirements/tech/prenotazioni.md: 07b4e0c2eebd6a9c673f73f8b5b2a6bbd51dc2f98e05bcb7dbedd12ba18ee72c
delete: []
created: 2026-10-24T20:08:20.527Z
label: file-claims
---
# ast_edit paths as patterns

Makes the Requirements describe what the code does for Drift tgz359km: in a Run, each path an ast_edit call names that contains `*`, `?`, `[` or `{` is read as a pattern, and only the files it matches are claimed; a pattern that matches no file claims nothing, even when a file has that exact name.
