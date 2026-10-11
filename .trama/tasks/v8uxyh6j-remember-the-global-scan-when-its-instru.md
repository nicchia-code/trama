---
column: done
technical: false
refs:
  - task
  - requirements/data#task
  - requirements/tech#task
  - requirements/tech#drift-resolution
drift: null
proposal: qhw7a1gg
agent: false
created: 2026-10-11T07:15:36.687Z
finished: 2026-10-11T07:18:24.051Z
---
# Remember the global Scan when its instruction is delivered, not when the check ends

The number on the System Scan buttons returns to zero the moment the developer's press delivers the System scan instruction to the agent: written in the terminal, sent to the chat, left ready in the chat or copied to the clipboard. A press that delivers nothing (command choice cancelled, terminal that does not open, request refused) changes nothing, and a failed write is reported to the developer while the number stays. Today the editor keeps the launch in memory and writes the instant only when a finished 'Scan of the System' check arrives, so the number stays up while the scan runs and does not reset at all when the scan fails, is interrupted or its check is withdrawn. When done, the end of the scan (successful, failed or interrupted) and the delivery or withdrawal of its check change neither the remembered instant nor the number; Tasks that reach Done while the scan runs count; the editor no longer keeps launches of the global scan in memory nor recognises the 'Scan of the System' check for the number; scans of a Feature, the automatic scan after an approval, the end-of-run scan and a scan asked without the button still leave the instant alone.
