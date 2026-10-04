---
column: done
technical: true
refs:
  - requirements/ui#panel
  - requirements/tech#panel
drift: null
proposal: null
agent: false
---
# Give the panel one Markdown renderer for all its prose

The panel can turn a text written in Markdown into readable content, the same way in every tab.

- Paragraphs, headings, **bold**, *italic*, inline code, code blocks, bulleted and numbered lists (nested too), block quotes and links are shown formatted.
- Tables and images are not supported and show as written. Raw HTML is never interpreted: it shows as text, so a text from a file cannot inject markup or script.
- Only http and https links can be followed; they open in the system browser through the editor and show their address as a tooltip. Any other link shows its label as plain text.
- Headings inside a text are never larger than the heading of the place that holds it. Colours and fonts follow the editor's theme, code uses the editor's monospace font, long words wrap and a long code line scrolls inside its own block. Text can be selected.
- A text with malformed Markdown still shows, as written where it cannot be read.
- A variant for one-line list entries renders only inline formatting.
- No new runtime library is added, and the renderer can be tested without a browser page.
