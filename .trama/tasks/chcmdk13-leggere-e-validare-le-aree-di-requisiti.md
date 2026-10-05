---
column: done
technical: true
refs:
  - requirements/data#General
  - requirements/tech#project
drift: null
proposal: null
agent: false
created: 2026-10-05T13:21:54.029Z
---
# Leggere e validare le Aree di Requisiti come cartelle con area.md e frammenti

Un'Area di Requisiti è la cartella `requirements/<area>/`: `area.md` (obbligatorio) porta descrizione, titolo e introduzione e nessuna sezione; ogni altro file `.md` è un frammento con descrizione obbligatoria, un H1, nessuna prosa prima della prima sezione e poi sezioni `## General` e `## <riferimento>`.

Quando è fatto:
- le sezioni di tutti i frammenti formano l'Area, e ogni sezione compare una sola volta in tutta l'Area; i riferimenti `requirements/<area>#<sezione>` di Task, Drift e Proposal si risolvono senza nominare il frammento;
- sono errori: `area.md` mancante o con sezioni, descrizione mancante, nome di frammento non kebab-case o uguale a `area`, prosa prima della prima sezione, sottocartelle in un'Area, una sezione ripetuta in due frammenti, e un file `.md` direttamente in `requirements/`, con un messaggio che dice di lanciare `trama update-skills`;
- una Proposal tiene i file dei Requisiti agli stessi percorsi (`requirements/<area>/area.md`, `requirements/<area>/<frammento>.md`), e applicarla scrive e cancella frammenti;
- le due soglie (4.000 caratteri di budget delle skill, 12.288 byte per frammento) sono costanti condivise da riga di comando ed estensione.
