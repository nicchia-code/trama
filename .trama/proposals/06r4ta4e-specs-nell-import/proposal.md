---
status: approved
base:
  model-changes/proposal.md: 5f1751e05105567d524a09061f7ff496f02daffb65e8ecdb04a52bc5a2885ca4
  requirements/rules/decisions.md: baa83f4dc816ef3e919ad1ec54a9409f3ec858cf4fd637ef3c5423a4b24e7e56
  requirements/rules/approvals.md: new
delete: []
created: 2026-10-20T21:50:10.964Z
label: Import Specs
---
# Specs nell'import

Un progetto partito da Import from Code ha la scheda Specs vuota: l'import scrive lo stack in prosa nei Requisiti `tech`, mentre il setup di Start from Scratch scrive le Specs. L'import deve descrivere anche le tecnologie del codice nelle Specs, come il setup, ma deducendole dai file del repository.

Decisioni del developer:
- Lo stack (linguaggi, framework, librerie, test, CI, rilascio…) sta solo nelle Specs, come nel setup; i Requisiti `tech` dell'import hanno solo vincoli e struttura.
- Le Specs sono dedotte dai file: nessuna voce ha `chosenByAgent`.
- `specs.yaml` va nella prima Proposal dell'import, «Import: System and Actors».
- Versione: solo quella principale dichiarata.
- In `frameworks` solo i framework e le librerie che danno forma al codice.
- Si riempiono i campi che un file del repository dichiara; gli altri restano vuoti.
- Su un progetto con Specs già presenti l'import le aggiorna: aggiunge ciò che manca e corregge versioni e note.
- Una voce che il codice non usa più resta e finisce fra i dubbi della Proposal.

Scelte mie da verificare:
- `notes` porta solo vincoli scritti nei file (per esempio engines o piattaforme supportate).
- Se l'import non trova nulla di nuovo oltre alle Specs, la prima Proposal porta solo loro invece di essere saltata.
- Per far posto alle regole nuove in `rules#proposal`, la sezione `proposal/Approved` passa senza cambiare testo in un nuovo fragment `rules/approvals.md`: `rules/decisions.md` era a 12.065 byte su 12.288.
