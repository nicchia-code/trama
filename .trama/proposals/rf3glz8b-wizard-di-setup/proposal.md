---
status: approved
base:
  project-setup/setup-wizard.md: new
  project-setup/feature.md: 162992963c2def030ec9401fc70cb1628eb3a7a2ebd6ab11b5d750df58b99abb
  project-setup/project.md: e84c30fae14a53c40b4228baf7733b21c7885024017de6f35583662daf7eaf12
  editor-panel/panel.md: 18d57844d786abcd67e8ffcada8f86395938105fafbfcf679b3ea5541b28264f
  actors/developer.md: 5825cf7979588552ac996a8fdaec0de8d59e566b9e8397f15172599e172d6302
  requirements/ui/get-started.md: a486b5a4dc330275f64e859b9a0e7e90ddec99b46c9800a2c9c612806b159f9d
  requirements/rules/setup-wizard.md: new
  requirements/tech/setup-wizard.md: new
  requirements/rules/project.md: b89183477db98b57e0f39b84069d450a9aa68abb65cf5bb853492cd89e11c645
delete: []
created: 2026-10-21T12:57:15.684Z
label: setup wizard
---
# Wizard di setup

Oggi Get Started offre solo due pulsanti e le impostazioni principali (agente, modelli, cartella delle skill) restano sparse nella scheda Settings: chi mette Trama in un progetto lancia l'import senza aver scelto agente e modelli, e l'agente deve chiedere a posteriori quali cartelle importare. Un wizard a passi raccoglie tutto prima e conferma tutto insieme.

## Decisioni
- Il wizard è la scheda Get Started stessa, a passi con Back/Next.
- Copre Import from Code e Start from Scratch: il primo passo sceglie il percorso.
- Impostazioni chieste: agente (con percorso di omp e posizione del terminale), modelli, parallelismo, cartella delle skill, tema e sperimentali. La lingua non è fra i passi.
- Per Import un passo raccoglie le cartelle da escludere; la divisione in Feature resta all'agente.
- Riapribile dopo il setup per le sole impostazioni, con il pulsante Guided setup in cima alla scheda Settings (nessun comando nella palette).
- Nulla si salva prima della conferma del riepilogo; chiudere il pannello a metà non lascia tracce.
- L'agente scelto si verifica e il risultato si mostra senza bloccare.
- Tema e sperimentali stanno in un passo Advanced saltabile.
- Ogni passo parte dai valori utente attuali.
- L'avviso di Start from Scratch su una cartella con file è nel passo del percorso, non più in un dialogo modale.
- Le cartelle escluse valgono solo per quell'import e arrivano all'agente nell'istruzione.
- Albero delle cartelle tutto incluso; le cartelle nascoste e quelle che `.gitignore` esclude non compaiono.
- Con il Modello vuoto, i pulsanti del Diagramma e il comando Import from Code aprono il wizard, col percorso già scelto, nella scheda Settings.
- Con più cartelle nell'area di lavoro la cartella si sceglie nel passo del percorso.
- Il riepilogo mostra tutto, con i cambi evidenziati; una riga riporta al suo passo.
- Se l'inizializzazione fallisce, le impostazioni restano salvate e il riepilogo offre di riprovare.

## Assunzioni da verificare
- Nessun percorso è preselezionato nel primo setup: Next si abilita dopo la scelta.
- Annullare il wizard nella scheda Settings riporta al modulo delle impostazioni; aperto dal Diagramma o dal comando, conferma e annullamento riportano al Diagramma.
- Senza progetto la scheda Settings non mostra Guided setup: il wizard è già in Get Started.
- Escludere tutte le cartelle blocca Next con un motivo.
- Un'impostazione cambiata da fuori mentre il wizard è aperto non sovrascrive le scelte del wizard; il riepilogo confronta con i valori del momento.
- Il comando Import from Code con un Modello non vuoto lancia l'import come oggi, senza wizard e senza esclusioni.
- Testi del wizard in inglese, come la scheda Settings, e non seguono `trama.language`.
- Testi, icone e layout dei passi (`ui#setup-wizard`) e la frase dell'istruzione con le esclusioni (`rules#setup-wizard`) sono proposte mie.
- Aprire il wizard dal Diagramma o dal comando mentre è aperto in modo impostazioni lo riapre da capo; aprirlo di nuovo nello stesso modo lo porta solo in primo piano.
- Le voci ignorate da git si tolgono con `git check-ignore`; fuori da un repository git si nascondono solo le voci col punto.

## Already present
- `design-request/Writing/developer.ASK_AGENT` — `extension/src/host/design-requests.ts` (`DesignRequests`): la reazione non cambia, cambia solo la descrizione dell'Event per il comando Import from Code.
- `drift-resolution/Free/developer.ASK_AGENT` — `extension/src/host/drift-resolution.ts` (`startJob`, `driftWork`): invariata.
- `question-round/Not asked/developer.ASK_AGENT` — `extension/src/host/question-session.ts`: invariata.
