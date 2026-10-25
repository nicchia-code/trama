---
refs:
  - panel
  - requirements/ui#panel
  - requirements/tech#panel
  - requirements/tech#editor-panel
  - requirements/tech#General
  - specs#frameworks
---
# Diagrammi mermaid e Markdown GitHub

Il renderer Markdown condiviso del pannello (`extension/src/webview/markdown.tsx`, usato da Board, Diagramma, Requisiti, Specs, History, overlay delle domande, Settings e omp Chat) disegna i blocchi `mermaid` e riconosce le estensioni del Markdown di GitHub, ovunque renda testo.

Quando il Task è finito:

- Un blocco di codice con linguaggio `mermaid` si vede come diagramma, nel tema del pannello (chiaro o scuro) e ridisegnato quando il tema cambia; largo al massimo quanto il testo, scorre di lato nel proprio riquadro se è più largo, come le tabelle. Durante il disegno mostra `Drawing diagram…` in testo secondario. Un blocco illeggibile, un errore di disegno o un caricamento fallito mostrano il blocco di codice com'è scritto, senza messaggi d'errore. Il diagramma ha ruolo accessibile `img`, nome `Diagram` e come descrizione accessibile il testo del blocco; non ha parti cliccabili.
- `mermaid` 12 è una dipendenza nuova, costruita da `scripts/build-extension.ts` in un bundle `iife` proprio, `mermaid.js`, mai incluso in `webview.js` né in `omp-chat.js`, spedito nel `.vsix` e con la licenza in `extension/THIRD-PARTY-NOTICES.md`. Il primo diagramma di una pagina lo carica una sola volta con uno `<script>` che porta il nonce della pagina e `src` da `cspSource`: la CSP di `webviewHtml` non cambia. Inizializzazione con `startOnLoad: false`, `securityLevel: "strict"`, il carattere del pannello e tema `default` o `dark`.
- L'SVG di `mermaid` è l'unico markup che entra nella pagina: si legge con `DOMParser` come `image/svg+xml`, si tolgono `script`, `foreignObject`, gli attributi `on*` e ogni `href` che non sia un frammento `#…`, e si importa nel riquadro del diagramma. Il resto del renderer continua a non usare `dangerouslySetInnerHTML` né `innerHTML`.
- Barrato `~~testo~~`; voci di task list (`- [ ]`, `- [x]`/`[X]`, anche con `*`, `+` e numerate, annidabili) con una casella di sola lettura prima del testo; indirizzi http e https nudi diventano link a se stessi, lasciando fuori dal link `.`, `,`, `:`, `;`, `!`, `?` finali e una `)` senza apertura.
- Riferimenti GitHub: `#123` all'inizio di una parola porta a `https://github.com/<owner>/<repo>/issues/123`, `@handle` (1–39 lettere, cifre o trattini singoli, non all'inizio né alla fine) a `https://github.com/<handle>`; un `@` dentro un indirizzo email non è un riferimento. Sono link solo quando l'host ha mandato nel quadro il repository GitHub del progetto, letto con git dal remote `origin` quando l'indirizzo è su github.com; altrimenti, e dentro codice inline e blocchi di codice, restano testo. I link si aprono dall'host nel browser di sistema come gli altri.
- Le immagini restano non supportate e l'HTML resta testo.
- Nei test dei componenti `mermaid` è sostituito da uno stub; parser, fallback, task list, barrato, link nudi e riferimenti GitHub si provano senza browser.
