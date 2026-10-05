---
column: done
technical: false
refs:
  - drift
  - requirements/ui#drift
  - requirements/ui#panel
drift: null
proposal: 81fb3342
agent: false
created: 1970-01-01T00:00:00.072Z
---
# Show a Drift's texts as Markdown with a collapsible Where in the code block

In the Diagram's details and on the Board's To decide cards, both sides of a Drift are shown formatted as Markdown.

- When the Drift has a Where in the code text, a collapsible block with that heading sits under the two columns across their whole width, closed when first shown, with its text as Markdown. The block is absent when the Drift has none.
- Opening or closing it changes nothing else and is not part of either Keep this. On the Board it stays as the developer left it during the session, like other cards.
- Keep this buttons, their consequence lines, the disabled state with its warning and the narrow stacking keep working as before.
