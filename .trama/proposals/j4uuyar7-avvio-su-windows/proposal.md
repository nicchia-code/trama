---
status: rejected
base:
  requirements/tech/general.md: 8548159fac3957ea8e08427a82bd2ea0283697a7f4dc46c4acbadd69110a06d7
  requirements/tech/project.md: 6dd07d14f0d2940e982d53c6a20d5b2e70d184477b2dbd673d9cca7a2835493f
  requirements/rules/project.md: e92ab49502b63d01cd64d882cff70b471c4e7e948e026b8389aaf0efb31dd12e
  requirements/ui/get-started.md: 4e2e01f18a7b78c89de58689e8b9c950ee2466dd8b98d96f84840c2b5c6c1d4f
  specs.yaml: 9080fd39bda4f88b32a2ac196031d6a3c73810b615ba509cbb036af5552db3bf
delete: []
request: 2026-10-28T12-20-45
created: 2026-10-28T13:15:03.642Z
label: Avvio Windows
---
# Avvio su Windows

Su Windows x64 Trama, installata dal Marketplace (`nicchia.trama` 0.1.1 `win32-x64`), compare installata ma non parte: il log dell'Extension Host dice `Activating extension 'nicchia.trama' failed`. Il testo dell'errore non è disponibile; il pacchetto del Marketplace è identico a quello costruito in locale e una simulazione dell'attivazione con Windows emulato non ha riprodotto l'errore. La CI di Windows non installa mai il `.vsix` in VS Code, non lo avvia e gira con Windows Defender passivo, quindi non poteva vederlo.

Decisioni:
- Sintomo: si installa dal Marketplace ma l'attivazione fallisce; finestra locale, cartella attendibile, nessuna `trama-dev.trama`, CPU AMD Ryzen 5 5600X.
- La causa si trova riproducendo l'avvio su `windows-latest` con la prova di avvio in CI, e si corregge.
- Nessun pacchetto Windows ARM64: resta solo `win32-x64`.
- Il binario resta compilato per x64 con AVX2 (nessuna variante `-baseline`).
- Il rilascio su Windows installa il `.vsix` con `code --install-extension`, verifica `bin\trama.exe`, scansiona `trama.exe` con Windows Defender, e avvia VS Code con `@vscode/test-electron` controllando che Trama si attivi e che i comandi `trama.*` esistano; un fallimento ferma il rilascio.
- L'avvio dell'estensione isola ogni passo: i comandi si registrano sempre, e un passo fallito mostra `Trama could not start: <reason>` con un pulsante che apre il log.
- La nota della Release mostra il comando di installazione in un blocco di codice con i nomi reali dei file; le versioni senza suffisso diventano Release normali (Latest), quelle `-beta`/`-rc` restano prerelease.

Assunzioni dell'agente (da verificare):
- Il pulsante dell'avviso si chiama `Show Log` e apre il canale di output `Trama` dell'editor, dove l'avviso scrive il passo fallito e lo stack.
- Un solo avviso per avvio, anche se più passi falliscono, con il motivo del primo; il log li elenca tutti.
- La scansione Defender usa `MpCmdRun.exe -Scan -ScanType 3 -File <trama.exe> -DisableRemediation`, dopo aver aggiornato le firme; qualunque minaccia trovata ferma il rilascio.
- Le richieste di tecnologia restano nella sezione General di `tech` solo come rimando breve: i dettagli delle prove di installazione e di avvio stanno in `tech#project`, perché la General è già oltre 12 KB ed è una sola sezione, che non si può dividere.
