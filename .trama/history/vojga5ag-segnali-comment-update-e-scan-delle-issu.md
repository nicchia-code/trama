---
created: 2026-10-25T18:29:08.636Z
updated: 2026-10-25T18:29:08.636Z
summary: La scheda Issues mostra stati e segnali (Stale, Carry-over, Overload, Dependency) delle issue pubblicate e offre al Manager Comment update su un'issue Stale e Scan su un'issue Closed.
tasks:
  - kd3miym5
---
# Segnali, Comment update e Scan delle issue

Gli stati sono pillole con icona. I segnali delle issue aperte sono Stale (il Modello è cambiato dopo la pubblicazione), Carry-over, Overload e Dependency. Comment update, su un'issue Stale, lancia la skill che scrive un commento su GitHub con ciò che è cambiato e registra `updated`, senza riscrivere il corpo. Scan, su un'issue Closed, lancia trama-scan solo sui riferimenti di quell'issue e archivia i Drift come ogni scan. Le azioni sono disabilitate, con il motivo, mentre il lavoro gira, durante un Run o senza Team.
