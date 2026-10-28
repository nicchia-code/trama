---
technical: true
refs:
  - requirements/tech#General
---
# Note Release e Latest

Le Release di GitHub create dal workflow `.github/workflows/release.yml` devono essere leggibili e trovabili, e il job Windows deve fermare il rilascio quando le prove su Windows falliscono.

Quando il Task è fatto:

- La nota della Release mostra il comando di installazione in un blocco di codice, con il nome reale del file del pacchetto di ogni piattaforma di quella versione (per esempio `code --install-extension trama-win32-x64-0.1.2.vsix`). Oggi la nota scrive `trama-<platform>-<version>.vsix` fuori da un blocco di codice e GitHub, togliendo le parti fra parentesi angolari, la mostra come `trama--.vsix`. La frase che segnala Windows non provato a mano resta finché vale `tech#General`.
- Una versione senza suffisso (`0.1.2`) si pubblica come Release normale, così GitHub la segna Latest; una versione con suffisso (`-beta.N`, `-rc.N`) resta prerelease. Oggi `gh release create` passa sempre `--prerelease`, quindi GitHub non ha una Latest e una versione appena taggata senza pacchetti compare in cima. Il suffisso si legge dal tag spinto o, nel lancio manuale, dalla versione di `package.json`.
- Sul runner `windows-latest` il job del pacchetto esegue anche la prova di installazione (con la scansione di Windows Defender) e la prova di avvio di `tech#project`, scritte dal Task del gruppo `project` della stessa Proposal; un fallimento di una delle due fa fallire il job, e il job `release` non parte.

Il `CHANGELOG.md` registra il cambiamento sotto `## Unreleased`.
