---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
  - requirements/ui#proposal
  - requirements/ui#task
  - requirements/ui#voce-history
  - requirements/tech#proposal
drift: null
proposal: p5ty6g5g
agent: false
created: 2026-10-20T21:11:40.631Z
finished: 2026-10-20T21:34:38.933Z
---
# Board in React

Si fa dopo «Base React e shadcn» e «Settings in React»: la modale del modello usa la `Combobox` di Settings.

- **Componenti.** La Board è rifatta in React con i componenti di shadcn/ui:
  - colonne, schede `Card` (Proposal, risoluzioni gialle, Drift rossi, Task, schede di attesa, ghost);
  - badge e tag `Badge`;
  - pulsanti `Button` con le icone lucide di `ui#panel`;
  - modali `Dialog` (corpo della Proposal, voce di History, modello della Proposal);
  - menu del periodo della History come `Select`;
  - tooltip `Tooltip`.
- **Cosa resta uguale.** Testi, ordine, conteggi, motivi di disabilitazione, nomi accessibili e messaggi all'host sono quelli dei Requisiti.
  - I colori semantici vengono dalla palette di Tailwind del tema del pannello: tag fra sei colori, pallini di stato, schede rosse e gialle, bordo animato blu-ciano tolto con la riduzione del movimento.
  - La logica di `board/logic.ts` resta e si usa così com'è.
- **Codice vecchio.** Il codice di disegno della Board (`board/render.ts`, `board/index.ts`, le modali, `board.css`) sparisce.
- **Test.** I test di `board-render` passano a Testing Library. Provano:
  - schede e righe dei Task;
  - badge `blocked` e `waiting`;
  - `Run all` disabilitato con il motivo;
  - apertura e chiusura delle modali con `Esc`;
  - il pulsante della modale del modello.
