---
technical: false
refs:
  - panel/Settings
  - panel/Closed/developer.SHOW_SETTINGS
  - panel/Open/developer.SHOW_SETTINGS
  - requirements/ui#panel/Settings
  - requirements/tech#panel/Settings
  - requirements/ui#agent-launching
---

# Impostazione Context Sharing

Quando il Task è fatto, nella scheda Settings (raggiunta con SHOW_SETTINGS sia da pannello chiuso sia da pannello aperto) il gruppo `Experimental` raccoglie le funzioni sperimentali: il permesso di lanciare un Run mentre un altro lavora, il blocco sperimentale dei Drift, l'Advisor Scanner, l'esecuzione parallela sperimentale, l'Async Drift Resolver e Context Sharing. L'ordine del gruppo è `trama.submitWhileRunning`, `trama.experimentalDriftBlocker`, `trama.experimentalAdvisorScanner`, `trama.experimentalParallelExecution`, `trama.experimentalAsyncDriftResolver`, `trama.experimentalContextSharing`, e `trama.experimentalContextSharing` si mostra come una `Checkbox`, come gli altri booleani sperimentali.

`trama.experimentalContextSharing` ha il titolo `Experimental Context Sharing` e la descrizione: «Experimental. Only with an agent that has sub-agents. On: when the agent hands work to its sub-agents, it passes each one the part of what it has already read that concerns that work (Trama's texts quoted as they are, and where the code is), so sub-agents do not read it again; they still read the code themselves. Off (the default): each sub-agent reads what it needs on its own. Only agents started by Trama follow it.»

Cambia anche la descrizione di `trama.maxParallelAgents`, che ora dice quanti sub-agenti l'agente può lanciare insieme: «how many sub-agents the agent may run at once, in a scan, in the exploration of a design or of a Drift resolution and in a run of Tasks (default 20; agents without sub-agents ignore it).» Tutti questi testi sono in inglese e non seguono `trama.language`.

Nel manifest (`extension/package.json`) `trama.experimentalContextSharing` è `"type": "boolean"`, `"default": false`, `scope: "application"`, con la `markdownDescription` qui sopra, ed è nel gruppo `Experimental` di `SETTING_GROUPS` (`extension/src/host/settings-schema.ts`) dopo `trama.experimentalAsyncDriftResolver`; il test che fissa i gruppi lo include. Si legge solo il valore utente (`inspect(key).globalValue === true`) con una funzione `configuredContextSharing` accanto alle altre in `extension/src/host/agent.ts`; un valore non booleano vale spento. La riga di comando non la legge.

`extension/README.md`, `README.md` e `CHANGELOG.md` descrivono l'impostazione.

Questo Task si ferma a dichiarare, raggruppare, mostrare e leggere l'impostazione (`configuredContextSharing`), più la sua menzione nei README e nel CHANGELOG: la frase dell'istruzione, il suo collegamento all'agente e le sezioni delle skill appartengono a un altro Task.
