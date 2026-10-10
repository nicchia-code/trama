---
status: approved
kind: resolution
drifts:
  - drift: dd3lei9s
    decision: fix-code
    option: 1
  - drift: dlgjjkna
    decision: fix-code
    option: 1
  - drift: vdz86b3w
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-10T08:31:31.311Z
---
# Resolve chat binding, panel rejection and table rendering Drifts

Risolve tre Drift correggendo il codice, senza cambiare il Modello né i Requisiti:

- Drift dd3lei9s – A Cursor chat job can bind the conversation of an instruction sent just before it: correggere il codice; un lavoro nella chat di Cursor si lega solo a una conversazione di Trama nata dopo l'inizio del suo invio.
- Drift dlgjjkna – The panel can reject a Proposal attached to a Drift while the feedback box is open: correggere il codice; il pannello controlla di nuovo che la Proposal non sia allegata a un Drift aperto nel momento in cui il rifiuto viene applicato.
- Drift vdz86b3w – A table right after a line of text loses its rows in panel Markdown: correggere il codice; il pannello riconosce una tabella anche a metà paragrafo e la mostra riga per riga come scritta.
