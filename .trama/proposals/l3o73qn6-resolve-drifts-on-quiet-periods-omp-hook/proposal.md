---
status: approved
kind: resolution
drifts:
  - drift: uoobh5qf
    decision: proposal
  - drift: r72wjye7
    decision: fix-code
    option: 1
  - drift: e71pfn8r
    decision: fix-code
    option: 1
  - drift: q4v6bf3e
    decision: fix-code
    option: 1
  - drift: u3urg0y7
    decision: fix-code
    option: 1
  - drift: 9ubgofq8
    decision: fix-code
    option: 1
  - drift: 89k4ihpx
    decision: proposal
base:
  requirements/rules/drifts.md: 3b019ed3b87e036e2163848fad88dff1e81bd21e7595f87e171bf87fbf3d8986
  requirements/data/general.md: 41dfe794b2e19a28a99682985b140d7eb7c807ec51266fc392aa7ea8c917e5bb
  agent-launching/drift-resolution.md: ced225735d5b57c6d82e653832af8668fb2028e188f41ca0c71dc1a617bdf51d
delete: []
created: 2026-10-10T07:43:57.619Z
---
# Resolve Drifts on quiet periods, omp hook, initialization and fix Task design

Risolve sette Drift aperti con le decisioni del developer:

- uoobh5qf Quiet period of a chat job outside Cursor ignores the agent's reads and counts other commands: si descrive il comportamento attuale. Nella chat di un editor che non è Cursor Trama non sa riconoscere i comandi dell'agente, quindi per la quiete contano i comandi di Trama che cambiano qualcosa, chiunque li esegua, nessuna lettura, e i lavori di quella chat condividono la quiete.
- r72wjye7 Initialization overwrites customised omp sub-agent definitions without asking: si corregge il codice; le definizioni dei sotto-agenti di omp diverse da quelle di Trama sono un conflitto dell'inizializzazione, come le skill.
- e71pfn8r A Task filed by hand for a Drift takes its design from the caller, not from the Drift's origin: si corregge il codice; il design del Task di correzione viene dal Task d'origine del Drift e un design diverso è rifiutato.
- q4v6bf3e Starting a Proposal restarts the quiet period of every announcement: si corregge il codice; cominciare una Proposal tiene vivo solo l'annuncio che prende la Draft.
- u3urg0y7 The omp hook's heartbeat never repeats: si corregge il codice; il segnale di vita si ripete ogni 5 minuti con il timer del contesto di omp.
- 9ubgofq8 An omp run without the hook module is still followed as hooked: si corregge il codice; senza il modulo omp è seguito come ogni altro agente.
- 89k4ihpx The single-file Area error names trama skills update, the data Requirement names trama update-skills: si corregge il Requisito, che nomina trama skills update.
