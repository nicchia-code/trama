---
created: 2026-10-21T05:07:29.960Z
updated: 2026-10-21T05:07:29.960Z
summary: "Gli agenti supportati sono due: la chat di Cursor (solo in Cursor) e omp in ogni editor; escono Claude Code e la chat di Copilot, con hook, impostazioni, skill e documentazione."
tasks:
  - 0qb3t0da
  - dodhd3c3
  - ewimd8xh
  - ewtc84bi
  - febwzftr
  - hrelflvs
  - jotw5fvk
  - nz768be5
  - sjbbl34c
  - sp2gp6y4
  - uv02b9vs
  - ws19kk8g
cleared:
  jotw5fvk:
    title: Solo chat Cursor e omp
    proposal: 2oj2rgp7
    tag: omp e Cursor
    finished: 2026-10-21T05:04:04.146Z
    refs:
      - agent-terminal
      - requirements/tech#agent-terminal
      - requirements/rules#agent-terminal
      - requirements/ui#agent-terminal
      - requirements/quality#agent-terminal
  0qb3t0da:
    title: Agenti e modelli
    proposal: 2oj2rgp7
    tag: omp e Cursor
    finished: 2026-10-21T05:02:28.475Z
    refs:
      - agent-launching
      - requirements/tech#agent-launching
      - requirements/rules#agent-launching
      - requirements/ui#agent-launching
      - requirements/quality#agent-launching
  uv02b9vs:
    title: Solo hook di Cursor
    proposal: 2oj2rgp7
    tag: omp e Cursor
    finished: 2026-10-21T05:01:36.080Z
    refs:
      - editor-chat
      - editor-chat.AGENT_INTERRUPTED
      - editor-chat.CONVERSATION_CLOSED
      - requirements/tech#editor-chat
      - requirements/quality#editor-chat
      - requirements/cli#General
  sp2gp6y4:
    title: Domande solo per due agenti
    proposal: 2oj2rgp7
    tag: omp e Cursor
    finished: 2026-10-21T05:01:34.582Z
    refs:
      - question-round
      - requirements/tech#question-round
      - requirements/rules#question-round
  ewtc84bi:
    title: Documentazione e ADR
    proposal: 2oj2rgp7
    tag: omp e Cursor
    finished: 2026-10-21T05:01:31.496Z
    refs:
      - requirements/tech#General
  sjbbl34c:
    title: Skill e pulizia di Copilot
    proposal: 2oj2rgp7
    tag: omp e Cursor
    finished: 2026-10-21T05:01:27.267Z
    refs:
      - project/Not a Trama project/developer.INITIALIZE_PROJECT
      - project/Trama project/developer.UPDATE_SKILLS
      - project/Trama project/developer.OPEN_PANEL
      - requirements/rules#project
  ws19kk8g:
    title: Settings solo Cursor e omp
    proposal: 2oj2rgp7
    tag: omp e Cursor
    finished: 2026-10-21T05:00:24.728Z
    refs:
      - panel/Settings
      - panel/Closed/developer.SHOW_SETTINGS
      - developer.SHOW_SETTINGS
      - requirements/tech#panel/Settings
      - requirements/ui#panel/Settings
      - requirements/quality#panel/Settings
      - requirements/rules#panel/Board
  hrelflvs:
    title: Impronta senza cartelle vecchie
    proposal: 2oj2rgp7
    tag: omp e Cursor
    finished: 2026-10-21T05:00:18.481Z
    refs:
      - requirements/tech#work
      - requirements/rules#work
  nz768be5:
    title: Hook solo di omp
    proposal: 2oj2rgp7
    tag: omp e Cursor
    finished: 2026-10-21T05:00:08.655Z
    refs:
      - agent-hook
      - terminal
      - requirements/tech#agent-hook
  ewimd8xh:
    title: "Modello Proposal: cursor e omp"
    proposal: 2oj2rgp7
    tag: omp e Cursor
    finished: 2026-10-21T04:59:50.428Z
    refs:
      - requirements/data#proposal
      - requirements/ui#proposal
  dodhd3c3:
    title: Annunci solo con Cursor
    proposal: 2oj2rgp7
    tag: omp e Cursor
    finished: 2026-10-21T04:59:29.356Z
    refs:
      - announcement
      - requirements/tech#announcement
      - requirements/rules#announcement
      - requirements/data#announcement
  febwzftr:
    title: Task presi senza Copilot
    proposal: 2oj2rgp7
    tag: omp e Cursor
    finished: 2026-10-21T04:59:20.171Z
    refs:
      - task
---
# Solo chat di Cursor e omp

Il lancio degli agenti, i modelli, gli hook, le impostazioni, le skill, le domande e la documentazione (con una nuova ADR) seguono ora solo la chat di Cursor e omp. `trama.agent` vale `cursor` (predefinito) o `omp`: ogni altro valore, compresi i vecchi `chat` e `claude`, vale `cursor` senza riscrivere l'impostazione. Fuori da Cursor con l'agente `cursor` nessun lavoro parte: l'istruzione va negli appunti con un avviso e il pulsante Open Settings. La riga di comando del terminale è solo quella di omp, con il suo hook; spariscono gli hook di Claude Code e di Copilot, i loro suggerimenti di modelli e i Task presi dalla chat di Copilot. L'impronta del codice non esclude più `.claude/skills` e `.github/skills`.
