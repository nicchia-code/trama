---
column: done
technical: false
refs:
  - project/Not a Trama project
  - project/Trama project
  - requirements/tech#cursor-chat
  - requirements/quality#cursor-chat
drift: null
proposal: "0030"
agent: false
---
# Install Trama's Cursor hooks when the project is initialized and the skills are updated

In Cursor, initializing a project and Update skills also write Trama's entries in the developer's Cursor hooks file `~/.cursor/hooks.json` (`version: 1`), never in the project's:

- one entry for each of `beforeSubmitPrompt`, `stop` and `sessionEnd`, each the command `"<absolute path of the trama program shipped in the extension>" cursor-hook`, which is what marks an entry as Trama's;
- Update skills rewrites them so that they follow this version's program, and reports when the file cannot be written;
- the other entries of the file are left untouched, a missing file is created, a file that is not valid JSON is not rewritten and the developer is told.

Outside Cursor nothing is written.
