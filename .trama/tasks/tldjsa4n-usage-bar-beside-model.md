---
column: done
technical: false
refs:
  - omp-chat-general
  - requirements/ui#omp-chat-general
drift: null
proposal: a39vini8
agent: false
created: 2026-10-24T14:39:22.541Z
finished: 2026-10-24T14:49:36.388Z
---
# Usage bar beside model

The subscription usage of General moves from above the messages to the row under the message field, right beside the model selector. When done, the following holds.

- Under the message field of General, the usage bar sits in the same row as the model selector (`ui#omp-chat-conversation`), immediately to its right, left-aligned with a small gap between the two. Above the messages there is no bar any more.
- The bar keeps its small text, rings and colours, but has no border and no padding of its own, and is vertically centred with the selector.
- The selector keeps its width. When the entries do not fit in the space to the right of the selector, they wrap onto more lines, always there to the right of it, and the row grows taller. The bar never drops below the selector and the view never scrolls sideways.
- When the provider of the chosen model has no data but other providers do, the bar holds only the compact `Usage` button (lucide `Gauge` icon) that opens the same dialog, in the same place to the right of the selector.
- With no data at all there is no bar and no empty space: under the field there is only the selector.
- Unchanged: the bar appears only in General, never in the conversations of jobs (which share the same composer, so the bar must be mounted only for General); tooltips, accessible names, the dialog and its refresh rules stay as they are.

Hints in the code:

- `UsageBar` in `extension/src/webview/omp-chat/usage.tsx`: its outer `data-usage-bar` element carries `border-b px-3 py-1` (drop border and padding); the entries button uses `flex-1 flex-wrap` and must wrap inside the space right of the selector; the doc comment still says "under the tabs".
- `Conversation` in `extension/src/webview/omp-chat/conversation.tsx` mounts `UsageBar` as the first child of the tab panel when `item.general`; that mount moves into the composer row.
- `Composer` in the same file is shared by every conversation; its model `Combobox` (`h-7 w-48 text-xs`) is alone on its row today and becomes the start of a row holding selector and bar (selector must not shrink).
- The test "the bar sits under the tabs and over the messages of General…" in `test/omp-chat-usage-webview.test.tsx` checks the bar is the first child of the panel and has `border-b`; update it to the new position (in the row of the model selector, right of it, under the message field, no border) while still checking that the conversations of jobs have no bar.
