---
status: approved
base:
  system.md: a5028810acfde83a0a57a47eb117b09baf309bdc9b0c0977313f74739ab34585
  agent-launching/feature.md: 41b91661b20707d1c3583fba2d134c6f2a9a3ebca575269caf0461a1c6de703d
  agent-launching/agent-terminal.md: ad18149a1ee6cdec6ccd7b2a9ff8d16452246d5cd23e010e81c20f14aa8030f1
  agent-launching/scan-hold.md: a48fe52826ca3254eb50e320201280e1bb66e388e33d5e749c89e73f7b1dc86e
  agent-launching/design-request.md: 15451d5e4d769ccc14565477312066b33ed14ca1f07b30c6fb3ff69c5442dc5a
  work/feature.md: 59445e01df6456ce0fa632ae98b3153fe02e125efd78c33327dc137f1a7cf329
  requirements/tech/agent-terminal.md: 4c5cbf6391f66ba064f3f547b3d524dc223cf6c272f29fe7047a4274e9bbdd11
  requirements/tech/models.md: new
  requirements/rules/agent-terminal.md: 57b238241c49b858d7bb9a37118816d78ba8b2bcdf9d15e742c0b14395691e03
  requirements/rules/models.md: new
  requirements/ui/agents.md: d69a1d817cfb33b45a965d4244bdda5e499eeec4b5e62e5f38fcf4eefa6d8d44
  requirements/quality/main.md: 552b2a98899dd5618d35687ab25f55878881dabb56c0eac98936a886b587b9ae
delete: []
request: 2026-10-07T16-32-24
created: 2026-10-07T14:55:47.179Z
scanScope:
  - ref: agent-launching
    reason: changed
  - ref: work
    reason: changed
  - ref: agent-terminal
    reason: changed
  - ref: agent-terminal/No agent terminal/developer.ASK_AGENT
    reason: changed
  - ref: agent-terminal/No agent terminal/proposal.APPROVED
    reason: changed
  - ref: design-request/Writing/developer.ASK_AGENT
    reason: changed
  - ref: design-request/Writing/developer.CLOSE_REQUEST
    reason: changed
  - ref: scan-hold/On/proposal.APPROVED
    reason: changed
  - ref: scan-hold/On/developer.TURN_SCAN_HOLD_OFF
    reason: changed
  - ref: requirements/quality#agent-launching
    reason: changed
  - ref: requirements/rules#agent-terminal
    reason: changed
  - ref: requirements/rules#agent-launching
    reason: changed
  - ref: requirements/rules#work
    reason: changed
  - ref: requirements/tech#agent-terminal
    reason: changed
  - ref: requirements/tech#agent-launching
    reason: changed
  - ref: requirements/ui#agent-launching
    reason: changed
---
# Model roles, official terminal agents and System 1 scan triage

Ridurre il costo di Trama: ogni lavoro gira sul modello adatto, la scansione smista le Machine con un classificatore veloce e solo quelle in conflitto passano al modello pesante; gli agenti del terminale diventano supportati ufficialmente.

Decisioni dell'intervista:
- Tre ruoli dei modelli nelle impostazioni utente: trama.analysis (design, import, rifacimento di Proposal obsolete, analisi dei conflitti), trama.scan (corsa di scansione), trama.execution (Task e loro scansione finale, smistamento senza classificatore).
- Un ruolo vuoto non passa nessun modello: vale il predefinito dell'agente. Nomi dei modelli in testo libero, passati così come sono.
- Classificatore System 1: solo Jev (trama.system1 = jev o vuoto); la Decisions API di OpenAI resta per dopo.
- Jev lo chiama un comando trama che l'agente usa; la chiamata passa dall'editor, che tiene la chiave nel suo archivio segreto (nessuna impostazione trama.apiKey, nessuna variabile d'ambiente). Il principio «Trama non chiama mai un modello» diventa «nessun modello che scrive testo; solo il classificatore System 1 su richiesta dell'agente».
- Unità di smistamento: una Machine. Senza chiave, con System 1 spento o senza editor raggiungibile, decide un sotto-agente sul modello di esecuzione. Conflitto se la probabilità è almeno 0,2; un errore del classificatore conta come conflitto.
- Dentro la scansione i modelli arrivano tramite sotto-agenti con modello scelto (omp e Claude Code lo permettono); con un agente che non lo sa fare tutto resta sul modello della corsa e il resoconto lo dice.
- Il resoconto della scansione ha una riga sullo smistamento.
- trama.terminalAgent: omp, claude, codex, copilot, cursor o custom; con un agente noto Trama compone comando e modello, custom usa trama.agentCommand con il segnaposto {model}. Chi ha già trama.agentCommand e nessun agente scelto resta custom.
- Alla prima corsa senza agente né comando Trama fa scegliere fra i cinque agenti o «Altro comando…», valido per tutti i progetti.
- Con i launcher della chat i ruoli non valgono: il developer è avvisato una volta.

Assunzioni da verificare (non chieste):
- Modello Jev fisso jev-latest, timeout della chiamata 10 secondi.
- Con custom e un ruolo vuoto, {model} diventa testo vuoto: chi usa {model} imposta i ruoli che gli servono.
- Con trama.system1 = jev ma nessuna chiave salvata, si comporta come senza classificatore.
- Per omp i sotto-agenti trama-triage e trama-analysis sono definizioni installate da Update skills con i ruoli @smol e @slow, impostati per la sola sessione con --smol e --slow; per Claude Code arrivano con --agents.
