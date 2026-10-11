---
column: done
technical: false
refs:
  - design-request
  - requirements/rules#design-request
drift: 7lg81jlv
proposal: null
agent: false
created: 2026-10-10T19:15:51.729Z
finished: 2026-10-10T19:21:40.151Z
---
# Fix code to match the Model: Quoted code fence can suppress a real request title

## What happens

requestTitle removes blockquote markers and opens a fence inside the quote, but leaves it open when the quote ends. A following level-one heading outside the quote is ignored, so the fallback title is the quoted fence.

## What should happen

Il titolo della richiesta è il primo titolo di primo livello fuori dai blocchi di codice. Una recinzione dentro una citazione termina quando termina il suo contenitore; il titolo reale successivo deve essere usato.

## Chosen option

**Track Markdown container scope**

Recognize the quote/list container that owns an opening fence and end that fence when the following lines leave its container; keep this title-specific parser small, with an explicit limit for uncommon Markdown structures.

## Where in the code

src/core/design-requests.ts:requestTitle
