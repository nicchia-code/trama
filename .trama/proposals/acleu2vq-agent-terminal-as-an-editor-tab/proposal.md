---
status: approved
base:
  actors/terminal.md: 6b294e0427f396c4bb882c4ba05735dea2ec90c5d56a5729a0afcbc5063a6cec
  agent-launching/agent-terminal.md: c0f21687b1973b900eb3bdccd52fb5d6a2615038cf384775b943b7e69d2a5b68
  requirements/tech/agent-terminal.md: 237feef5a93afa5304174eee52d05115584b3a82394aa9c20e32efef37eb7d57
  requirements/ui/agents.md: 8755ea7fed7040fa5d01b060641a4f3b0bb94823c0fa848fa84efecff793cf0a
  requirements/tech/worktrees.md: 816425d996438aab99deb5a6f746518e2adf7cfa1c0e99439c8a5d62f3ac5bc8
delete: []
created: 2026-10-05T17:18:49.779Z
---
# Agent terminal as an editor tab

Il developer vuole poter far girare l'agente in una scheda dell'editor (VS Code o Cursor) invece che nell'area dei terminali in basso.
- Nuovo valore del launcher `terminal-tab`, accanto a `auto`, `terminal`, `external-terminal` e `chat`: è il terminale integrato dell'editor aperto come scheda.
- «auto» non cambia: la scheda si ottiene solo scegliendo `terminal-tab` a mano.
- La scheda si apre accanto al gruppo attivo, così il pannello Trama (e l'overlay delle domande) resta visibile.
- Se la scheda precedente dell'agente è ancora aperta e ne serve una nuova, la nuova va nello stesso gruppo della precedente.
- La scheda prende il focus quando Trama la apre o la riusa, come oggi il terminale in basso.
- I terminali dei worktree restano nell'area dei terminali in basso, con qualunque launcher.
