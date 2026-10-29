---
column: done
technical: true
refs:
  - requirements/docs
drift: null
proposal: 7ox2qamx
agent: false
created: 2026-10-28T18:32:45.016Z
finished: 2026-10-28T18:34:24.845Z
---
# Doc senza PR Check

La PR Check è nascosta per ora: nessuna superficie di Trama la offre, Trama non legge pull request con `gh` e la vista Team esiste solo con Manager mode acceso (Team disponibile), con le schede `Decisions`, `Issues`, `Timeline` e `People`. Il codice della PR Check resta nel repository. Quando il Task è finito, la documentazione per l'utente lo dice così.

Deve valere:

- La documentazione non descrive più la vista Team senza Manager mode né la scheda `Pull Requests`: la settima vista del pannello, Team, c'è solo con Manager mode acceso e origin su GitHub.
- `README.md` (riga 50 circa) ed `extension/README.md` (riga 50 circa), nell'elenco dei requisiti: `gh` serve solo per Team (`docs#General`), non più «only for the PR Check and Team». I due testi restano uguali fra loro.
- Sito (`docs#website`): la pagina iniziale `site/src/pages/index.astro` (riga 45 circa, scheda dei requisiti) dice `gh` solo per Team. La guida non nomina più la PR Check:
  - `site/src/content/guide/getting-started/requirements.md`: la `description` del front matter (riga 3), la riga di `gh` (15, senza il collegamento alla PR Check), la riga di git (16, che oggi dice «only for Solo mode and the PR Check» e del worktree: git resta per Solo mode) e la riga 20 sulle richieste di rete (solo quelle in sola lettura di Team con `gh`).
  - `site/src/content/guide/panel-and-settings/panel.md` (riga 43): Team con le schede `Decisions`, `Issues`, `Timeline`, `People`, solo con Manager mode acceso; sparisce la frase sulla sola scheda `Pull Requests` con Manager mode spento.
  - `site/src/content/guide/workflows/manager-mode.md`: la `description` (riga 3) senza «check a pull request against the Model», la nota della riga 7 senza la frase sulla PR Check, e la sezione `## PR Check` (righe 88–105) tolta.
  - Le schermate `site/public/screenshots/team-*.png` e le scene di `scripts/screenshots/scenes.ts` non cambiano: già oggi mostrano Team con Manager mode acceso e senza `Pull Requests`.
- `docs/uat.md`: la sezione `## AU. PR Check and the Team view without Manager mode` (righe 1316–1340, AU1–AU19) resta, con in testa una riga che dice di saltarla finché la PR Check è nascosta. Nessun altro passo della uat descrive la scheda `Pull Requests` o la vista Team senza Manager mode come disponibile; AR2 e AR3 (pull request come segnali dello stato di una issue) restano.
- `CHANGELOG.md`: una sezione nuova in cima, sopra `## 0.1.5`, con una voce che dice che la PR Check e la vista Team senza Manager mode sono nascoste per ora (scheda `Pull Requests` tolta, nessuna lettura delle pull request, voce `Team` e comando `Show Team` solo con Manager mode acceso), che il codice resta e che i report già in `.trama/pr-checks/` restano dove sono. La sezione 0.1.5 non cambia.
- `docs/cli.md`, `docs/model-format.md` e `CONTEXT.md` non nominano la PR Check e non cambiano.
- `test/site-guide-content.test.ts` passa ancora (controlla solo che la pagina `workflows/manager-mode` esista); se un test del sito fissa il testo della sezione `PR Check`, va riscritto per la guida senza di essa.
