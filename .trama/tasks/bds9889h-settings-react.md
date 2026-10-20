---
column: done
technical: false
refs:
  - panel/Settings
  - panel/Open/developer.SHOW_SETTINGS
  - requirements/ui#panel/Settings
  - requirements/tech#panel/Settings
drift: null
proposal: p5ty6g5g
agent: false
created: 2026-10-20T21:11:40.631Z
finished: 2026-10-20T21:26:43.471Z
---
# Settings in React

Si fa dopo «Base React e shadcn».

- **Nuova impostazione `trama.theme`.**
  - Nel manifest è un enum `auto`, `light`, `dark`, con default `auto`, `scope: "application"`, `enumDescriptions` e descrizione.
  - Si legge solo il valore utente.
  - L'host la manda con il messaggio `settings`, come le altre impostazioni. Un cambio vale subito, senza ricaricare: con `auto` il pannello segue l'editor, con `light` o `dark` è fisso.
- **Gruppi.** Settings ha cinque gruppi: `Appearance` (solo `Theme`) in cima, poi Agent, Models, Project ed Experimental, con l'ordine e i testi di `ui#panel/Settings`.
- **Controlli, tutti di shadcn/ui.**
  - Enum come `Select`, booleani come `Checkbox`, numeri e testi come `Input`.
  - La «i» apre un `Popover`, con le regole di apertura e chiusura di prima.
  - `Analysis`, `Scan` ed `Execution` sono una `Combobox`: filtra mentre scrivi, una voce scelta conferma subito, un testo libero conferma alla perdita del fuoco o con Invio.
  - Senza suggerimenti il campo resta un `Input`.
- **Comportamenti invariati.** Salvataggio immediato nelle impostazioni utente, valori non validi, errori di scrittura e conferma della delega dei Drift funzionano come prima.
- **Codice vecchio.** Il codice di disegno della scheda Settings sparisce.
- **Test**, con Testing Library:
  - il cambio di `Theme` cambia la classe del tema;
  - la `Combobox` filtra e conferma;
  - un enum salva il valore scelto;
  - `Esc` chiude il `Popover` lasciando il fuoco sulla «i».
