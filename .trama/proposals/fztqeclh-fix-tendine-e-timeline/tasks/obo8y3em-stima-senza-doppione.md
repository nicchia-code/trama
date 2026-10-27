---
refs:
  - proposal/Open
  - requirements/ui#proposal/Open
  - requirements/rules#team
  - requirements/cli#issue
---
# Stima senza doppione

Il campo stima del GitHub Project collegato non compare più due volte nella preview di una issue di un handoff. Il campo stima è il primo campo numerico del Project il cui nome contiene `estimate` o `days`, senza badare alle maiuscole (`estimateField` di `src/core/timeline.ts`): la pubblicazione lo riempie già con la stima della issue, che il Manager vede e cambia in `Estimate (days)`.

Oggi `fieldEditors` di `extension/src/webview/team/logic.ts` salta solo i campi iterazione e quelli propri del Project, così il campo stima compare una seconda volta fra gli altri campi, vuoto e con `Proposed by the agent`.

Quando il Task è finito:
- Nella colonna dei campi della preview non c'è un campo per il campo stima del Project; tutti gli altri campi restano come oggi.
- `trama issue fields` segna il campo stima come segna il campo sprint (`— estimate field` nel testo), e in `--json` ogni campo ha i booleani `sprint` ed `estimate`.
- La skill `trama-handoff` (`skills/trama-handoff/SKILL.md`, regola **Other fields**) dice all'agente di non proporre un valore per il campo stima segnato da `trama issue fields`, perché la pubblicazione lo riempie con la stima; la stima resta il campo `estimate` dell'issue.
- Lo screenshot della guida `team-handoff-preview` è rigenerato (solo quella scena) e non mostra più il secondo `Estimate`.
