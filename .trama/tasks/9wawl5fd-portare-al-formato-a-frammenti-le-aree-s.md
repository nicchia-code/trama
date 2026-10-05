---
column: done
technical: false
refs:
  - project/Trama project/developer.UPDATE_SKILLS
  - requirements/rules#project
drift: null
proposal: euf9nx59
agent: false
created: 2026-10-05T13:21:54.571Z
---
# Portare al formato a frammenti le Aree scritte come file unico con l'aggiornamento delle skill

Prima di rigenerare le skill, `trama skills update` (e il comando equivalente dell'estensione) converte ogni `requirements/<area>.md` rimasto al primo livello:
- scrive `requirements/<area>/area.md` con descrizione, titolo e introduzione del file;
- scrive `requirements/<area>/main.md` con la stessa descrizione, lo stesso titolo e tutte le sezioni (General compresa) nello stesso ordine e con lo stesso testo; un'Area senza sezioni non vuote riceve solo `area.md`;
- cancella il file vecchio.

Se la cartella `requirements/<area>/` esiste già, il file di quell'Area non viene toccato. Il resoconto elenca le Aree convertite e quelle lasciate com'erano, con il motivo. I riferimenti `requirements/<area>#<sezione>` in Task, Drift e Proposal restano uguali.
