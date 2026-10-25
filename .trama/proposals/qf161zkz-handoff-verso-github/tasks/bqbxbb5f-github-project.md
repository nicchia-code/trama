---
refs:
  - github-project
  - developer.LINK_GITHUB_PROJECT
  - developer.UNLINK_GITHUB_PROJECT
  - developer.LOG_IN_GITHUB
  - developer.REFRESH_TEAM
  - requirements/data#github-project
  - requirements/rules#github-project
  - requirements/ui#github-project
  - requirements/tech#General
  - requirements/quality#agent-launching
  - specs#infrastructure
---
# GitHub Project e lettura con gh

Trama collega un GitHub Project alla copia di lavoro e legge GitHub da sé, solo in lettura, con la GitHub CLI del Manager. Quando il Task è finito:

- `src/core/github.ts` è l'unico posto che costruisce comandi `gh`: cerca `gh` nel `PATH` dell'editor, poi `/opt/homebrew/bin`, `/usr/local/bin` e su Windows `%ProgramFiles%\GitHub CLI` (nessuna impostazione); esegue solo `gh --version`, `gh auth status --hostname github.com` e `gh api graphql` con query costanti (Project dell'owner del repository, utente o organizzazione; campi del Project collegato con le opzioni; iterazioni), senza shell, argomenti fissi, timeout 20 s. Stati in quest'ordine: non installato, non loggato, senza accesso ai Project (errore che nomina `read:project` o `project`), errore di lettura con `gh exited with code <n>: <prima riga di stderr>`. Un test fissa che il modulo non contiene comandi che scrivono.
- Collegamento: `.trama/manager/project.json` `{ owner, number, title }` nella cartella locale di Manager mode, mai committato; assente o non valido vale non collegato. Si collegano solo Project con almeno un campo iterazione; il campo dello sprint è il primo campo iterazione; le iterazioni passate non si offrono. Cambiare Project lascia le issue già pubblicate dove sono; `Unlink` non cambia nulla su GitHub.
- Lettura all'apertura della vista Team e con `Refresh`, mai a tempo, una alla volta; il risultato va in `workspaceState` `trama.team.github` `{ readAt, project, error }` e al webview come `teamGitHub`. Ogni lettura tiene i dati dell'ultima riuscita e la loro ora.
- Interfaccia (`ui#github-project`): pulsante del Project nella testata con `Popover` `Change GitHub Project`, ricerca, elenco, `Link another Project…`, `Unlink`; `Updated <tempo fa>` e `Refresh`; pagina `Link a GitHub Project` quando non è collegato, con Project senza iterazioni disabilitati e `Create a Project on GitHub`; i riquadri `GitHub CLI is not installed` (`Install gh` apre `https://cli.github.com`), `You're not logged in to GitHub` (`Log in to GitHub`), `GitHub CLI can't read Projects` (`Give access`), `Couldn't read the GitHub Project` (`Retry`, `Show details` sul canale di output); scheletri e `Loading from GitHub…` alla prima lettura.
- `Log in to GitHub` apre il terminale `Log in to GitHub` con `gh auth login --hostname github.com --web --scopes project`; `Give access` esegue `gh auth refresh --hostname github.com --scopes project`; terminale visibile nell'area dei terminali, cursore dentro, senza ghost; alla fine del comando la vista rilegge.
- `trama issue fields` stampa i campi e le iterazioni del Project collegato (sprint e sprint corrente segnati), con gli errori di `cli#issue`.
- Messaggi `linkGitHubProject`, `unlinkGitHubProject`, `refreshTeam`, `logInGitHub` validati da `parseToHost`.
- Rete e privacy: aggiornati il testo di `tech#General` e `quality#agent-launching`; le uniche chiamate di rete di Trama restano la notifica ntfy e, con Team disponibile, queste letture `gh`. La Specs ha la voce `GitHub CLI`.
- Documentazione: `README.md`, `extension/README.md`, `docs/` e `CHANGELOG.md` dicono che Team richiede la GitHub CLI con accesso ai Project; `docs/uat.md` i passi con `gh` mancante o non loggato e un Project senza iterazioni.

Le immagini legate a questo Task mostrano il selettore del Project e gli stati di GitHub.
