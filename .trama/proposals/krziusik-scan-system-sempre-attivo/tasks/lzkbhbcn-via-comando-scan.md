---
refs:
  - agent-launching
  - requirements/rules#agent-terminal
  - requirements/rules#agent-terminal/Agent running
  - requirements/rules#agent-launching
  - requirements/rules#drift-resolution
  - requirements/rules#announcement
---
# Via comando Scan System

Trama lancia lo scan di tutto il Sistema da un solo punto, il pulsante Scan System del menu laterale, e non lancia più scan di una sola Feature. Il comando dell'editor `Trama: Scan System` sparisce; una Feature la scansiona l'agente solo quando il developer glielo chiede in una conversazione.

Quando il Task è finito vale:

- `extension/package.json` non dichiara più il comando `trama.scan` (titolo `Scan System`) in `contributes.commands` (né in menu o palette), l'estensione non lo registra più e `pickAndScan` sparisce con la sua scelta fra `Whole System` e le Feature.
- Non esiste più l'istruzione dello scan di Feature ("Use the trama-scan skill on the Feature `a`." / "…on the Features `a`, `b`."): l'unica istruzione di scan che Trama manda è "Use the trama-scan skill on the whole System.", con il terminale o la conversazione chiamati `Scan`, il ruolo `trama.scan`, il controllo annunciato al lancio `Scanning System` e le frasi di Drift blocker, Async Drift Resolver ed esclusione dei file di istruzioni come oggi per lo scan del Sistema.
- Sparisce il rifiuto di uno scan di una Feature che non esiste nel Modello, e l'azione `launch` con `kind: "scan"` (`extension/src/protocol.ts`, oggi `{ kind: "scan"; feature?: string }`) non accetta più una Feature: resta solo il percorso del menu laterale, senza Feature.
- La skill distribuita `trama-scan` resta capace di scansionare una o più Feature quando glielo chiede il developer, con il controllo `Scanning Feature <a>` / `Scanning Features <a>, <b>` che annuncia l'agente; quello scan non cambia il ricordo dell'ultimo scan globale.
- `CHANGELOG.md` dice che il comando `Trama: Scan System` e lo scan di Feature lanciato da Trama sono stati rimossi; `README.md`, `extension/README.md` e `docs/` non nominano più il comando né lo scan di Feature dall'editor (in `docs/uat.md` i passi H13 e H14, e il passo che si aspetta ``Use the trama-scan skill on the Feature `checkout`.`` dopo **Keep this**, da rivedere su ciò che quell'azione lancia oggi).

Posti nel codice già noti:

- `agent-launching` — `extension/src/host/main.ts` registrazione di `trama.scan` (~63); `extension/src/host/controller.ts` `pickAndScan` (~520-532) e `case "scan"` di `launchAction` (~1558-1564, controllo della Feature sconosciuta e titolo `Scanning Feature …`); `extension/package.json` comando `trama.scan` (~77-79)
- `requirements/rules#agent-terminal` — `extension/src/host/prompts.ts` `buildScanPrompt` (~41-42)
- `requirements/rules#agent-launching` — `extension/src/host/agent.ts` scelta del ruolo e `--slow` per `job: "scan"` (~535)
