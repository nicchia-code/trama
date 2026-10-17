---
column: done
technical: false
refs:
  - panel/Board
drift: 9l9dofp1
proposal: null
agent: false
created: 2026-10-17T12:11:32.308Z
finished: 2026-10-17T13:52:46.245Z
---
# Fix code to match the Model: Badge Resolving con nome accessibile diverso dal Requisito

## What happens

Il badge `Resolving` ha tooltip `An agent is resolving this Drift`, ma il nome accessibile è `Resolving: an agent is resolving this Drift`.

## What should happen

Il Requisito di panel/Board chiede tooltip e nome accessibile entrambi `An agent is resolving this Drift`.

## Chosen option

**Allineare il nome accessibile**

Impostare `aria-label` del badge a `An agent is resolving this Drift`, come il tooltip.

## Where in the code

extension/src/webview/board/render.ts:186-187
