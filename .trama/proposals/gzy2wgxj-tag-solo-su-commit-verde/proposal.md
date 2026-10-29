---
status: approved
base:
  requirements/tech/general.md: 47625bb246af1a49c1a804a16ab7c7f3a2f68e4ba44ec39d880a20a71144ab22
  specs.yaml: d30c50009dc743081cfa7056d12a9c0303958200402ffb3ba404b29ea557fdde
  requirements/release/area.md: new
  requirements/release/main.md: new
delete: []
created: 2026-10-29T13:59:26.648Z
label: Release manuale
---
# Tag solo su commit verde

Oggi il workflow `Release` parte al push di un tag `v*` e solo allora costruisce e prova i pacchetti: quando un test fallisce il tag esiste già senza release. Per la 0.1.6 il tag è stato spostato e ripushato sei volte in un giorno, e l'ultima corsa è fallita comunque (un test su Windows, la suite ferma su macOS). Con questo cambiamento il tag nasce solo insieme alla sua release, dopo che tutti i pacchetti sono passati, e nessun tag viene più riscritto.

Decisioni:
- La release si avvia solo a mano (`workflow_dispatch`); il push di un tag `v*` non avvia più nulla.
- Il workflow crea il tag `v<versione di package.json>` sul commit della corsa, insieme alla release, solo quando tutti e tre i pacchetti passano.
- Quando anche una sola piattaforma fallisce non esce nessuna release e non nasce nessun tag.
- La release si può avviare da qualsiasi branch.
- Se il tag della versione esiste già, la corsa si ferma subito, prima di costruire, e lo dice: serve una nuova versione. `v0.1.6`, che esiste senza release, non è più rilasciabile.
- L'input `target` sparisce: ogni release ha sempre le tre piattaforme.
- Le righe su workflow di release, limiti di tempo, watchdog dei test, tag e pacchetto Windows passano, con lo stesso testo, dalla `## General` di `tech/general.md` (oltre i 12 KB) alla `## General` della nuova Area `release`.
