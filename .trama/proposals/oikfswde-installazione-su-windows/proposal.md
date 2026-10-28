---
status: draft
base: {}
delete: []
created: 2026-10-28T13:15:59.452Z
label: Windows install
---
# Installazione su Windows

La segnalazione dice che la versione per Windows non si installa. Il codice mostra un blocco certo: l'installer ufficiale di omp per Windows (`install.ps1`), senza bun, mette `omp.exe` in `%LOCALAPPDATA%\omp` e lo aggiunge solo al PATH dell'utente; l'editor tiene il PATH letto al suo avvio e Trama cerca omp solo nel PATH dell'editor, in `~/.bun/bin` e in `~/.local/bin`, quindi dopo Install omp il wizard resta fermo al passo omp finché VS Code non si riavvia. Inoltre le note di release mostrano su GitHub `code --install-extension trama--.vsix`, perché GitHub toglie `<platform>` e `<version>` come tag HTML, e nessun passo della release installa davvero il `.vsix` in VS Code.

Decisioni (il developer ha saltato tutte le domande del round: valgono le raccomandazioni, da verificare):
- Sintomo assunto: l'estensione si installa ma il wizard resta bloccato al passo omp dopo Install omp.
- Ricerca di omp: su Windows si aggiunge la cartella `%LOCALAPPDATA%\omp`, dopo `.bun/bin` e `.local/bin`; nessuna rilettura del PATH di Windows.
- Note di release: un comando `code --install-extension` esatto per ogni `.vsix` pubblicato, con il nome vero del file.
- Release: su ogni piattaforma il workflow scarica VS Code, installa il `.vsix` e controlla che l'estensione si attivi senza errori; un fallimento ferma la release.
