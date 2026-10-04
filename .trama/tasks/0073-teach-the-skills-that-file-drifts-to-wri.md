---
column: done
technical: true
refs:
  - requirements/rules#drift
  - requirements/tech#drift
drift: null
proposal: null
agent: false
---
# Teach the skills that file Drifts to write at a higher level and to use Where in the code

The skills `trama-scan`, `trama-fix`, `trama-implement` and `trama-import` file Drifts that a developer can read at a glance.

- Both sides describe behaviour in domain words, naming a variable, function, class, field or file only when the difference cannot be understood without it, and then only the one or two that matter, as inline code.
- Code locations go only in the optional Where in the code text (files, and the code element when it helps; no line numbers, no long pieces of code), never in the two sides.
- The texts are short Markdown: short paragraphs, a bulleted list for several points, bold for the one or two key terms, no headings inside a section, no tables, about 100 words per side.
- The instructions that tell the agent how to file a Drift no longer say that What happens holds the place in the code.
