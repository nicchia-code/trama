---
column: done
technical: false
refs:
  - panel/Diagram
  - requirements/ui#panel
drift: kru3ylyg
proposal: null
agent: false
created: 2026-10-11T06:59:04.479Z
finished: 2026-10-11T07:04:23.821Z
---
# Fix code to match the Model: Diagram Scan button shows the finished-Tasks number at Machine and State levels, where it scans a Feature

## What happens

In the Diagram bar, while a **Machine** or a **State** is shown, the button is labelled `Scan · N` when N Tasks finished since the last System scan, with the tooltip about the last scan of the System. Pressing it, however, scans only the **Feature** that contains that Machine. The number and tooltip appear at the System level and at Machine and State levels alike; only the Feature level shows the plain Feature label and tooltip.

## What should happen

The number belongs to the System scan only: `Scan · N` and its tooltip appear when the shown level is the System. When `Scan` scans a Feature, the number does not appear. At Machine and State levels the button scans a Feature, so it must show the plain label and the Feature tooltip, like the Feature level does.

## Chosen option

**Show the plain Feature button at Machine and State levels**

Treat Machine and State levels like the Feature level: label `Scan`, no number, tooltip naming the Feature that will be scanned. Matches the Requirement and what the click does. Costs only a small change to the button label and tooltip.

## Where in the code

extension/src/webview/diagram/index.ts, the Scan button label in the chrome rendering; extension/src/webview/diagram/levels.ts, which Feature a level scans
