---
technical: true
refs:
  - specs#languages
  - specs#frameworks
  - specs#testing
  - specs#ci
  - specs#deployment
  - requirements/tech#General
  - requirements/tech#panel
  - requirements/ui#General
  - requirements/ui#panel
---
# Base React e shadcn

È la base degli altri Task di questa Proposal e va fatto per primo. Alla fine il pannello funziona come prima, con il nuovo guscio e le schede vecchie montate al suo interno.

- Dipendenze delle Specs installate: React 19 e `react-dom`, Radix UI, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `cmdk`, Tailwind CSS 4, happy-dom e `@testing-library/react`.
- **Build.** `scripts/build-extension.ts` compila Tailwind in un solo foglio di stile caricato come testo, e raccoglie il webview da `main.tsx` in un solo bundle `iife`. La CSP del pannello non cambia.
- **Componenti.** I componenti shadcn/ui usati dal pannello stanno copiati in `extension/src/webview/ui/`: Button, Card, Badge, Tabs, Dialog, Select, Checkbox, Tooltip, Popover, Command, Combobox e Input.
- **Tema.**
  - Le variabili CSS di shadcn/ui hanno base zinc e primario blu, in chiaro e in scuro (classe `dark`), più i colori semantici della palette di Tailwind.
  - I caratteri sono quelli dell'editor.
  - Con il tema `auto`, il default finché Settings non manda `trama.theme`, il webview segue le classi del `body` e le osserva con un `MutationObserver`.
- **Guscio.** Un solo `createRoot`, e la barra delle schede è un `Tabs` di shadcn/ui con la tab `Settings` a sola icona `Settings`. Ogni scheda non ancora rifatta resta montata com'è dentro un componente che la ospita, finché il suo Task non la rifà.
- **Icone.** Tutte le icone vengono da `lucide-react`, con la corrispondenza di `ui#panel`.
- **Markdown.** Il renderer Markdown produce elementi React, mai `dangerouslySetInnerHTML`, con le stesse regole di prima su link, titoli, a capo e Markdown malformato.
- **Test.** happy-dom è registrato da un preload di `bun test`, ed è presente `@testing-library/react`. I test del renderer passano agli elementi React.
- **Licenze.** `extension/THIRD-PARTY-NOTICES.md` riporta le licenze di lucide, shadcn/ui, Radix UI e delle altre librerie del webview, e non nomina più i glifi codicon.
- **Verifica.** Un test controlla che il tema scelto con `auto` cambi quando cambiano le classi del `body`.
