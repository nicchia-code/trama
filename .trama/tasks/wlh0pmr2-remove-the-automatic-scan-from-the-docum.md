---
column: done
technical: true
refs:
  - requirements/tech#project
drift: null
proposal: null
agent: false
created: 2026-10-14T08:36:38.576Z
finished: 2026-10-14T09:20:42.190Z
---
# Remove the automatic scan from the documentation

Togli la descrizione dello scan dopo l'approvazione e dell'impostazione trama.autoScan da ogni documento: README.md (la riga della tabella delle impostazioni e la menzione nella frase sulle impostazioni che restano nel workspace), README dell'estensione (la frase del comando dell'agente, la voce Automatic scan e la voce dello scan dopo l'approvazione nell'elenco degli scan), docs/cli.md (il paragrafo dopo proposal approve) e docs/uat.md (le preparazioni che impostano trama.autoScan). Dopo la modifica nessun documento dice che l'approvazione avvia uno scan o che esiste trama.autoScan.
