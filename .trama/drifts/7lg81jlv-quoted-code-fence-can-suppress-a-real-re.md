---
status: open
resolution: null
refs:
  - design-request
  - requirements/rules#design-request
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: null
created: 2026-10-10T18:47:36.056Z
---
# Quoted code fence can suppress a real request title

## What happens

requestTitle removes blockquote markers and opens a fence inside the quote, but leaves it open when the quote ends. A following level-one heading outside the quote is ignored, so the fallback title is the quoted fence.

## What should happen

Il titolo della richiesta è il primo titolo di primo livello fuori dai blocchi di codice. Una recinzione dentro una citazione termina quando termina il suo contenitore; il titolo reale successivo deve essere usato.

## Fix options

### Track Markdown container scope

Recognize the quote/list container that owns an opening fence and end that fence when the following lines leave its container; keep this title-specific parser small, with an explicit limit for uncommon Markdown structures.

### Parse Markdown block structure

Track nested blockquote and list structure when finding fenced code boundaries, so title extraction follows Markdown container termination across nested cases; this covers more syntax at the cost of more code in requestTitle.

## Where in the code

src/core/design-requests.ts:requestTitle
