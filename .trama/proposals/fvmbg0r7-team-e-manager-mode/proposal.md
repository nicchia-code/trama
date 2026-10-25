---
status: approved
requires:
  - kqdcvmc1
base:
  system.md: 9e8df2debff73eb8c5d4de7c7e19e6a59ee2e036439e8bd29b2bc19c0288f355
  team/feature.md: new
  team/manager-mode.md: new
  team/person.md: new
  editor-panel/feature.md: fcadff954e6c36819cc0dc3f47207f8454c5f2f6db15b5d053736220a11e46ee
  editor-panel/panel.md: 4abd8aafd50bf6540882e7c25eb722fd41050f1b415c89ed99e2d5a865a20aaa
  editor-panel/menu-laterale.md: 296deaebcf1a6e0278cddedda82bed3274197c6c6682bbd104a8aba6850c3871
  project-setup/setup-wizard.md: 881412c2ee26f394df00f58e753160f8abdaa48e525d3393f87287a460cce103
  actors/developer.md: 69fc7b124c3a225a5806494dc9d3bee6f535585ddfd1c731a868b7c76477b263
  requirements/ui/team.md: new
  requirements/data/team.md: new
  requirements/tech/team.md: new
  requirements/rules/team.md: new
  requirements/cli/team.md: new
  requirements/quality/team.md: new
  requirements/ui/menu-laterale.md: f5d80562668949522b5d5ba317d1640f94f4e5709626a0e40d6c5ba36d890b91
  requirements/tech/menu-laterale.md: f4faf97ce636ad9ef0825e3a6e17a2c50065abe08dd454adaeede96a490db34d
  requirements/ui/panel.md: df26189ed8694ce34194623d7fc452ec9f75db1874beade63f8eff2f25fb24a8
  requirements/tech/panel.md: 1fcb55832228cf1de984decbbd3560db55b9130e7a1f9140bc4e0acef7a79a8b
delete: []
created: 2026-10-25T13:58:22.786Z
label: Team
---
# Team e Manager mode

Prima parte di Team: il developer che guida un team accende Manager mode e diventa il Manager; Trama conserva nel suo editor le persone del team e il pannello ha la vista Team con la scheda People. Le Proposal che seguono aggiungono le handoff verso GitHub e la timeline degli sprint.

Decisioni:
- Manager mode vale per una copia di lavoro, come Solo mode: registrata in un file locale di `.trama/` mai committato, non è un'impostazione utente.
- Il wizard di setup la offre nel passo Project in ogni modo (primo setup, Guided setup, Modello vuoto).
- Manager mode richiede che origin sia un repository su github.com; altrimenti è spenta e non modificabile, con il motivo.
- I dati delle persone stanno solo nel `globalState` dell'editor del Manager, mai nel repository: compatibile con Solo mode acceso o spento.
- Le persone sono un elenco unico per tutti i progetti; ogni progetto sceglie chi è nel suo team.
- Ogni persona ha nome, handle GitHub, livello (junior, mid, senior), competenze, capacità per sprint in giorni e assenze.
- La vista Team ha sotto-schede; questa Proposal porta la scheda People. L'aspetto segue il mockup `Trama · Team view.html`.
- Le persone del team possono usare Trama oppure no: nulla in Team lo presuppone.

Scelte dell'agente, da verificare:
- L'agente legge il team con `trama team show`, che chiede i dati alla finestra dell'editor attraverso lo stesso canale con segreto dei round di domande: nulla delle persone si scrive su disco.
- Sprint di una settimana di cinque giorni lavorativi; capacità da 0,5 a 5 giorni a passi di 0,5; assenze finite da più di 90 giorni eliminate al salvataggio.
- Togliere una persona dal team non chiede conferma ma offre Undo; cancellarla del tutto chiede conferma.
- Spegnere Manager mode non cancella nulla: persone e lavoro tornano riaccendendola.
- Il comando `Trama: Show Team` resta sempre nella palette e, senza Team disponibile, fa l'apertura ordinaria, per non aggiungere una chiave di contesto.
