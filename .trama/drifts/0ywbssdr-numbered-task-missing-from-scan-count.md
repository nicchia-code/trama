---
status: resolved
resolution: unified
refs:
  - task/Done
proposal: null
task: null
origin: null
unifiedInto: 88lo546l
option: null
note: null
created: 2026-10-24T19:42:58.844Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# Numbered Task missing from Scan count

## What happens

Clear remembers each Task it deletes after the last global scan, and the Scan System count includes it. When that Task has a numbered identity, the count does not read the memory back for it, so the count comes out one short.

## What should happen

Every Task that Clear deletes after the last global scan keeps counting on the Scan System button until the next global scan, whatever its identity, numbered or not.

## Fix options

### Accept every identity in the memory

Read back every identity Trama writes in the memory of cleared Tasks when counting, numbered or not. Only the reader changes: lines already written are counted at once, with no migration, and nothing that writes the memory changes. The cost is a looser check on each line, which still requires a valid instant and one identity.

### Count lines without identity

Stop deduplicating the memory by identity and count each of its lines written after the last scan, since Clear deletes a Task once and a deleted identity never comes back. The reader then accepts a line with any identity, numbered or not. The cost is that a line written twice, which Clear never does by design, would be counted twice.

## Where in the code

src/core/last-scan.ts, `clearedSince`: the pattern that reads each line of the cleared file accepts only eight-character identities, while a numbered Task has a four-digit identity. src/core/clear-done.ts writes the line for any Task Clear deletes, so the numbered one is remembered and then not counted.

## Prepared question

```json
{
  "question": {
    "id": "0ywbssdr",
    "question": "How should the Scan System count treat a cleared Task with a numbered identity?",
    "context": "When Clear deletes a Done Task that finished after the last global scan, Trama remembers it so the Task keeps counting on the Scan System button until the next global scan. Older Tasks have a numbered identity (four digits) instead of the eight-character one. Clear writes the memory line for a numbered Task too, but the count reads back only eight-character identities, so a cleared numbered Task stops counting and the number comes out one short.",
    "options": [
      {
        "label": "Accept every identity",
        "description": "The count reads back every identity in the memory, numbered or not; lines already written count at once.",
        "details": "Only the reader changes, with no migration. The check on each line becomes looser, but still requires a valid instant and one identity."
      },
      {
        "label": "Count lines without identity",
        "description": "The count stops deduplicating by identity and counts every memory line written after the last scan.",
        "details": "Accepts any identity. A line written twice, which Clear never does by design, would be counted twice."
      },
      {
        "label": "Numbered Tasks stop counting",
        "description": "A cleared Task with a numbered identity stops counting on Scan System; only eight-character identities are remembered for the count.",
        "details": "No code change. The Model and the Requirements say that numbered Tasks are an exception to the memory of cleared Tasks."
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
  "fingerprint": "b38a6bfa4b7692bb37809d20ff8966954fff6e1204c0e180a0a3dc1abce6cf2b",
  "prepared": "2026-10-24T20:08:53.697Z"
}
```
