---
column: done
technical: false
refs:
  - panel/Settings
  - panel/Open/developer.SHOW_SETTINGS
  - requirements/ui#panel/Settings
drift: null
proposal: nzy76et8
agent: false
created: 2026-10-15T05:38:10.068Z
finished: 2026-10-15T05:44:51.877Z
---
# Hide setting keys in the Settings tab

Quando il developer apre la scheda Settings, ogni impostazione mostra il titolo leggibile con accanto la «i» informativa e, sotto, il controllo: la chiave tecnica dell'impostazione (per esempio `trama.maxParallelAgents`) non compare più, né nella pagina né nel fumetto.

In una riga della griglia titoli e controlli delle impostazioni affiancate restano alla stessa altezza; messaggi di errore e avvisi del workspace restano sotto il controllo della loro impostazione, dentro la sua colonna.

Quando la scrittura di un'impostazione fallisce, il messaggio di errore dell'editor nomina il titolo leggibile invece della chiave: `Trama: could not save Max Parallel Agents: <motivo>.`, e il controllo torna al valore reale.
