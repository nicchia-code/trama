---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
drift: null
proposal: "0021"
agent: false
---
# Let the developer choose the language the agent writes in

The editor has a setting where the developer types a language, empty by default. While it holds something other than spaces, every instruction Trama sends to the agent ends, on the same line, with the sentence asking it to write everything it generates in that language, except code, which always stays in English; the language is the typed text, trimmed, as typed. This holds for every instruction and both launchers: design, fix, scan of a Feature or of the whole System, import, implement, implement all, implement a design, the rework of a stale Proposal and the scan that follows an approval. The setting is read each time an instruction is sent, so changing it affects the next one; with it empty or only spaces the instruction is exactly as before. The language is not saved in the project, and the editor's own interface stays in English.
