---
status: approved
base:
  editor-panel/diagram.md: d3734ba91b361d402db38ec1f51b3e5503831fb1cea6889b80d817c51c1e3bbe
  actors/developer.md: 562461e1e489ba8df8e404ac651f118d10bcbafa988184ca81fb96b892c9d768
delete: []
created: 2026-10-06T16:24:36.618Z
scanScope:
  - ref: developer.OPEN_STATE_LEVEL
    reason: changed
  - ref: diagram/State level/developer.OPEN_STATE_LEVEL
    reason: changed
  - ref: diagram/Machine level/developer.OPEN_STATE_LEVEL
    reason: leads into a change
---
# Risalire con il breadcrumb a uno Stato che contiene quello mostrato

Il pannello permette già di risalire con il breadcrumb dal livello di uno Stato annidato al livello di uno Stato che lo contiene (per esempio da System › feature › machine › A › B al livello di A). Il Modello prevede da State level a State level solo l'apertura di un sotto-Stato con sotto-Stati, e cita il breadcrumb solo per System, Feature e Machine: la risalita a uno Stato contenitore manca.

Scelte fatte senza intervista, da controllare:
- La Transizione State level → State level su `developer.OPEN_STATE_LEVEL` copre anche il breadcrumb verso uno Stato che contiene quello mostrato; nessun Evento nuovo.
- La descrizione di `developer.OPEN_STATE_LEVEL` dice che il developer apre uno Stato con sotto-Stati anche risalendo con il breadcrumb.
- Il nodo di uno Stato esterno (raggiunto da una Transizione che esce da quello mostrato) resta escluso: non è né un sotto-Stato né un contenitore.
