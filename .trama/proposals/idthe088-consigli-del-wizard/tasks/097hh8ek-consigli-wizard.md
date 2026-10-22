---
refs:
  - setup-wizard
  - requirements/rules#setup-wizard
  - requirements/tech#setup-wizard
  - requirements/ui#setup-wizard
  - requirements/quality#setup-wizard/Agent
---
# Consigli nel wizard

Nel passo `Models` il sottotitolo è «Choose the model for each kind of work. Analysis works best with your most capable model, Execution with a mid-range one, Scan with a fast, light one.». È solo testo: valori iniziali, tendina dei suggerimenti e riepilogo non cambiano (`rules#setup-wizard`).

Nel passo `Agent`, in ogni modo del wizard e qualunque sia `trama.agent`, ogni volta che il passo si mostra Trama cerca i file di istruzioni degli agenti sulla cartella del progetto (nel primo setup quella scelta in `Path`): nella cartella del progetto, nelle cartelle sopra fino alla home esclusa (solo `AGENTS.md` e `CLAUDE.md`) e nella home dell'utente, con i percorsi, l'ordine, l'esclusione dei file vuoti, fatti di soli spazi o illeggibili, e le etichette (relative al progetto, con `~/`, o assolute) di `rules#setup-wizard`. La ricerca sta nel modulo `src/core/instruction-files.ts`, lo stesso usato dai lanci di omp. Il webview chiede con `instructionFilesWanted { root? }`, l'host risponde con `instructionFiles { root, files }`, e una risposta per un `root` diverso da quello attuale si ignora (`tech#setup-wizard`).

Con almeno un file trovato compare il riquadro d'avviso con il testo «Agent instruction files found. The agent loads them in every Trama job: remove them from the repository, or check that they do not conflict with Trama.» e i file, uno per riga, ciascuno un link: cliccarlo manda `openInstructionFile { path }` e l'host, solo se `path` è nell'ultima risposta, lo apre in una scheda dell'editor non in anteprima senza spostare il pannello. Senza file l'avviso non compare. L'avviso non blocca mai `Next`. Quando nei valori del wizard `trama.agent` è `omp` e `trama.ignoreInstructionFiles` è acceso, sotto l'avviso compare la nota «Trama's omp jobs ignore these files.»; cambiare quei valori la mostra o la toglie subito, senza rifare la ricerca (`ui#setup-wizard`).

`trama.ignoreInstructionFiles` è fra le chiavi del passo `Agent`, dopo `trama.terminalLocation`, ma si mostra nel passo e nel `Summary` solo con `trama.agent` uguale a `omp`. L'impostazione stessa (manifest e scheda Settings) la dichiara la Task sul pannello e Settings di questa stessa Proposal.

Vincoli di qualità (`quality#setup-wizard/Agent`): la ricerca legge solo i percorsi elencati e dei file solo quanto basta per sapere se sono vuoti; il loro contenuto non arriva al webview né ai log, e percorsi ed etichette si mostrano come testo, mai come markup.
