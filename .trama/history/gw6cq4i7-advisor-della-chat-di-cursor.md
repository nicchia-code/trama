---
created: 2026-10-21T11:59:06.996Z
updated: 2026-10-21T11:59:06.996Z
summary: Con l'Advisor Scanner acceso anche la chat di Cursor ha il suo advisor, il sotto-agente trama-advisor, con hook, stato dell'editor e identità per conversazione di schede, annunci, Task e Drift.
tasks:
  - 1vedqgj1
  - 4jc1l8wb
  - bhsu8x0j
  - dk6jpt8h
  - lmqeyse9
  - wc93tx2p
  - bjnq19ee
  - c3jjbasp
  - penhvq3j
  - ph5lqydg
  - pm3rg0fk
  - s79p9ar2
  - x5x3wtih
cleared:
  ph5lqydg:
    title: Avviso revisione finale mancata
    proposal: n97kq4ls
    tag: Cursor first citizen
    finished: 2026-10-21T11:57:20.395Z
    refs:
      - chat-advisor/Finita senza revisione finale
      - requirements/ui#chat-advisor
  penhvq3j:
    title: Istruzione e regole dell'Advisor
    proposal: n97kq4ls
    tag: Cursor first citizen
    finished: 2026-10-21T11:55:42.498Z
    refs:
      - agent-launching
      - agent-terminal
      - requirements/rules#work
      - requirements/tech#agent-launching
      - requirements/quality#agent-launching
  bjnq19ee:
    title: Advisor della chat nell'host
    proposal: n97kq4ls
    tag: Cursor first citizen
    finished: 2026-10-21T11:54:08.496Z
    refs:
      - chat-advisor
      - agent.ADVISOR_REVIEWED
      - requirements/rules#chat-advisor
      - requirements/cli#General
  x5x3wtih:
    title: Ritiro annunci per conversazione
    proposal: n97kq4ls
    tag: Cursor first citizen
    finished: 2026-10-21T11:46:50.189Z
    refs:
      - announcement
      - requirements/rules#announcement
  c3jjbasp:
    title: Identità della conversazione
    proposal: n97kq4ls
    tag: Cursor first citizen
    finished: 2026-10-21T11:44:33.969Z
    refs:
      - editor-chat
      - requirements/tech#editor-chat
      - requirements/quality#editor-chat
      - requirements/tech#work
  1vedqgj1:
    title: Hook e stato dell'Advisor chat
    proposal: n97kq4ls
    tag: Cursor first citizen
    finished: 2026-10-21T11:40:18.661Z
    refs:
      - editor-chat.FILES_CHANGED
      - editor-chat.TOOL_FINISHED
      - editor-chat.SUBAGENT_STOPPED
      - editor-chat.SUBAGENT_INTERRUPTED
      - editor-chat.TURN_FINISHING
      - requirements/tech#chat-advisor
  pm3rg0fk:
    title: Advisor Scanner con ogni agente
    proposal: n97kq4ls
    tag: Cursor first citizen
    finished: 2026-10-21T11:37:52.607Z
    refs:
      - panel
      - requirements/ui#panel
      - requirements/ui#panel/Settings
      - requirements/tech#panel/Settings
  s79p9ar2:
    title: Task presi per conversazione
    proposal: n97kq4ls
    tag: Cursor first citizen
    finished: 2026-10-21T11:37:52.132Z
    refs:
      - task/Taken by the agent
      - requirements/rules#task/Taken by the agent
      - requirements/data#task
  4jc1l8wb:
    title: Schede in attesa per conversazione
    proposal: n97kq4ls
    tag: Cursor first citizen
    finished: 2026-10-21T11:36:21.211Z
    refs:
      - panel/Board
      - requirements/rules#panel/Board
      - requirements/tech#panel/Board
  bhsu8x0j:
    title: Annunci con la conversazione
    proposal: n97kq4ls
    tag: Cursor first citizen
    finished: 2026-10-21T11:36:20.943Z
    refs:
      - announcement/Announced
      - requirements/data#announcement
      - requirements/tech#announcement
  lmqeyse9:
    title: Corsa con l'Advisor in chat
    proposal: n97kq4ls
    tag: Cursor first citizen
    finished: 2026-10-21T11:35:38.767Z
    refs:
      - task
  dk6jpt8h:
    title: Job dei Drift in chat
    proposal: n97kq4ls
    tag: Cursor first citizen
    finished: 2026-10-21T11:35:33.490Z
    refs:
      - drift
      - requirements/tech#drift-resolution
      - requirements/data#drift-resolution
  wc93tx2p:
    title: Sotto-agenti e hook installati
    proposal: n97kq4ls
    tag: Cursor first citizen
    finished: 2026-10-21T11:35:13.854Z
    refs:
      - project
---
# Advisor della chat di Cursor

L'Advisor Scanner vale con ogni agente: nella chat di Cursor la corsa salta pre-flight e scansione finale, e un sotto-agente di revisione (`trama-advisor`) guarda l'agente principale e ogni sotto-agente che realizza un Task, che corregge le differenze prima del Done.

Gli hook di Cursor traducono modifiche ai file, fine degli strumenti e dei sotto-agenti e fine del turno negli eventi dell'Advisor, leggendo un file di stato scritto da ogni finestra dell'editor; un hook `preToolUse` sulla shell completa i comandi `trama` con `TRAMA_CHAT` e `TRAMA_JOB`.

Ogni conversazione di Trama è un agente a sé: le schede in attesa, gli annunci (con il nuovo campo `conversation`), i Task presi (`cursor:<conversazione>`) e il ritiro degli annunci seguono la conversazione, e i Drift della chat hanno il loro `job` (`trama drift list` con `currentJob`). La Board avvisa quando un Run finisce senza la revisione finale; i pulsanti Scan restano spenti con qualunque agente; `trama-analysis` e `trama-advisor` sono installati con gli hook.
