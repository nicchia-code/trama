---
column: done
technical: true
refs:
  - requirements/tech#task
drift: null
proposal: ndrmsitf
agent: false
created: 2026-10-10T20:33:23.069Z
finished: 2026-10-10T20:41:09.359Z
---
# Filter runnable Tasks by identity

Il comando per scegliere il prossimo gruppo di Task deve poter limitare la scelta alle identità indicate, rimuovere i duplicati e rifiutare identità inesistenti prima di produrre il risultato; se è indicato anche un design, considera soltanto l'intersezione dei due insiemi senza cambiare l'ordine, i blocchi, il limite o lo stato dei Task. Le corse automatiche devono usare questo filtro per eseguire soltanto i Task autorizzati e ricontrollare l'insieme autorizzato fra un gruppo e il successivo, includendo le origini soltanto quando i relativi Task di correzione sono Done; verifica e scansione finale riguardano solo i Task effettivamente eseguiti.
