---
status: approved
base:
  actors/terminal.md: 301264a04cc2638bec50037c019b7c0c981bddd90f083d6156f10d4b447df44f
  actors/agent-hook.md: cab8e35372d156d37e3121a32ab53e45aa703714cc996c8fc74e27c6ac44d09e
  actors/editor-chat.md: new
  actors/cursor-chat.md: 83b6f9b4b6d9c1e76b1f3516a04f1cbee72715fbeb742583f1a6eaee95bc6ab0
  actors/time.md: a2ee702c64d24e2ffec35fc9b72c00102986693a484e2db0e85ce8b355e10a29
  agent-launching/agent-terminal.md: 0b2e31f016c0af35113fbb1d1abb8c3b76fad8e106005f0c145146d27c01d733
  agent-launching/feature.md: 3771346f9959b127c48be0c922c8a945fedae48728a2b91282ec61fc5928b52d
  agent-launching/drift-resolution.md: f9f4b51d8fb47fd08fffee0a8c47f5a0e81d737b980f9e77f20f77190687f721
  work/task.md: 8ff89b5b23262e7e9245eb0247897569c030bf20a9c2031720819b72f2142817
  work/announcement.md: 4eff31347d9f796480b8cdf22961bc18ca5be7da80fffd7872bc584deb73d4b3
  editor-panel/panel.md: 7f20923815ef6c9384d1ce350294d841ca810dc706241c7b7a2019e3ae7e18ae
  project-setup/project.md: 1f9090927ba8d0a4af4f1cba5bb42e57fb1bac8345861962017da3c9e8d7cb50
  requirements/rules/agent-terminal.md: 8c63bdb925c9ce60d2212af39da87f38ff78071d3f99104983c11aec977b88e4
  requirements/rules/models.md: 9a369c99de624e510f36d2c94487a0fe04bf7756cdac0d582703e0f4bba15c8d
  requirements/tech/agent-terminal.md: 2909771d822d346ba9765c0fc53f6e5bbdb1ac46d8f667c609478388e0973055
  requirements/tech/models.md: 6565a242e2d4c1025972413890d613b01e5277aa3ac1b5a613a2195d438fbc66
  requirements/tech/agent-hooks.md: new
  requirements/tech/editor-chat.md: new
  requirements/ui/agents.md: 5df9feb75f5eed98267a8b30d141c484a9da5ab192e44411b80a31d2de560415
  requirements/quality/main.md: 6b98f71e58e736861507fd7608e21c7c992ebac251f662fe1ba7d2a423b346b4
  requirements/tech/omp-hook.md: f7b582a39089f9a9a6768c0f0f7d8e55ddab9b146add42cff47f447bd9d55f2c
  requirements/tech/cursor-chat.md: 765a63175240571333123b34bcae2d385031e5342220fcc9deca8179d252701c
  requirements/rules/announcements.md: fe9e9be13131265ff8907a9bfb865506b42247ab11043684b861f749e5d6a6bb
  requirements/rules/drifts.md: 2df38516aa9a3306405579beb950ac14911de0935c0066d40f489eede8a3e5f9
  requirements/rules/tasks.md: d443b93ed5f0ad1feff445ad303eaf31df51e181a0d1400cb81c57a10160dd87
  requirements/tech/announcements.md: 69c9c4775d6e95c4d11c7682f309d346d2fe3ded3c0f9acfe5c4256de5be5c36
  requirements/data/work.md: 9fc5c335f2431c2acacf80f0a9a0877dc9cf21d6b1d609693c63bbf69606da3c
  requirements/data/agents.md: b5386487059ede5783066d18e1dcb1984f4be314f8fd1402aa6241b01017fd48
  requirements/ui/panel.md: d44823c9fba22121b4e6c02653bcc57cbe1b58f3b909483275a8e2638193cc57
  requirements/tech/general.md: 7fe7a1a583a4587d13f67a46fad0e2302149781cd700ced7dde5e56c8bcfb3eb
delete:
  - actors/cursor-chat.md
  - actors/time.md
  - requirements/tech/omp-hook.md
  - requirements/tech/cursor-chat.md
