---
status: approved
base:
  requirements/data/general.md: 8d38531b95e0424d68cd9aceec39df8e65820b8092580a82e3be488ecc3d11da
  requirements/data/agents.md: 79a24b6bb596b227ebabd48d534b9f73581d7f11dc50c2af9719849a931c44f1
  requirements/data/work.md: 840b9caf67e484f234318959c6a289ce0ab1ce4b26056137b5189f76b3057f7b
  requirements/tech/general.md: 7181eadfa0ebb80095db19d3dd1b5f2e66b94208c283908793bf3dc950336d8a
  requirements/tech/agent-terminal.md: 13123727c8f3163e5cbbe53fca7d7c22268e00a682bef687e1c82ede4b393885
  requirements/tech/agent-hooks.md: 10ebc9249fa4a5171eec282d22aa739712482b2e2caed1974b3d6f427a8f9463
  requirements/tech/editor-chat.md: 2ddd8da97c1460104de06d1130a25953fcf12f99e9ea98828ead396a7ea22d40
  requirements/tech/questions-notices.md: 474750dad830fc3ee4dc9fad45a7cb395141009af2e82d1f454a3b7d9950af09
  requirements/rules/agent-terminal.md: b45855b7cae613e593b68404ed9203c9ceb19b329f6467cc51e47ea58444346e
  requirements/ui/agents.md: b5283ac915ed65b6ddd4a573ca1a4232c424d3870b6a971fc4f9c3221896a932
  requirements/tech/project-panel.md: new
delete: []
created: 2026-10-11T16:59:00.421Z
scanScope:
  - ref: requirements/data#question-round
    reason: changed
  - ref: requirements/data#General
    reason: changed
  - ref: requirements/data#proposal
    reason: changed
  - ref: requirements/rules#agent-terminal
    reason: changed
  - ref: requirements/tech#agent-hook
    reason: changed
  - ref: requirements/tech#agent-terminal
    reason: changed
  - ref: requirements/tech#editor-chat
    reason: changed
  - ref: requirements/tech#General
    reason: changed
  - ref: requirements/tech#question-round
    reason: changed
  - ref: requirements/ui#agent-terminal
    reason: changed
---
# Windows support

Portare la riga di comando `trama` e l'estensione su Windows x64, oggi distribuite solo per Linux e macOS. Il codice ha già pezzi pensati per Windows (`trama.exe`, named pipe, `%LOCALAPPDATA%`, citazione PowerShell e cmd), ma non è mai stato eseguito né verificato su Windows.

Decisioni prese con il developer:
- Solo `win32-x64`; niente arm64.
- Shell dei terminali dell'agente: Windows PowerShell 5.1, PowerShell 7 e Git Bash. Con cmd, un profilo WSL o un'altra shell il terminale dell'agente si apre con Windows PowerShell e un avviso compare una volta per finestra.
- PowerShell 5.1 e 7 hanno regole di citazione distinte, provate in CI con veri round-trip su entrambe.
- Il comando degli hook di Claude Code è sempre citato per Git Bash, con il percorso a barre in avanti, qualunque sia la shell del terminale.
- Hook di Cursor e Copilot su Windows: forma verificata a mano per ciascun editor (Copilot con la variante `windows` del comando).
- Chat di Cursor su Windows: al posto di `export PATH=…` una frase neutra con il percorso assoluto di `trama.exe`; Linux e macOS restano come oggi.
- Canale locale: named pipe nativa di Node al posto del ponte PowerShell; ogni record di discovery porta un segreto senza il quale l'editor non risponde, su ogni piattaforma. Su Windows la cartella dei record è `%LOCALAPPDATA%\Trama\questions` con i suoi permessi predefiniti, senza verifica delle ACL.
- Fine riga: Trama normalizza a LF in ogni lettura, hash e confronto, e scrive sempre LF.
- Rinomina atomica bloccata su Windows: ritenta fino a 1 secondo, poi errore.
- Gli ID e i nomi di Aree e frammenti riservati da Windows (`con`, `prn`, `aux`, `nul`, `com1`…`com9`, `lpt1`…`lpt9`) sono rifiutati su ogni piattaforma.
- Annullamento di `trama ask` su Windows: Ctrl+C e disconnessione; `SIGTERM` vale solo su Linux e macOS.
- Skill e `docs/cli.md`: una breve nota per PowerShell.
- CI su `windows-latest`: type-check, tutti i test (resi portabili) e smoke test del pacchetto.
- Nessuna firma del binario, avviso di SmartScreen documentato; la CLI resta solo dentro il `.vsix`.
- Windows è in anteprima finché la verifica manuale su Windows 11 x64 (VS Code e Cursor, omp e Claude Code, PowerShell 5.1, 7 e Git Bash) non passa.

Scelte mie, da controllare:
- La nota per PowerShell dice anche di impostare UTF-8 in Windows PowerShell 5.1 prima di una pipe, e ogni comando che legge JSON da standard input accetta un BOM UTF-8 iniziale: senza, `trama ask` in PowerShell 5.1 perde gli accenti o rifiuta il JSON.
- Il segreto non passa mai per le variabili d'ambiente: la CLI lo legge dal record dell'endpoint, anche con `TRAMA_QUESTION_ENDPOINT`.
- La forma provata degli hook di Cursor e Copilot su Windows torna al developer come Drift sui Requisiti, perché chi realizza i Task non può scriverla nei Requisiti.
- Il frammento `tech/general` superava i 12 KB: le sezioni `project` e `panel` passano senza modifiche al nuovo frammento `tech/project-panel`.
