---
created: 2026-10-24T19:02:07.259Z
updated: 2026-10-24T19:02:07.259Z
summary: trama.language is editable in Settings and the wizard, every instruction ends with the language sentence, and skills and fixed texts share one Language section.
tasks:
  - m3lod1ja
  - p80glqst
  - e972yotl
cleared:
  p80glqst:
    title: Lingua in Settings e wizard
    proposal: ft7jlc46
    tag: Language
    finished: 2026-10-24T18:57:28.108Z
    refs:
      - setup-wizard
      - requirements/rules#setup-wizard
      - requirements/ui#setup-wizard
      - requirements/ui#panel/Settings
      - requirements/ui#agent-launching
  m3lod1ja:
    title: Frase della lingua attiva
    proposal: ft7jlc46
    tag: Language
    finished: 2026-10-24T18:56:30.873Z
    refs:
      - agent-terminal
      - requirements/rules#agent-terminal
      - requirements/rules#developer.ASK_MORE
      - requirements/rules#omp-chat-general
      - requirements/tech#agent-terminal
  e972yotl:
    title: Sezioni Language delle skill
    proposal: ft7jlc46
    tag: Language
    finished: 2026-10-24T18:55:09.320Z
    refs:
      - requirements/tech#General
---
# Agent language setting

The trama.language setting works again: it is a free-text field in the Settings tab and in the omp step of the setup wizard. When set, every instruction Trama sends to the agent (also General and Ask more) ends with the sentence asking to write the texts for the developer in that language. The skills, the fixed texts of Ask more, General and Unify Drifts and the implementer sub-agent prompt carry the same Language rule: work texts in the chosen language, Model, Requirements, Specs and code in English.
