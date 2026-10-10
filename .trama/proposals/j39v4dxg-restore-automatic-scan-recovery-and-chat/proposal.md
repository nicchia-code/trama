---
status: approved
kind: resolution
drifts:
  - drift: 07l9m8zt
    decision: fix-code
    option: 1
  - drift: s63mw4hv
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-10T18:25:08.082Z
---
# Restore automatic scan recovery and chat job ownership

07l9m8zt – Automatic Copilot scan fallback omits Scan now: correggere il codice per offrire la scansione mirata alla Proposal con un avviso aggiuntivo quando la chat non invia automaticamente l’istruzione, conservando la copia negli appunti e il suo avviso.
s63mw4hv – A Copilot job can bind a conversation started during chat preparation: correggere il codice per legare Run e Resolve Drifts soltanto al primo prompt di Trama del progetto successivo alla consegna effettiva, escludendo le conversazioni iniziate durante la preparazione e conservando gli eventi della vera conversazione arrivati durante l’invio.
