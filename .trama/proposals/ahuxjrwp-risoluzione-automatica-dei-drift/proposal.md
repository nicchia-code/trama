---
status: approved
kind: resolution
automatic: true
drifts:
  - drift: 5fjobih9
    decision: fix-code
    option: 1
  - drift: ottb6bm6
    decision: fix-code
    option: 1
  - drift: 5271oftb
    decision: fix-code
    option: 1
  - drift: dv33jk9u
    decision: fix-code
    option: 1
  - drift: ecpdmokg
    decision: fix-code
    option: 1
  - drift: zzak925x
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-16T10:19:59.365Z
---
# Risoluzione automatica dei Drift

Risoluzione automatica: per ogni Drift si sceglie la prima Fix option e il codice verrà corretto.

- 5fjobih9 – Il terminale dell'agente si apre come scheda invece che nell'area dei terminali: correggere il codice (Area dei terminali come predefinito in ogni punto).
- ottb6bm6 – Board testuale non raggruppa i Task di un design: correggere il codice (Raggruppare i design nel testo della Board).
- 5271oftb – Board: i Task di un design non sono più una scheda unica espandibile: correggere il codice (Ripristinare la scheda di design nel Board).
- dv33jk9u – Impostazioni: la delega dei Drift è due caselle sotto «Auto Fix Drifts», non un menu in «Drift autopilot»: correggere il codice (Un solo menu nel gruppo Drift autopilot).
- ecpdmokg – Proposal allegata a un Drift: la vista mostra i Task di rimozione che l'approvazione non crea: correggere il codice (Vista senza sezioni di Task per una Proposal allegata).
- zzak925x – Uno scan avviato dal developer non libera subito i casi falliti: correggere il codice (Liberare i casi falliti all'avvio dello scan del developer).
