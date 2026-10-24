---
refs:
  - setup-wizard
  - requirements/rules#setup-wizard
  - requirements/ui#setup-wizard
  - requirements/ui#panel/Settings
  - requirements/ui#agent-launching
---
# Lingua in Settings e wizard

L'impostazione `trama.language` torna modificabile e si sceglie anche nel wizard di setup.

- Scheda Settings: `trama.language` resta nel gruppo `omp` ed è un `Input` di testo libero modificabile come gli altri, senza la nota `Disabled for now: agents write in English.`. Un valore già salvato vale da subito. Quando il workspace ha un valore diverso da quello utente mostra l'avviso `The workspace setting overrides this: <valore>.` come `trama.skillsDir`.
- Wizard: il passo `omp` chiede `trama.ompPath`, `trama.terminalLocation`, `trama.ignoreInstructionFiles` e `trama.language`, con lo stesso titolo, la stessa spiegazione e lo stesso `Input` della scheda Settings. `trama.autoExit` resta fuori dal wizard.
- La spiegazione dell'impostazione (`markdownDescription` in `extension/package.json`) è «The language the agent writes tasks, drifts, proposals, questions and replies in, for example `Italian`. The Model, Requirements, Specs and code stay in English. Empty (the default) keeps English.».
- I testi dell'interfaccia restano in inglese e non seguono `trama.language`.
- I test del wizard e dei Settings provano che il campo è abilitato, senza nota, e che il passo `omp` del wizard lo contiene.
