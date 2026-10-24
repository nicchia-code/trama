---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
  - requirements/rules#developer.ASK_MORE
  - requirements/rules#omp-chat-general
  - requirements/tech#agent-terminal
drift: null
proposal: ft7jlc46
agent: false
created: 2026-10-24T18:53:13.004Z
finished: 2026-10-24T18:56:30.873Z
---
# Frase della lingua attiva

Quando lo sviluppatore ha scelto una lingua in `trama.language`, ogni istruzione che Trama manda all'agente, nel terminale o in omp Chat, finisce sulla stessa riga con la frase "Write the texts for the developer in <language>, as the Language section of your instructions says.", con `<language>` il testo dell'impostazione senza spazi attorno, così come è scritto. Vale per design, setup, scan, import, implement, implement all, Resolve Drifts, Unify Drifts, raffinamento, rework, Ask more e anche General, che oggi non riceve nessuna frase. Con l'impostazione vuota o fatta di soli spazi l'istruzione resta esattamente com'è oggi.

- L'interruttore che oggi spegne la lingua (`LANGUAGE_SETTING_ENABLED` in `extension/src/host/agent.ts`) non esiste più: `configuredLanguage` legge l'impostazione a ogni lancio.
- La frase sta dove la mettono già le regole di `rules#agent-terminal`: ultima, dopo le frasi del limite, dei sotto-agenti, del Drift blocker, delle domande e dell'auto exit.
- Ask more e General portano solo la frase della lingua, nessun'altra frase dei lavori.
- In Ask more l'agente risponde nella lingua in cui scrive lo sviluppatore; la lingua scelta vale per i testi che scrive per Trama (Task, Drift, domande, note). In General l'agente risponde nella lingua scelta.
- La lingua non si salva nel progetto, in `.trama/` o nelle skill; cambiarla non traduce nulla di già scritto.
- I test di `prompts.ts` e dei lanci provano la frase nuova per ogni lavoro, la sua assenza senza lingua e la sua presenza in General e Ask more.
