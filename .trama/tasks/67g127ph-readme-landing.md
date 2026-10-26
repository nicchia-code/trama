---
column: done
technical: true
refs:
  - requirements/tech
  - requirements/docs
drift: null
proposal: 111k0zzz
agent: false
created: 2026-10-26T17:49:44.849Z
finished: 2026-10-26T17:51:47.109Z
---
# README landing

`README.md` diventa la landing page di Trama, corta e invitante, e `extension/README.md` (la pagina che VS Code mostra nella vista Extensions) ha lo stesso testo, come dice `requirements/docs#General`. La documentazione resta in inglese.

Quando il Task è finito:

- `README.md` contiene, in quest'ordine: nome e tagline ("Your AI agent writes code fast. Trama makes sure it's the code you meant."); una GIF di Trama al lavoro in VS Code; il ciclo in cinque passi (descrivere una modifica, rispondere alle domande dell'agente, approvare la Proposal, eseguire i Task, risolvere i Drift), ciascuno con uno screenshot del pannello vero; i requisiti (VS Code 1.106 o successivo, Linux x64, macOS Apple silicon e Windows x64 in anteprima, omp, `gh` solo per Team); l'installazione dal `.vsix` delle Releases, con l'avviso che `trama.exe` non è firmato e che SmartScreen o un antivirus possono avvisare al primo avvio; una nota breve che omp Chat esegue ogni comando senza chiedere per default (approvazione `yolo`) e che si passa ad `ask` impostando `trama.ompChatApproval` su `ask` nelle impostazioni utente; i link a `CONTEXT.md`, `docs/model-format.md`, `docs/cli.md` e `CONTRIBUTING.md`; la licenza.
- Le README non descrivono più nel dettaglio impostazioni e funzioni facoltative (omp Chat, Notifications, Solo mode e Merge, Manager mode e Team, login dei provider, Cursor API key, System Certificates, wizard, Refine All, Unify Drifts, note dei ghost) né l'implementazione (componenti, moduli, messaggi, riferimenti ai Requirements): il contenuto tecnico di oggi di `extension/README.md` si elimina. Quel dettaglio andrà in un sito GitHub Pages che non fa parte di questo Task; fino ad allora lo descrivono `CHANGELOG.md`, `docs/cli.md` e `docs/uat.md` dove già lo facevano.
- Le immagini stanno in `docs/images/`: PNG per gli screenshot e GIF per le animazioni, mai SVG, ogni GIF sotto 5 MB, ognuna con un testo `alt`. Gli screenshot del pannello `board.png`, `questions.png`, `proposal.png`, `diagram.png` e `drift.png` ci sono già; la GIF di VS Code si aggiunge lì. `README.md` collega immagini e file del repository con percorsi relativi; `extension/README.md` con URL assoluti (`https://raw.githubusercontent.com/nicchia-code/trama/main/docs/images/<file>` per le immagini, `https://github.com/nicchia-code/trama/blob/main/<path>` per i file), perché il `.vsix` non porta `docs/`.
- Restano vere le frasi dei Requirements che riguardano le README: omp unico agente e VS Code unico editor, Windows in anteprima e `trama.exe` non firmato, solo i comandi attuali di `trama`, i nomi dei gruppi di Settings (`omp`, `Models`, `Project`, `Advanced`) dove compaiono, nessuna descrizione dello scan dopo l'approvazione né di `trama.autoScan`.
- `CHANGELOG.md` registra sotto `## Unreleased` la nuova README come landing con immagini, e che il dettaglio delle funzioni è uscito dalle README in attesa del sito GitHub Pages.
