---
column: done
technical: true
refs:
  - requirements/data#announcement
  - requirements/rules#announcement
drift: 5c6gvwt1
proposal: null
agent: false
created: 2026-10-23T18:21:38.193Z
finished: 2026-10-23T18:30:00.254Z
unchanged: src/core/announcements.ts has no chat field in the Announcement type, parser or writer; originFromEnv returns only the terminal; parse rejects a file with chat or conversation as an invalid announcement; announcement new refuses to run without TRAMA_TERMINAL.
---
# Fix code to match the Requirements: Chat field still written on announcements

## What happens

Announcements still carry a `chat` field: originFromEnv returns `chat: editor` for agents outside a terminal, and the write path stores `chat` (editor by default, or the given chat) on every announcement that has no terminal.

## What should happen

An announcement has no `chat` or `conversation` field; an agent announcement always belongs to its terminal, and a file that still has `chat` or `conversation` is a read error, not converted.

## Chosen option

**Drop the chat field**

Remove `chat` from the announcement type, the parser and the writer; refuse announcements without TRAMA_TERMINAL; treat a file that still has `chat` or `conversation` as an invalid announcement.

## Where in the code

src/core/announcements.ts
