---
status: approved
base:
  requirements/data/general.md: new
  requirements/data/area.md: 97d5b7dae9c2306df25e3ec5e8c9ea60eb1325695e8b94593dccf410f640881f
  requirements/data/work.md: new
  requirements/data/agents.md: new
  requirements/data/main.md: 3aa1b0d281315fbd2cb0d4c75f69b664ee8e742a01119ed81c44d992ef211d4d
  requirements/rules/area.md: 5405d436cbfb44de9ce3e6366028306c312a147f3ce9d9667683121491833cfb
  requirements/rules/general.md: new
  requirements/rules/tasks.md: new
  requirements/rules/decisions.md: new
  requirements/rules/agent-terminal.md: new
  requirements/rules/worktrees.md: new
  requirements/rules/project.md: new
  requirements/rules/questions-notices.md: new
  requirements/rules/main.md: d970ae5dbf371ee717d1f1715c9db555ef64358deb99b06fc3e8061b01dfe8d5
  requirements/tech/area.md: 06aa9f00c99a631ad469c427f5e1d13d178fcbe4f810eb5d8642a864a7f70ba1
  requirements/tech/general.md: new
  requirements/tech/agent-terminal.md: new
  requirements/tech/worktrees.md: new
  requirements/tech/work.md: new
  requirements/tech/questions-notices.md: new
  requirements/tech/main.md: 951595999d32b5f9794b970a97dd40ad45df4bc6e70fbaeaafbdedc55d251a38
  requirements/ui/area.md: 67fe3f632baa6c808ff82a6da2942decec9beb4618dcc8cbf70ffd586a10bfa3
  requirements/ui/panel.md: new
  requirements/ui/work.md: new
  requirements/ui/agents.md: new
  requirements/ui/questions-notices.md: new
  requirements/ui/main.md: a76179ae90ddb51e07b30fe8d8c397f8a6cde2b2cc3825c987cf604154b7925a
  requirements/quality/area.md: f12f9d6d15cb07d392b8cef89663cdda29e484f92885decffb60f2a223e74e1b
delete:
  - requirements/data/main.md
  - requirements/rules/main.md
  - requirements/tech/main.md
  - requirements/ui/main.md
created: 2026-10-05T14:18:56.721Z
---
# Dividere i frammenti dei Requisiti oltre 12 KB

I frammenti main di data, rules, tech e ui superano i 12 KB che Trama ora consiglia per frammento: li dividiamo in frammenti medi, così ogni skill dei Requisiti resta piccola e mirata.

Decisioni:
- Taglio per gruppi di Feature vicine, frammenti medi da circa 3 a 11 KB, scelti Area per Area; il testo delle sezioni non cambia.
- Ogni Area ha un frammento general dedicato con la sezione General, tranne ui, dove General resta con il frammento panel.
- quality/main.md resta com'è.
- Una sola Proposal per tutte le Aree.
- Titoli e descrizioni di tutti gli area.md tradotti in italiano; le descrizioni dei nuovi frammenti sono in italiano.
- Nomi dei frammenti in inglese kebab-case, come gli identificativi del Modello.
