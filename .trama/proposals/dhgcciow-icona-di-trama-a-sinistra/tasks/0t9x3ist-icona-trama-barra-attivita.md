---
refs:
  - panel/Closed/developer.OPEN_PANEL
  - panel/Open/developer.OPEN_PANEL
  - developer.OPEN_PANEL
  - requirements/ui#panel
  - requirements/tech#panel
  - requirements/tech#project
  - requirements/rules#project
  - specs#frameworks
---

# Icona di Trama a sinistra

Il punto d'ingresso di Trama nell'editor passa dalla barra in alto a una icona nella Activity Bar di VS Code (a sinistra), e il pulsante nella status bar diventa solo il logo.

## Activity Bar e vista `Trama`

- In ogni finestra con almeno una cartella aperta compare, nella Activity Bar, l'icona di Trama, anche se la cartella non contiene un progetto Trama. Nelle finestre senza cartelle l'icona non c'è.
- Tooltip e nome accessibile dell'icona: `Trama`. L'icona è il logo di Trama, l'SVG scuro `extension/media/trama-icon-dark.svg` (l'editor lo usa come maschera).
- Il clic sull'icona apre nella sidebar una vista di Trama con il normale comportamento di VS Code. Trama non apre, non chiude e non sposta mai la sidebar da sola.
- La vista ha titolo `Trama` e mostra la frase `Model, Board and Requirements of your project, in one panel.` e sotto il pulsante `Open Trama`. Il contenuto è identico con o senza progetto Trama.
- Il pulsante è un'apertura ordinaria di Trama, identica al comando Open Trama (`trama.open`): apre il pannello o lo porta in primo piano mantenendo la scheda corrente; senza progetto apre Get Started; avvia anche il controllo delle skill in background (già fatto da `controller.open()` → `checkSkillsInBackground`, `extension/src/host/controller.ts:184-192`).

Implementazione in `extension/package.json` (engine `^1.95.0`):

- `contributes.viewsContainers.activitybar`: un contenitore con id `trama`, title `Trama`, icon `media/trama-icon-dark.svg`.
- `contributes.views.trama`: una sola vista con id `trama.home`, name `Trama`, `"when": "workspaceFolderCount > 0"`.
- `contributes.viewsWelcome` per `trama.home` con la frase sopra e `[Open Trama](command:trama.open)`.
- La vista è una tree view sempre vuota: in attivazione (`extension/src/host/main.ts`) si registra un `TreeDataProvider` che non restituisce elementi. Nessuna webview, nessuna nuova context key.
- Contenitore, vista e contenuto di benvenuto sono dichiarati nel manifest e appaiono senza attivare l'estensione; l'estensione si attiva implicitamente quando la vista viene aperta.

## Pulsante nella status bar

Il pulsante in basso a sinistra (`extension/src/host/main.ts:31-38`, oggi con `text` `Trama`, registrato alla riga 51) diventa solo logo:

- `text`: `$(trama-logo)`
- `tooltip`: `Open Trama`
- `accessibilityInformation`: `{ label: "Open Trama" }`
- `command`: `trama.open`
- allineamento a sinistra, priorità 100, ciclo di vita invariato.

## Icona `trama-logo`

- In `contributes.icons` del manifest si aggiunge `trama-logo` con `description` `Trama logo` e `default` con `fontPath` verso un font WOFF in `extension/media/` e `fontCharacter` il codice fisso del suo unico glifo.
- Il font è committato nel repository; la build non lo genera. `extension/.vscodeignore` impacchetta già `media/**`.
- Nuovo script `scripts/icon-font.ts` che rigenera quel font dall'SVG scuro con fantasticon, con lo stesso nome di file e lo stesso codice del glifo. Si lancia a mano con `bun scripts/icon-font.ts` quando il logo cambia.
- fantasticon diventa devDependency nel `package.json` della radice, come dicono le Specs (`frameworks`).

## Rimozione dell'icona nel titolo dell'editor

- `menus.editor/title` in `extension/package.json` non contiene più `trama.open` (oggi a `navigation@2`); `trama.sendDesignRequest` resta.
- `trama.open` resta in `contributes.commands` e nella palette dei comandi.
- L'icona della scheda del pannello di Trama non cambia.