request: 2026-10-10T13-39-06
created: 2026-10-10T12:10:06.071Z
scanScope:
  - ref: agent-launching
    reason: changed
  - ref: agent-hook
    reason: changed
  - ref: agent-hook.IDLE
    reason: changed
  - ref: editor-chat
    reason: changed
  - ref: editor-chat.PROMPT_SUBMITTED
    reason: changed
  - ref: editor-chat.AGENT_STOPPED
    reason: changed
  - ref: editor-chat.AGENT_INTERRUPTED
    reason: changed
  - ref: editor-chat.CONVERSATION_CLOSED
    reason: changed
  - ref: terminal
    reason: changed
  - ref: terminal.COMMAND_ENDED
    reason: changed
  - ref: terminal.CLOSED
    reason: changed
  - ref: agent-terminal
    reason: changed
  - ref: agent-terminal/Agent running
    reason: changed
  - ref: agent-terminal/Agent idle
    reason: changed
  - ref: agent-terminal/Closed
    reason: changed
  - ref: drift-resolution
    reason: changed
  - ref: drift-resolution/Free/developer.ASK_AGENT
    reason: changed
  - ref: drift-resolution/Running tasks/agent-hook.IDLE
    reason: changed
  - ref: drift-resolution/Running tasks/editor-chat.AGENT_STOPPED
    reason: changed
  - ref: drift-resolution/Running tasks/editor-chat.AGENT_INTERRUPTED
    reason: changed
  - ref: drift-resolution/Running tasks/editor-chat.CONVERSATION_CLOSED
    reason: changed
  - ref: drift-resolution/Running tasks
    reason: removed, its container
  - ref: drift-resolution/Resolving/agent-hook.IDLE
    reason: changed
  - ref: drift-resolution/Resolving/terminal.COMMAND_ENDED
    reason: changed
  - ref: drift-resolution/Resolving/editor-chat.AGENT_STOPPED
    reason: changed
  - ref: drift-resolution/Resolving/editor-chat.AGENT_INTERRUPTED
    reason: changed
  - ref: drift-resolution/Resolving/editor-chat.CONVERSATION_CLOSED
    reason: changed
  - ref: drift-resolution/Resolving
    reason: removed, its container
  - ref: panel
    reason: changed
  - ref: panel/Board
    reason: changed
  - ref: project/Not a Trama project/developer.INITIALIZE_PROJECT
    reason: changed
  - ref: project/Trama project/developer.UPDATE_SKILLS
    reason: changed
  - ref: announcement
    reason: changed
  - ref: announcement/Announced
    reason: changed
  - ref: task
    reason: changed
  - ref: task/Taken by the agent
    reason: changed
  - ref: panel/Open/developer.SHOW_BOARD
    reason: leads into a change
  - ref: task/To do/agent.MOVE_TASK_TO_DOING
    reason: leads into a change
  - ref: task/In progress/agent.MOVE_TASK_TO_DOING
    reason: leads into a change
  - ref: task/Done/agent.MOVE_TASK_TO_DOING
    reason: leads into a change
  - ref: drift-resolution/Running tasks/terminal.COMMAND_ENDED
    reason: leads into a change
  - ref: drift-resolution/Running tasks/terminal.CLOSED
    reason: leads into a change
  - ref: drift-resolution/Resolving/terminal.CLOSED
    reason: leads into a change
  - ref: requirements/data#drift-resolution
    reason: changed
  - ref: requirements/data#announcement
    reason: changed
  - ref: requirements/quality#editor-chat
    reason: changed
  - ref: requirements/quality#agent-launching
    reason: changed
  - ref: requirements/quality#agent-terminal
    reason: changed
  - ref: requirements/rules#agent-terminal
    reason: changed
  - ref: requirements/rules#design-request
    reason: changed
  - ref: requirements/rules#announcement
    reason: changed
  - ref: requirements/rules#drift-resolution
    reason: changed
  - ref: requirements/rules#agent-launching
    reason: changed
  - ref: requirements/rules#work
    reason: changed
  - ref: requirements/rules#task
    reason: changed
  - ref: requirements/tech#agent-hook
    reason: changed
  - ref: requirements/tech#agent-terminal
    reason: changed
  - ref: requirements/tech#announcement
    reason: changed
  - ref: requirements/tech#editor-chat
    reason: changed
  - ref: requirements/tech#General
    reason: changed
  - ref: requirements/tech#agent-launching
    reason: changed
  - ref: requirements/ui#design-request
    reason: changed
  - ref: requirements/ui#agent-terminal
    reason: changed
  - ref: requirements/ui#agent-launching
    reason: changed
  - ref: requirements/ui#panel
    reason: changed
  - ref: requirements/quality
    reason: removed, its container
  - ref: requirements/tech
    reason: removed, its container
---
# Four supported agents, hooks for all, no external terminal, autoExit

Prima Proposal della richiesta di design «Rimozione feature di prova»: taglio netto dell'avvio dell'agente per semplificare il codice. Le Proposal che la seguono (scansioni; blocco dei comandi e scheda gialla) la richiedono.

Decisioni prese nell'intervista:
- Restano quattro agenti: Copilot (chat di VS Code), Cursor (chat di Cursor), omp e Claude Code (terminale integrato, nell'area o in una scheda). Spariscono Codex, Copilot CLI, Cursor CLI e il comando personalizzato.
- Il terminale esterno sparisce del tutto, con l'impostazione `trama.externalTerminalCommand` e il riuso delle finestre.
- Due impostazioni nuove al posto di `trama.agentLauncher`, `trama.terminalAgent`, `trama.agentCommand`: `trama.agent` (`chat`, predefinito; `omp`; `claude`) e `trama.terminalLocation` (`panel`, predefinito; `editor`). Le vecchie impostazioni sono ignorate, senza migrazione. Nessuna scelta dell'agente al primo avvio.
- Hook per tutti e quattro: Claude Code li riceve nel comando di avvio, come `--hook` per omp; la chat di Copilot con un file hook a livello utente installato dall'estensione, come per Cursor.
- La quiete di quindici minuti è tolta: fine del lavoro solo da hook, fine del comando, chiusura del terminale o della conversazione. Il segnale di vita di omp, che serviva solo alla quiete, sparisce.
- Un turno della chat concluso normalmente ritira gli annunci e libera i Task presi, come l'hook a riposo nel terminale.
- Un solo Actor `editor-chat` per le due chat, al posto di `cursor-chat`, con gli stessi Event; la descrizione dice quali Event ogni chat produce.
- `trama.autoExit` (predefinito acceso): il terminale dell'agente si chiude subito quando l'agente va a riposo o il suo comando finisce; le chat non si toccano. Nessun terminale si riusa più, con l'opzione accesa o spenta: ogni istruzione apre un terminale nuovo.
- La scheda del pannello prende il nome del Sistema del Modello, con il nome della cartella quando il Modello è vuoto.

Scelte mie da verificare: la Machine Agent terminal descrive ora un singolo terminale aperto da Trama (Agent running → Agent idle / Closed) perché senza riuso non c'è più «l'ultimo terminale» da ricordare; il frammento `tech/omp-hook` diventa `tech/agent-hooks` e `tech/cursor-chat` diventa `tech/editor-chat`; l'avviso una tantum sui ruoli dei modelli in chat resta com'è.
