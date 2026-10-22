---
status: approved
base:
  actors/developer.md: 40bff3c41286ce6e773d01e1e94157bf95439426c07f0abe11c61bbcc3bfeb44
  project-setup/project.md: 963d92510291684cdd1cb82055b12710a8a965bbfb3ae84abba5e77176085959
  requirements/ui/panel.md: 4203f857d4af34bc4e8480950d36b3d99fda0cf32fd0050022716de84aa078fe
  requirements/tech/project-panel.md: 9bbcc14a0207677d963fd867ef8733b918d14913303ba0a7fda4a350e8e84c73
  requirements/rules/project.md: 914e24b0f48021db2fda63c2d896613643f7a48cc1f3a618f2141ff9251c5dd8
  specs.yaml: 7e89160f5b254c9f5f81a111ef3a14d960450380be9f77832c5bb342b16efe05
  requirements/tech/project.md: new
  requirements/tech/panel.md: new
delete:
  - requirements/tech/project-panel.md
request: 2026-10-22T14-28-26
created: 2026-10-22T13:28:32.876Z
label: Icona Trama
---
# Icona di Trama a sinistra

Il logo di Trama compare nella barra delle attività, a sinistra, e nella barra di stato, in basso a sinistra, al posto del testo `Trama`; l'icona nella barra delle azioni dell'editor sparisce.

Decisioni dell'intervista:
- L'icona nella barra delle attività apre una vista laterale di Trama con una frase e il pulsante Open Trama; la barra laterale segue le regole dell'editor: Trama non la apre e non la chiude da sola.
- L'icona e la vista compaiono in ogni finestra con almeno una cartella aperta, anche senza progetto Trama.
- Il nome della voce nella barra delle attività (tooltip e nome accessibile) è `Trama`.
- La frase della vista è «Model, Board and Requirements of your project, in one panel.»
- In una cartella senza progetto il pulsante resta `Open Trama` e apre Get Started.
- Il pulsante della vista è un'apertura ordinaria, come le altre, compreso il controllo all'apertura.
- Il pulsante della barra di stato diventa solo il logo, con tooltip e nome accessibile `Open Trama`.
- Il logo nella barra di stato viene da un font di icone col solo logo, committato nell'estensione, con uno script in `scripts/` che lo rigenera dagli SVG quando il logo cambia.
- L'icona Open Trama nella barra delle azioni dell'editor viene tolta.

Scelte dell'agente:
- Lo strumento che genera il font è fantasticon, come dipendenza di sviluppo.
- La vista laterale è una vista ad albero vuota con il suo contenuto di benvenuto (`viewsWelcome`), senza webview.
- Il frammento `tech/project-panel` supera 12 KB con questa modifica: è diviso in `tech/project` (sezione `project`) e `tech/panel` (sezione `panel`), con il testo delle sezioni invariato salvo le righe cambiate qui.

## Already present
- `project/Trama project/developer.OPEN_PANEL` — `extension/src/host/controller.ts` (`open` chiama `checkSkillsInBackground`); ogni ingresso che esegue `trama.open` lo fa già partire
- `question-round/Out of sight/developer.OPEN_PANEL` — `extension/src/host/controller.ts` (`open` chiama `questions.restore`)
- `setup-wizard/Closed/developer.OPEN_PANEL` — `extension/src/host/controller.ts` (`open`, `create`: senza progetto il pannello apre Get Started)
