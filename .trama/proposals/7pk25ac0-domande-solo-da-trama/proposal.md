---
status: approved
base:
  agent-questions/feature.md: 787273f458ccb0304d6861b247676b81cbe07ab9fee91f58f7c75a76f880ee77
  agent-questions/question-round.md: d51a5aea236fb5f6ae31f417e701641480684c5093c8750c3d647c92e5efbb78
  actors/agent.md: a93d25242f0481617c17c81cde2a97a8353d000d36f531b13b99a1dff96da5b9
  actors/editor-chat.md: 7a0b02e4000d3a4538ae4c02f024e738763ad2df28c2028566c8feaff8327808
  actors/agent-hook.md: 83a7b02cb8a702a9d5c245d8b27c89d89b9cfc0457d6e2e6284cc1484defa68e
  requirements/rules/questions-notices.md: 3736d16b85703cee8b3550fe5aa8625ca814bb5ba5e3b5405ddf97bc9737a75b
  requirements/tech/questions-notices.md: 5c29d4bbf1909ac4ddbe981cdce1dcc281b94f9a6ac9fe12a5aa0f825e88a3bd
  requirements/tech/editor-chat.md: d2e0312634723bb6119ef3d0afe05ae5b62665626147fce8b9065b869a6878aa
  requirements/tech/agent-hooks.md: 6f4990614322ac7d3f33353c708490a1dfaeec7568492012a890c93ff3aac453
  requirements/quality/main.md: 118542267ab29143fa7b45353631ca69bfc46ab274ac11cff1feb28d5b80ce66
  requirements/rules/agent-terminal.md: 96a0056f7119fd13f3d4b9fc3ca7147bf6d63352155aa67b1967d7fefec6686a
  requirements/rules/general.md: 8eef64ee8708844786d06f096d52e344592a1b3d25d6d81f5c290dab5b215924
delete: []
request: 2026-10-18T14-33-16
created: 2026-10-18T12:42:36.931Z
label: Domande solo da Trama
---
# Domande solo da Trama

Cursor continua a fare domande con il proprio tool di domande. Non deve succedere con nessun agente (Cursor, Copilot, omp, Claude Code): ogni domanda al developer passa dal round di domande di Trama, nel suo overlay.

Decisioni dell'intervista:
- Editor non disponibile: l'agente non chiede in nessun altro modo; si ferma, dice al developer di aprire il progetto nell'editor con Trama e rilancia lo stesso `trama ask` quando il developer gli dice di continuare. Il ritentativo fuori dalla sandbox di Cursor resta.
- Blocco: gli hook di Trama rifiutano il tool di domande dell'agente in tutti e quattro gli agenti, e le skill tolgono ogni ripiego e vietano quei tool per nome.
- Ambito: solo le conversazioni e i terminali di Trama; le altre conversazioni del developer restano libere.
- Scan e implement: ogni domanda passa da `trama ask`; approvare, rifiutare, scartare o risolvere un Drift non diventa una domanda: l'agente si ferma e dice che la decisione è del developer, sulla Board.
- Riga `Ask the developer only with trama ask`: in ogni istruzione, per ogni lavoro e ogni agente.
- Claude Code: hook `PreToolUse` su `AskUserQuestion` nello stesso `--settings`.
- Guasto dell'hook o editor che non risponde: il tool passa; solo una risposta chiara «conversazione di Trama» lo rifiuta.
- Messaggio di rifiuto: breve, rimanda a `trama ask --root <project>` come dice la skill.
- Copilot: `PreToolUse` a ogni chiamata di tool, deciso subito dal nome; l'editor è contattato solo per `vscode_askQuestions`.
- Scan dentro un Run: non fa domande, scrive il dubbio nel resoconto; uno scan chiesto a mano chiede con `trama ask`.
- `reason` di `unavailable`: dice all'agente di fermarsi e chiedere l'editor (fuori sandbox), o di ripetere fuori dalla sandbox e poi fermarsi.
