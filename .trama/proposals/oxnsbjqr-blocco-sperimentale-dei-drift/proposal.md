---
status: approved
base:
  work/drift.md: 58e559ca4a9f69bce61fb435f11f0b981fed6b4eed9e86b829205f4054b809e8
  editor-panel/panel.md: a54bb8a7dc50d8397e9143eaf682d8ee4054df1e1e5786156d1b43a7aa9bb63d
  agent-launching/agent-terminal.md: ed4f0db4e34c6f4b2ec104b079e616a7716775968014516b0c4b5e3a03b68b62
  model-changes/proposal.md: 8d1e0dd4e914e73f2b0861786d2ebe0fa143042d5ed2397efcb61319e313a617
  requirements/rules/drifts.md: bfed5f335048bd61975417629bc534bb759ade3ac67534803b0f6e587df2bf97
  requirements/rules/tasks.md: 409d831a07476b005d872b68dd4c6304060854688e0315874b7a329cd1c7216b
  requirements/rules/autopilot.md: 688b10674984fcee9900a331e815cde482278a7af4f36552c96f95497a3b7c77
  requirements/rules/agent-terminal.md: 7b73db8547f53de5115bbdcf30892cd1221c07c5080cce40c40c12ec7007754a
  requirements/data/work.md: 42173336b6912eedf331c905f24804dfb706a04d7be9ef0050cb948e1d65f7bf
  requirements/data/proposals.md: a3e5a5ff77a17f2ed73fc1933f23bd56bbe51bc26122ee986db2499dadba64fe
  requirements/tech/drifts.md: ffbfc67d81569b3c158a4bc9c5f71bf6fdfa4cc9a2bf03ad382c25207f62efad
  requirements/quality/main.md: f71b07d3df3b7a488c72b37fe518b238f647bc13bcf99362a5b24792e1234e12
  requirements/ui/settings-specs.md: dcd74cd155b85283c024fe4b57c316f8901524319817942984ffc55f2594daa5
  requirements/ui/work.md: ac704437030791f63833d32d64f914b90e2d46d47098262ef8ade274cc78e0a6
delete: []
request: 2026-10-17T18-03-34
created: 2026-10-17T16:21:06.189Z
label: Drift Blocker sperimentale
---
# Blocco sperimentale dei Drift

Oggi un Drift aperto blocca in modo deterministico la sua origine e ogni Task non Done che riguarda la stessa cosa, anche quando la differenza non c'entra con quel lavoro (il colore della barra blocca il Task che cambia il testo di un bottone, perché entrambi nominano la barra). Questa Proposal aggiunge un'impostazione sperimentale, spenta per impostazione predefinita, con cui l'agente che registra un Drift giudica quali di quei Task la differenza tocca davvero; un Drift che non blocca nulla nasce dentro una Proposal di risoluzione da approvare invece di aspettare in Blocked. Con l'impostazione spenta tutto resta com'è.

## Decisioni

- Giudica l'agente che registra il Drift, al momento della registrazione; la scelta resta scritta nel Drift.
- Sceglie solo fra i Task che la regola attuale blocca: il controllo può togliere blocchi, mai aggiungerne.
- Anche l'origine (il Task in corso) è giudicata come gli altri.
- Un Task nato dopo il Drift che riguarda la stessa cosa è bloccato dalla regola attuale.
- Un Drift che non blocca nulla, anche perché non ha nessun Task candidato, nasce dentro una Proposal di risoluzione consegnata.
- Si decide solo alla registrazione: un Drift che smette di bloccare più tardi resta un Drift.
- Il controllo lo fanno tutte le registrazioni degli agenti (realizzazione di un Task, pre-flight, scansione di fine corsa, scan, import); il developer dalla riga di comando non è obbligato.
- L'agente scrive una riga di motivo per ogni Task che lascia libero.
- L'impostazione vale solo nelle impostazioni utente e arriva all'agente nell'istruzione; un agente avviato a mano non la riceve.
- La casella sta in un nuovo gruppo Experimental, in fondo alla scheda Settings, con la descrizione lunga Off/On.
- La risoluzione porta la decisione che l'agente raccomanda: la prima opzione di correzione, oppure l'adeguamento del Modello quando allegherebbe una Proposal (anche per i Drift senza opzioni).
- Una risoluzione per lavoro: l'agente principale di uno scan, Run o import raccoglie alla fine i suoi Drift non bloccanti.
- Una risoluzione nata così ferma Resolve all, Resolve e la raccolta automatica come ogni risoluzione.
- Un Drift che la delega tratterebbe da sola resta Drift e lo corregge la delega.
- I Drift critici e quelli ricorrenti restano Drift anche se non bloccano nulla.
- Il Drift ricorda solo i Task esclusi, ciascuno con il motivo; tutto il resto si calcola come oggi.
- I Task esclusi si vedono sulla scheda rossa e sulla riga del Drift nella scheda gialla (`Not blocking`, motivo nel tooltip), nei dettagli del Diagramma e in `trama drift show`.
- La scheda gialla di una risoluzione nata così ha un badge testuale `blocks nothing`.

## Assunzioni (scelte dall'agente, da controllare)

- La chiave è `trama.experimentalDriftBlocker` («Experimental Drift Blocker»).
- In `trama drift new` i Task esclusi si passano con `--not-blocking <task>` e `--not-blocking-reason <testo>`, accoppiati in ordine come `--option` e `--option-text`; la risoluzione nata così si apre con `trama proposal new --resolution --non-blocking`, che scrive `nonBlocking: true`.
- Se la delega non si può leggere (editor o coordinatore assenti), vale come delega disattivata: il Drift non bloccante va nella risoluzione.
- La frase dell'istruzione è in inglese e la ricevono solo le istruzioni che possono registrare Drift (scan, implement, implement all, Run automatico, import).
- Un'origine lasciata libera non torna in To do né aspetta il Task di correzione quando il codice del Drift si corregge: il Drift non la riguarda.
- L'agente chiede i Task candidati con un comando nuovo, `trama drift candidates --ref … [--task <origine>]`, calcolato con la stessa funzione dei blocchi.
- Per un Drift con una Proposal allegata, la risoluzione decide `proposal` e porta in sé le stesse modifiche al Modello; l'allegata è messa da parte all'approvazione come oggi.
