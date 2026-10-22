---
status: approved
base:
  requirements/ui/quick-task.md: cacd5920e3e304d6cb887daea0d1873051d21311438a6fd00974c4996832bade
  requirements/ui/rework.md: 7c73a1f329c361e3c61a4f4f0b5e5ea48a5e18b71e682fd2528f3cef939988a4
  requirements/tech/quick-task.md: 4084cd5dc2ead08b945636c0e6bb3f3258b1116d07109a70cd820508d459023b
  requirements/tech/rework.md: 013d4b8acb2a2fa26bec4ea1f1d5692b67339e60537a8e854997e9197b3c75c3
delete: []
request: 2026-10-22T08-10-51
created: 2026-10-22T06:13:48.384Z
label: Pulsante diviso
---
# Add Work Item nei bordi

Il pulsante diviso `+ Add Work Item` in fondo a Backlog esce dalla colonna: la parte principale prende tutta la larghezza e la freccetta finisce oltre il bordo destro, sopra lo spazio fra le colonne, a toccare Active. I Requisiti dicevano solo «largo quanto la colonna», senza dire che la freccetta sta dentro; inoltre `+ Add Work Item` era una copia a parte del pulsante diviso condiviso da Reject e Dismiss Drift.

## Decisioni
- `+ Add Work Item`, freccetta compresa, ha gli stessi bordi sinistro e destro delle schede e di `Run all`; la parte principale prende lo spazio che la freccetta lascia.
- La regola vale per tutti i pulsanti divisi: anche `Reject` e `Dismiss Drift` non escono mai dalla scheda o dai dettagli che li contengono, e la freccetta non si separa mai dalla parte principale.
- Un solo componente condiviso del webview per i tre pulsanti divisi, con larghezza piena, bordo tratteggiato, icona della freccetta, lato del menu e voci scelti da chi lo usa.
- Nessuna regola nuova per il testo quando lo spazio non basta: la colonna non scende sotto la sua larghezza minima e valgono le regole di `ui#panel`.
- Lo screenshot della richiesta va al modello che realizza il Task.
