---
refs:
  - agent-terminal
  - requirements/rules#agent-terminal/Agent running
  - requirements/tech#agent-terminal/Agent running
  - requirements/quality#agent-terminal/Agent running
  - requirements/tech#agent-launching
---
# Istruzioni escluse in omp

Quando il Task è fatto, con omp come chat agent e `trama.ignoreInstructionFiles` attiva, ogni lancio di Trama (design, import, scan, esecuzione dei Task, Resolve Drifts, e per eredità i sub-agent e gli advisor) parte con un overlay `--config` il cui `disabledExtensions` è la lista dello sviluppatore (da `.omp/config.yml` del progetto, altrimenti da `~/.omp/agent/config.yml`) più le identità di omp dei file di istruzioni trovati al momento del lancio, tradotte come dice `tech#agent-terminal/Agent running` (file di contesto, regole fisse, regole Cursor una per una con `rule:<name>`).

L'overlay è un solo file, lo stesso dell'Advisor Scanner (`tech#agent-launching`): `--config` si passa solo quando l'overlay ha contenuto, mentre `--advisor` e `TRAMA_ADVISOR_SCANNER` restano legati soltanto all'Advisor Scanner. Se non si trova nessun file il lancio resta identico a oggi; un errore nella ricerca o nella scrittura dell'overlay non ferma mai il lancio (`quality#agent-terminal/Agent running`). Le skill, i sub-agent e il WATCHDOG di Trama non vengono mai esclusi, e con Cursor chat l'impostazione non ha effetto (`rules#agent-terminal/Agent running`).

Per l'accettazione si verifica con omp 18.12 che sub-agent e advisor ereditano le esclusioni. README, `extension/README.md`, CHANGELOG e `docs/uat.md` descrivono il comportamento.
