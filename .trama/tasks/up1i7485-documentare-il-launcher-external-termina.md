---
column: done
technical: true
refs:
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
drift: null
proposal: null
agent: false
created: 2026-10-05T09:12:22.121Z
---
# Documentare il launcher external-terminal e aggiornare lo script di accettazione

La documentazione dell'estensione, il README e lo script di accettazione descrivono il launcher `external-terminal` come lo dicono ora i Requisiti: i valori di `trama.agentLauncher` e che `auto` non lo sceglie mai, l'impostazione `trama.externalTerminalCommand` (solo impostazioni utente, segnaposto `{command}`), le piattaforme (solo Linux e macOS, solo progetto locale), il rilevamento del terminale, la finestra che resta aperta con una shell a comando finito, il riuso solo con Terminal.app, kitty e WezTerm, i due messaggi di errore e di avviso, e il limite che chiudere a mano la finestra non è rilevato.

Lo script di accettazione ha passi che provano una richiesta di design e una scansione in una finestra esterna, la fine del comando con il suo ghost ritirato, la finestra che non si apre con l'istruzione negli appunti, e l'avviso ntfy sulla fine del comando.
