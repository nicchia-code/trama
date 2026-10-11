---
column: done
technical: true
refs:
  - requirements/data#General
drift: null
proposal: null
agent: false
created: 2026-10-11T17:08:14.789Z
finished: 2026-10-11T17:13:58.338Z
---
# Refuse Windows reserved device names as IDs and as Area and fragment names

`trama validate` segnala come errore, su ogni piattaforma, un ID di Feature, Machine o Actor e il nome di un'Area o di un frammento uguale a un nome che Windows riserva ai dispositivi: `con`, `prn`, `aux`, `nul`, da `com1` a `com9` e da `lpt1` a `lpt9`. Un nome che soltanto ne contiene uno (`console`, `com-port`) resta valido. Oggi solo `system`, `feature`, `actors` e `requirements` sono riservati.
