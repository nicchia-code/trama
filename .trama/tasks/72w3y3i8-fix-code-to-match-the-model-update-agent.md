---
column: done
technical: false
refs:
  - project/Trama project/developer.UPDATE_SKILLS
drift: u40ohoxp
proposal: null
agent: false
created: 2026-10-06T16:08:06.500Z
finished: 2026-10-06T16:10:31.464Z
---
# Fix code to match the Model: Update Agent Skills nell'editor non dice che ha creato le Aree di partenza

## What happens

Quando il progetto non ha la cartella dei Requisiti, **Trama: Update Agent Skills** crea le cinque Aree di partenza, ma la notifica dell'editor **non lo dice**: mostra le skill aggiornate, la skill Fix cancellata, le Aree convertite o lasciate e la modalità delle skill di Requisiti, non le Aree create.

Dalla riga di comando il resoconto le elenca.

## What should happen

L'aggiornamento delle skill crea le Aree di partenza quando manca la cartella dei Requisiti e **riferisce cosa è cambiato**. Le Aree create sono un cambiamento, quindi anche la notifica dell'editor deve nominarle.

## Chosen option

**Mostrare nella notifica la riga delle Aree create**

La notifica dell'editor riporta anche la riga del resoconto che elenca le Aree di partenza create, come già fa per le Aree convertite. Cambio piccolo e locale; la notifica si allunga solo quando le Aree vengono davvero create.

## Where in the code

extension/src/host/project.ts, updateSkills (l'elenco degli inizi di riga mostrati non comprende la riga Created … Requirement Areas scritta da skills update in src/cli/commands.ts)
