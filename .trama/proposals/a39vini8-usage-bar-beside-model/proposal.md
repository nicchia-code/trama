---
status: approved
base:
  agent-launching/omp-chat-general.md: f8bb984e0b89923d57280c15f4b11e90013c2233aac99d9279e155ed6517b84f
  requirements/ui/omp-chat.md: 263bb17d7b404356652c9a5082a50a1b555dd8863ac908189a5cbb10af2210df
delete: []
request: 2026-10-24T16-14-06
created: 2026-10-24T14:18:01.044Z
label: omp Chat usage
---
# Usage bar beside model

General's subscription usage bar moves from the top of the conversation (under the tabs, above the messages) to the row under the message field, next to the model selector, as the written request asks.

Decisions:
- Position: in the row under the message field, immediately to the right of the model selector, left-aligned with a small gap.
- Narrow views: the bar stays to the right of the selector and its entries wrap onto more lines there; the selector keeps its width.
- Look: same small text, rings and colours, with no border or padding of its own, vertically centred with the selector.
- The compact `Usage` button (chosen model's provider without data, others with data) sits in the same place.
- Unchanged: only in General, never in the jobs' conversations; no data means no bar and no empty space; tooltips, accessible names, dialog and refresh rules stay as they are.
