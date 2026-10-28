---
status: approved
base:
  pr-check/feature.md: new
  pr-check/pull-request-check.md: new
  pr-check/pull-request-report.md: new
  actors/developer.md: be0d441ddf639e3497736defee7294c04d6c34593f286b76710dfbb035750f17
  actors/github.md: d6a4348a2b5569ca4c1dff811c4828d966dc4e105d122255efa4498fa20d350f
  system.md: f5ed3417551a69bd369e41f2382fb849b8e061bf7d33d645e7b4084611141607
  editor-panel/feature.md: 98ac8400231cb537345f6444de6979ed5bda58a19d40d2f21e2fc8fcdfa88b90
  editor-panel/panel.md: 1e774cb71a617627d245341463f6916f83694a75b362e248706fd3f8b87e13e7
  editor-panel/menu-laterale.md: c8b8ff1a6cafb302127b4c78f4b0c1f983ade581516c77b3daded0ac8da25910
  team/feature.md: e74455ea2e8671ea38e3e1885fffd61bd58a99b3b20f2d263522f09a6d48c90a
  team/manager-mode.md: f31f386803c22cc4f542c5ea6d519a1f27943335a193a26aacb180a22e702548
  requirements/rules/team.md: fe2710506895387918df6d3ca4da48079255a177853c20e65b52ad9fddcbf6a5
  requirements/rules/pr-check.md: new
  requirements/data/pr-check.md: new
  requirements/tech/pr-check.md: new
  requirements/ui/pr-check.md: new
  requirements/quality/pr-check.md: new
  requirements/tech/general.md: 92c43d490e09a8e0a0cb2da9d489d37d22f496b4c2ef8a609a2e97fd50ec1e07
  requirements/tech/menu-laterale.md: 657bd90d49af5bfbbf4532a025cbef5550cf4af55d07d0162c2401a0bc0c8cd4
  requirements/tech/panel.md: ebcfa56722e8c8028bf1cd73d6a46a27223c201828cfc6f7fe2327f38c8cd2d2
  requirements/tech/team.md: 7a641e82341b8984d947e21633ad09095e4a3447a0ceddcf8de47c208326f794
  requirements/ui/menu-laterale.md: d516c4e99f07836ec16c41b54d103f095b892f7c0bcd40a100d7653f4766b75b
  requirements/ui/team.md: 623d8f43bff8b2e79dc6c49d4ab737dfbb4429d7d126492ea29e6d3f91c2145f
  requirements/quality/agents.md: 0a6609d1bcfc5e9a1e8e4c376023f6e6d2e165041d762455c0a54e3b9395a9fd
  requirements/docs/readme.md: e373352df47d9f84a4ea989cc4d6f68129aef1eb7f6015d5f213c8c999d35a9d
  requirements/docs/website.md: f80fd794b7113876f2d683a6c1089cb9d7b7f0e9d5509b01ccab776a29d44f9f
delete: []
created: 2026-10-28T09:17:59.472Z
label: pr-check
---
# PR Check

Controllare una pull request di altri con il Modello, senza toccare la cartella di lavoro: Trama prende la PR in un worktree tutto suo, confronta e scansiona lì, e lascia un report solo a chi l'ha chiesto. Serve sia a chi usa Trama da solo (gli altri non lo usano) sia a un team in cui tutti lo usano, e a chiunque, non solo al Manager.

## Decisioni

- La PR Check è una Feature nuova, `pr-check`, e vive nella vista Team, in una scheda `Pull Requests` dopo `Issues`.
- La vista Team c'è in ogni progetto Trama con origin su GitHub; senza Manager mode mostra solo `Pull Requests`, con il Manager mode anche le schede di oggi.
- Elenca solo le pull request aperte e non in bozza.
- Trama crea il worktree nella cartella privata dell'editor per il workspace, sulla head della PR così com'è (nessun merge), e lo rimuove alla fine, a ogni esito.
- Variante Solo (Solo mode acceso, oppure PR senza `.trama/`): Trama copia nel worktree i propri file della cartella aperta; lo scan globale segna `merge` i Drift nei file che la PR cambia dal punto in cui si è staccata.
- Variante collaborativa (Solo mode spento e PR con `.trama/`): Trama confronta `.trama` dal punto in cui la PR si è staccata dal branch di origine (merge-base) alla head; poi lo scan globale confronta il codice con il Modello della PR.
- Nella variante collaborativa il report porta tutti e cinque i controlli di Trama: diff di Modello, Requisiti e Specs; validità del Modello della PR; cambiamenti senza una Proposal approvata nella PR; schede lasciate aperte; elementi cambiati anche sul branch di origine.
- Scan sempre globale: costa, ed è voluto.
- Il report è informativo, una tabella, mai condiviso: un file locale della copia di lavoro, ignorato da git; il controllo successivo della stessa PR lo sostituisce, e si cancella da solo quando una lettura di GitHub non trova più la PR fra le aperte non in bozza.
- Il report si apre in una finestra sopra la vista.
- Una PR Check alla volta per finestra, mai mentre un Run lanciato da questa finestra è in corso.
- Una PR Check si ferma con `Stop` sulla riga della PR: Trama ferma l'agente e rimuove il worktree.
- Se l'agente finisce senza consegnare lo scan, nessun nuovo report: resta il precedente, se c'è, e un avviso lo dice.
- Eccezione stretta al divieto dei worktree: solo quelli della PR Check, creati e rimossi da Trama.
- Le chiamate `gh` della PR Check sono in sola lettura; Trama non scrive nulla su GitHub.

## Assunzioni da verificare

- Nel worktree Trama scrive le skill di questa versione, anche nella variante collaborativa, dove la PR può portarne di più vecchie.
- Nessuna installazione di dipendenze nel worktree: lo scan non esegue il codice.
- L'agente lavora nel worktree con il ruolo dello scan, in un terminale o in una conversazione chiamati `PR #<n>`; Trama annuncia un lavoro `Checking PR #<n>`, il cui ghost sta nella barra di stato. L'Async Drift Resolver non lavora in una PR Check.
- Un report si dice superato quando la head della PR è cambiata dopo il controllo.
- Un riferimento del report porta al Diagramma solo quando l'elemento esiste nel Modello della cartella aperta.
- Un worktree della PR Check rimasto da una finestra chiusa di colpo si rimuove alla riapertura.
- Nella variante Solo Trama copia `.trama/` senza le cartelle locali (report, annunci, tempi, registro dei confronti), più le skill e i file di Trama in `.omp/`.
