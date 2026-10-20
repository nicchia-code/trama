---
status: approved
base:
  requirements/data/general.md: bee1603ca086fb2199d3246e003f92d3a5f82db73766a749f24144fb63f968b9
  requirements/data/work.md: 46af9675b785a700b0484c5dbb209045677d8bb633b36d1030f3704e48bd1994
  requirements/quality/main.md: 347934a31008e17bcc68b93cbf276a6bb4cee4cc2f82a2a0a5c6cce509681f3f
  requirements/rules/agent-terminal.md: b0d9680658a276b0ccba61dc2c6bb4da4fc39e2c9ae3ed6fb302e85ee5c80f5e
  requirements/rules/autopilot.md: 5b67c1da06db40564fcb3392e3d63a43e0e92e13b3262268bb6f73854f2ea3be
  requirements/rules/decisions.md: 7e568a5a5e3f122d5d196c81e0086fd0f58f898477d723c885c44e65afacc4f9
  requirements/rules/drifts.md: 39e2766dca6310b4491785d4fae5d5c324cc04909ecb6b8ae8821c0ea383fd4f
  requirements/rules/project.md: b57f704c52f4ea090af608762885dbdaa5dc44db7036244f4f0c2d49718d640e
  requirements/rules/questions-notices.md: 3a52d9afd98128001bfe4b0de084869a695bcf5cc8bafec79c01158a6ed334b0
  requirements/rules/scans.md: c5c59c96833153a71e9b41e28c1c6094a6bd0c963bfbf6e2f96f2ebd68e77d59
  requirements/rules/tasks.md: 5caa97fb106085312a1999b7adeffb935c502f7df79452b11604345c4a9bd5c5
  requirements/rules/turn-history.md: b1da8c7170d3aa1a94434f36c8ddc0e26fcd2875c02e3e9bfd837ae31bd98822
  requirements/tech/agent-hooks.md: 4b7674e40b667c9e20647a6242ff8b03413c059002476cf42e2d68b164d80195
  requirements/tech/announcements.md: fe3de16463006995a56f22c7d0fb775ce6efabe5d6c399666ed7afc2ad9b6666
  requirements/tech/autopilot.md: fe702510bca932e1d7c71abac0b0416aadd2eca4445990dd24d03f92b546de57
  requirements/tech/drifts.md: 9efc944c0cf323cbfefa2559b75b0381a677ce41f1f800613d14b728b06e602b
  requirements/tech/editor-chat.md: eb630b16f38699189e9b8fad27a5ed7db73e4d2ff54605685600b45fd3f7e8df
  requirements/tech/general.md: d42130ff9024ac38d9a3c47c96d1301a155b2ef7b2ef5e8a14c49c38a5371082
  requirements/tech/models.md: 92c4326859701d23a9ba1e44e1fdc7d6e9cf3fe3ec003a24b521941525f756e6
  requirements/tech/project-panel.md: 1ca6c4c643d9f2c27b2b0f0521d4d354ba4f252f6d78d297a482f5f89608272c
  requirements/tech/proposal.md: 5bf9f708588ea0e03fe4adc3aecf7c50dc24b596fc7503e7bd80eb6c9c64ae5d
  requirements/tech/questions-notices.md: f78d88b37b26f5c47e23f5e8710fa9ae394040b24537d54042fd044510c9a596
  requirements/tech/requests.md: b6d142379a291e41f4ce76641ec491cc9beb8af4c628d6e9199af61253ea4751
  requirements/tech/scans.md: 71f93a030f1b0169c22eca49a87a751c66bda987d5c18d2e9b2793990a73a567
  requirements/tech/work.md: fd11f1af86beacccede0d135b0d62a952335fc54835be2bb1596f83f27231624
  requirements/ui/panel.md: 95b52508057fd364152a5521cb4e5cbef9efb3df78824e567498e99a566dc3d6
  requirements/ui/tasks.md: c641e650a3c8b7660bd676a2d2ed4cd3ddede8bc93ff42c6aebca4deb56fd953
  requirements/ui/work.md: dbda2cdcfc4b6d058fc8604da514bac79ed8362658d1f9c18a38d5c81464d9f7
  actors/agent-hook.md: 0a88669b472c0a9e9b6a6f84f51c2c9370d4f8b5e73fda7e69def2c153302095
  requirements/cli/area.md: new
  requirements/cli/main.md: new
delete: []
created: 2026-10-20T19:18:50.988Z
label: CLI oggetto-verbo
---
# CLI oggetto-verbo

La riga di comando è cresciuta a 52 comandi, con due percorsi di esecuzione (il registro e i comandi gestiti a parte in `bin.ts`), opzioni documentate solo nella frase di riepilogo, flag che si escludono a vicenda e coppie di opzioni abbinate per posizione. Si ricostruisce con pochi comandi uniformi e input JSON validato: 32 comandi, 6 verbi, un solo registro.

Decisioni del developer:
- Forma `trama <oggetto> <verbo> [<id>] [<stato>] [--input <json>]`, con sei verbi uguali per ogni oggetto: `show`, `list`, `new`, `edit`, `move`, `check`.
- I passaggi di stato si fanno con `move <id> <stato>`, non con verbi propri (`submit`, `approve`, `resolve`).
- Tutto ciò che non è identità, riferimento o stato di arrivo arriva in `--input` come JSON, anche i filtri delle letture; nessun'altra opzione per comando.
- Gli schemi dell'input si scrivono con zod 4.
- Gli hook passano sotto `trama hook …`; le configurazioni già installate si riscrivono.
- `trama ask` diventa `trama question new`.
- Il developer si riprende un Task dall'agente con `task move <id> doing`.
- `trama ids rewrite` si toglie.

Assunzioni da verificare (non discusse):
- L'output non cambia: Markdown di default, JSON con `--json`, codici di uscita 0, 1, 2.
- `--input -` legge lo standard input, altrimenti il valore è il testo JSON; nessun comando legge lo standard input senza `--input -`, salvo gli hook.
- `--help` si genera dallo schema e mostra i campi dell'input; `--help --json` stampa lo schema JSON di input e output.
- `validate --proposal` sparisce (consegna e `proposal show` già validano); `validate` e `analyze` diventano `model check`.
- `system`, `feature`, `machine`, `state`, `event`, `requirements` e `paths` diventano `model show`; `search` diventa `model list`.
- `task next` e `task scope` diventano filtri di `task list`; `drift candidates` diventa `drift new` con `dryRun`.
- `proposal edit` raccoglie `edit`, `delete`, `label` e `resolve-drift`, accetta più file in una chiamata e, senza input, riporta in Draft una Proposal consegnata (le skill lo usano già così, ma oggi è un errore d'uso).
- `--skills-dir` diventa il campo `skillsDir` dell'input dei comandi che approvano.
- Nomi nuovi: `announcement`, `comparison`, `autopilot`, `project` (`init`, `skills update`, `board`), `timing`. Nessun alias per i nomi vecchi.
