---
technical: true
refs:
  - requirements/tech#General
---
# Documentazione e ADR

Quando il Task è fatto, la documentazione dice gli agenti e gli editor supportati: la chat di Cursor, solo in Cursor, e omp, pienamente supportato in Cursor e in ogni editor compatibile, come VS Code.

- Una nuova ADR in `docs/adr/` (la prossima numerazione libera, oggi `0011`) registra la scelta: escono Claude Code, la chat di Copilot e la chat negli editor che non sono Cursor, e dice perché. `0001-vscode-extension-not-fork.md` e `0009-agents-use-the-command-line-only.md` restano, con una riga in testa che rimanda alla nuova ADR per le parti su VS Code come editor di riferimento, Copilot e Claude Code. 0004 e 0006, già superate, non si toccano.
- `README.md` ed `extension/README.md` descrivono solo `trama.agent` con `cursor` e `omp`, tolgono l'esempio di Claude Code, il modo di scegliere i modelli di Copilot e `.claude/skills`, e dicono che con `cursor` fuori da Cursor l'istruzione va negli appunti con l'invito a scegliere omp. Il titolo di `extension/README.md` non dice più «for VS Code».
- `docs/cli.md` non ha più `hook copilot`, `hook claude-question-tool`, la sezione degli hook di Copilot, il paragrafo su Claude Code né le cartelle `.claude/skills` e `.github/skills`; `docs/model-format.md` elenca solo le cartelle delle skill rimaste.
- `docs/uat.md` prova la chat in Cursor e omp sia in Cursor sia in VS Code; le righe di Copilot e di Claude Code e quella di `.claude/skills` si tolgono o si riscrivono. La riga di `tech#General` sull'anteprima di Windows nomina Cursor (chat e omp) e VS Code (omp).
- Lo smoke test del pacchetto Windows nel workflow della release lancia `hook cursor` con `{}` su standard input al posto di `hook copilot`, e controlla che risponda `{}` ed esca con 0.
- `CHANGELOG.md` registra la rimozione sotto `## Unreleased`, con i valori di `trama.agent` tolti e il loro ripiego su `cursor`, i comandi `trama hook` tolti, la pulizia dei pezzi di Copilot e il nuovo avviso fuori da Cursor.
- Fuori dalla nuova ADR e dal `CHANGELOG.md`, nessun codice, skill o documento nomina più Claude Code o Copilot come agenti supportati; restano le citazioni che non riguardano il supporto, come le misure del budget delle skill.
