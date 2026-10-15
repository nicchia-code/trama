---
column: done
technical: true
refs:
  - requirements/tech#General
drift: null
proposal: null
agent: false
created: 2026-10-14T10:24:57.645Z
finished: 2026-10-14T12:10:09.409Z
---
# Fix code to match the Requirements: Installed skill files are compared without normalising line endings, so a core.autocrlf checkout conflicts and is rewritten (technical)

Quando i file delle skill installate (quelli di Trama in .agents/skills, .claude/skills, .github/skills o nella cartella configurata, e la definizione trama-analysis in .omp/agents/) vengono confrontati con il contenuto che Trama installerebbe, il confronto normalizza i fine riga da CRLF a LF, come per ogni file sotto .trama/. Così, con un checkout che converte i fine riga (core.autocrlf), inizializzare un progetto non segnala conflitti di skill o di definizioni, e aggiornare o rigenerare le skill non riscrive file che non sono cambiati nel contenuto. Il confronto usato da init (conflitti di skill e di definizioni omp), da skills update (elenco dei file cambiati) e dalla rigenerazione delle skill di Requisiti deve essere lo stesso, sulla stessa lettura normalizzata. Fatto quando un checkout con fine riga CRLF non produce conflitti né riscritture a vuoto, e i test lo verificano.
