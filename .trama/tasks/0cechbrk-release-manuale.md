---
column: done
technical: true
refs:
  - requirements/tech#General
  - requirements/release#General
  - specs#ci
drift: null
proposal: gzy2wgxj
agent: false
created: 2026-10-29T14:04:06.231Z
finished: 2026-10-29T14:04:56.849Z
---
# Release manuale

Il workflow `.github/workflows/release.yml` crea il tag solo insieme alla release, dopo che tutte le piattaforme sono passate. Quando il Task è finito vale quanto segue.

- Il workflow parte solo a mano (`workflow_dispatch`), da qualsiasi branch, senza input. Il trigger `push` sui tag `v*` non c'è più. L'input `target` e il job `plan` che costruiva la matrice da quell'input sono rimossi: la matrice ha sempre `linux-x64` (`ubuntu-latest`), `darwin-arm64` (`macos-14`) e `win32-x64` (`windows-latest`).
- La versione è quella di `package.json` e il tag è `v<versione>`. Prima di costruire qualsiasi pacchetto, un job (con `timeout-minutes: 15`) controlla che il tag `v<versione>` non esista sul repository, con o senza release. Se esiste, la corsa fallisce subito con un messaggio che nomina il tag e dice di alzare la versione, e nessun pacchetto viene costruito.
- I job `package` restano come oggi (Bun 1.4.4, `bun run test:ci`, `timeout-minutes: 25`, smoke test, controllo della firma su macOS, `fail-fast: false`).
- Il job `release` parte solo quando tutti e tre i job `package` sono riusciti. Crea il tag e la release insieme, sul commit della corsa (`gh release create "v<versione>" … --target "$GITHUB_SHA"`), come pre-release, con le stesse note di oggi. Quando anche una sola piattaforma fallisce non nascono né il tag né la release, e i pacchetti riusciti non vengono pubblicati.
- Il workflow non sposta, non cancella e non riscrive mai un tag esistente: una corsa fallita si corregge con un nuovo commit e una nuova corsa sulla stessa versione.
- Il commento in testa al workflow descrive il nuovo avvio.
- `CONTRIBUTING.md` non dice più che il push di un tag `v*` avvia la release: dice di alzare la versione in `package.json` e avviare a mano il workflow `Release` (per esempio `gh workflow run release.yml --ref <branch>`). Dice anche che il workflow crea il tag solo quando le tre piattaforme passano e che un tag già esistente ferma la corsa.
- `CHANGELOG.md` registra il cambiamento sotto `## Unreleased`.
