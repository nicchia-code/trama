---
column: done
technical: false
refs:
  - multi-branch/Off
  - multi-branch/On
  - multi-branch/Off/developer.TURN_MULTI_BRANCH_ON
  - multi-branch/On/developer.TURN_MULTI_BRANCH_OFF
  - requirements/data#multi-branch
  - requirements/rules#multi-branch
  - requirements/tech#multi-branch
drift: null
proposal: e6051b33
agent: false
created: 1970-01-01T00:00:00.178Z
---
# Ricordare l'interruttore multi-branch nel file di questa copia di lavoro

L'interruttore multi-branch di questa copia di lavoro è spento o acceso, e il ricordo sta nel file di stato di `.trama/multi-branch/`, non in un'impostazione.

Fatto quando:
- Manca la cartella o il file: l'interruttore è spento, senza avviso.
- Il file, tolto al più un a capo finale, vale `on` se acceso e `off` se spento. Ogni altro contenuto è illeggibile: l'interruttore è spento e il developer vede l'avviso `Trama could not read the multi-branch switch, so it is off.` L'avviso non si ripete finché il contenuto resta quello. Torna se il contenuto cambia e resta illeggibile, oppure se il pannello si chiude e si riapre sul file ancora illeggibile.
- Accendere dal pannello scrive `on` solo se il comando dei worktree, tolti gli spazi agli estremi, non è vuoto. Se mancano, nascono la cartella e il suo `.gitignore` che ignora tutto (`*`). Se il comando non è impostato, l'interruttore resta spento, non scrive `on`, e il developer vede `Set trama.worktreeAgent in your user settings before turning multi-branch on.`
- Spegnere scrive `off`, creando cartella e `.gitignore` allo stesso modo. Un giro già aperto non si chiude e i worktree restano.
- Se la scrittura fallisce, lo stato mostrato non cambia e il developer vede `Trama could not save the multi-branch switch.`
- Gli avvisi del pannello sono messaggi di avviso dell'editor.
- L'estensione non dichiara `trama.multiBranch`. Una chiave già presente in un file di impostazioni resta dov'è: non è letta e non è cancellata, e non accende né spegne l'interruttore.
