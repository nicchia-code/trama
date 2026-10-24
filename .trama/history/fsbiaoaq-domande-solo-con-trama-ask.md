---
created: 2026-10-18T13:08:34.532Z
updated: 2026-10-18T13:50:23.347Z
summary: "L'agente non usa più il proprio strumento di domande: lo rifiutano gli hook dei terminali di Trama e, in una conversazione di Trama, anche quelli delle chat di Cursor e di Copilot; ogni istruzione gli ricorda di usare trama ask."
tasks:
  - 9racrdd9
  - aypq8xao
  - pcc83s1y
  - g4bmcyds
cleared:
  g4bmcyds:
    title: Hook delle chat contro domande
    proposal: 7pk25ac0
    tag: Domande solo da Trama
    finished: 2026-10-18T13:27:05.773Z
    refs:
      - editor-chat
      - question-round/Not asked/agent.TOOL_DOMANDE_CHIAMATO
      - requirements/tech#editor-chat
      - requirements/quality#editor-chat
  pcc83s1y:
    title: Hook dei terminali contro ask
    proposal: 7pk25ac0
    tag: Domande solo da Trama
    finished: 2026-10-18T13:07:42.713Z
    refs:
      - agent-hook
      - requirements/tech#agent-hook
      - requirements/quality#agent-terminal
  aypq8xao:
    title: Riga trama ask ovunque
    proposal: 7pk25ac0
    tag: Domande solo da Trama
    finished: 2026-10-18T13:03:57.620Z
    refs:
      - requirements/rules#agent-terminal
  9racrdd9:
    title: Domande senza ripieghi
    proposal: 7pk25ac0
    tag: Domande solo da Trama
    finished: 2026-10-18T13:02:21.423Z
    refs:
      - question-round
      - agent-questions
      - agent
      - requirements/rules#question-round
      - requirements/rules#General
      - requirements/tech#question-round
---
# Domande solo con trama ask

Le domande dell'agente passano sempre da `trama ask`. Il messaggio di rifiuto è uno solo, condiviso dal codice, e le skill non elencano più ripieghi né chiedono nulla nella conversazione.

Nei terminali di Trama l'hook di omp blocca il tool `ask`, e quello di Claude Code nega `AskUserQuestion` con `trama agent-event question-tool`, in ogni sessione e senza contattare l'editor. Ogni istruzione inviata all'agente contiene la riga che indica `trama ask`.
