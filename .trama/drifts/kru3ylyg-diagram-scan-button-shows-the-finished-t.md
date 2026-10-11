---
status: resolved
resolution: fix-code
refs:
  - panel/Diagram
  - requirements/ui#panel
proposal: null
task: 2ws9ww41
origin: null
critical: false
option: 1
note: null
resolvedBy: jln094rs
created: 2026-10-11T06:56:18.918Z
---
# Diagram Scan button shows the finished-Tasks number at Machine and State levels, where it scans a Feature

## What happens

In the Diagram bar, while a **Machine** or a **State** is shown, the button is labelled `Scan · N` when N Tasks finished since the last System scan, with the tooltip about the last scan of the System. Pressing it, however, scans only the **Feature** that contains that Machine. The number and tooltip appear at the System level and at Machine and State levels alike; only the Feature level shows the plain Feature label and tooltip.

## What should happen

The number belongs to the System scan only: `Scan · N` and its tooltip appear when the shown level is the System. When `Scan` scans a Feature, the number does not appear. At Machine and State levels the button scans a Feature, so it must show the plain label and the Feature tooltip, like the Feature level does.

## Fix options

### Show the plain Feature button at Machine and State levels

Treat Machine and State levels like the Feature level: label `Scan`, no number, tooltip naming the Feature that will be scanned. Matches the Requirement and what the click does. Costs only a small change to the button label and tooltip.

### Make Machine and State levels scan the whole System

Keep the number and System tooltip, and make the button at every level below the System scan everything. Number and action agree, but the developer can no longer scan just the Feature of the Machine being looked at, which the Model allows.

### Allow the number at Machine and State levels

Change the Requirement so the number may also show where the button scans a Feature, with a tooltip saying the number counts Tasks since the last System scan. Code stays almost as it is, but the button then shows a System figure beside a Feature action.

## Where in the code

extension/src/webview/diagram/index.ts, the Scan button label in the chrome rendering; extension/src/webview/diagram/levels.ts, which Feature a level scans
