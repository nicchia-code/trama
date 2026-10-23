---
technical: true
refs:
  - specs#frameworks
  - requirements/tech#General
---
# Engine VS Code 1.106

L'estensione richiede VS Code 1.106 o successivo, la prima versione che accetta un contenitore di viste di un'estensione nella barra laterale secondaria (`contributes.viewsContainers.secondarySidebar`, senza API proposte), che serve alla vista omp Chat a destra in VS Code.

Quando il Task è fatto:

- `engines.vscode` di `extension/package.json` vale `^1.106.0` al posto di `^1.95.0`. Cursor 3.27.6, che dichiara come base VS Code 1.128.0, continua a installare l'estensione; gli editor più vecchi di VS Code 1.106 non la installano più, ed è una conseguenza accettata dal developer.
- `@types/vscode` della radice (`package.json`) non cambia, salvo che il pacchetto o il type-check lo richiedano con il nuovo engine; il type-check passa.
- Ogni testo del repository che nomina la versione minima 1.95 come requisito dell'estensione (README, `extension/README.md`, `docs/`, CHANGELOG nella voce della prossima versione) dice 1.106.
- Il pacchetto `.vsix` si costruisce come oggi e si installa sia in VS Code (1.106 o successivo) sia in Cursor 3.27.6.
