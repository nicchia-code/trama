---
refs:
  - panel/Settings
  - requirements/tech#panel/Settings
  - requirements/ui#panel/Settings
  - requirements/ui#agent-terminal
---

# Impostazione Ignora file istruzioni

Quando il Task è fatto, il manifest dell'estensione (`extension/package.json`) dichiara l'impostazione `trama.ignoreInstructionFiles` (titolo «Ignore Instruction Files»): booleana, predefinita disattivata, con ambito `application`, e con la descrizione indicata in `ui#agent-terminal` («With omp: Trama's jobs ignore agent instruction files (AGENTS.md, CLAUDE.md, Cursor rules, .omp/RULES.md) in the project, the folders above it and your user folders. Off by default.»).

In `SETTING_GROUPS` (`extension/src/host/settings-schema.ts`) l'impostazione sta nel gruppo Agent, subito dopo `trama.terminalLocation`, così la scheda Settings del pannello la mostra come Checkbox in quel punto, visibile qualunque sia l'agente scelto (`ui#panel/Settings`). Il test che verifica i gruppi e il loro ordine è aggiornato di conseguenza.

Il valore si legge solo dalle impostazioni utente, come le altre impostazioni con ambito `application` (`tech#panel/Settings`), tramite una funzione `configuredIgnoreInstructionFiles` in `extension/src/host/agent.ts` accanto agli altri lettori `configured*`; un valore assente o non booleano vale disattivato.

Il README dell'estensione elenca la nuova impostazione con la sua descrizione insieme alle altre del gruppo Agent.
