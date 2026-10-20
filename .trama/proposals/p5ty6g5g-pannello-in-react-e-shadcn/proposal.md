---
status: approved
base:
  specs.yaml: new
  editor-panel/panel.md: c253114676a18296b3c87d9316f0808933f84233a28cc74fea386e0528dd1b19
  requirements/tech/general.md: 2c79f7abd35c1a1bdfd2c761346730d98ec47c3fc0cbf37546aa021a1038f7e6
  requirements/tech/project-panel.md: f53d6c6df9f8930917819b60c900dd45da560ef68f0deb73d37ad5f7ca24d49b
  requirements/tech/settings.md: 0e507361acffedb3435193d19822da75266eea6e4da241dc70228c4eeae71383
  requirements/ui/panel.md: f987cdcd20cb1b0cc32df39175b5ad32d16f56e998c5fa0050c53133ef917186
  requirements/ui/settings-specs.md: ca176e78bb49600eaef0a2461f54763d8a8d70df8a45eaadffc852a358e9c634
  requirements/ui/tasks.md: 86d7a5d1b1044ce9cc655902387481f6e8fc2745b3d84cd2c7bbada1664b9064
  requirements/ui/board.md: d4164043b410b1dbf6440c1cbe87dd205beabc462120ce85db6d3d26e02979ee
  requirements/ui/questions-notices.md: da49a5228455a46ea1c5638584774d71db33130773dca352b25462aed56cf77c
  requirements/tech/proposal.md: dbc32e894ca099839a3c650d6820857e44870c21ac87fbb307ddabba260ff7fe
delete: []
created: 2026-10-20T21:08:08.884Z
label: React + shadcn
---
# Pannello in React e shadcn

La webview del pannello è cresciuta a circa 7.200 righe di DOM e CSS scritti a mano, e ogni Proposal aggiunge schede, modali e controlli rifatti da zero, accessibilità compresa. Si passa a React con i componenti di shadcn/ui e Tailwind CSS 4, e il pannello prende un aspetto proprio, più vivo, con tema chiaro e scuro.

Decisioni del developer:
- Aspetto: palette di shadcn, non quella dell'editor; zinc con primario blu, in chiaro e in scuro.
- Chiaro o scuro con una nuova impostazione `Theme` (`Auto` che segue l'editor, il default, `Light`, `Dark`), in un nuovo gruppo `Appearance` in cima a Settings.
- Si rinnovano forme e spaziature, stati e focus, movimento (tolto con la riduzione del movimento) e profondità.
- Icone lucide al posto dei glifi codicon.
- Colori semantici (tag, pallini, schede rosse e gialle, bordo animato) dalla palette di Tailwind, con una tonalità per il chiaro e una per lo scuro.
- Carattere: quello dell'interfaccia dell'editor per il testo e quello a spaziatura fissa per ID e codice.
- Tutti i controlli diventano componenti shadcn: Button, Card, Badge, Tabs, Dialog, Select, Checkbox, Tooltip, Popover; i campi dei modelli diventano una Combobox (Popover e Command, con `cmdk`).
- Il Diagramma resta in cytoscape ed elkjs, dentro un componente React.
- Il renderer Markdown nostro produce elementi React, mai `dangerouslySetInnerHTML`.
- Stili con Tailwind 4, compilato alla build.
- Test dei componenti con happy-dom e Testing Library.
- Le librerie stanno nelle Specs, create con questa Proposal; le skill dei Requisiti passano alla modalità indice.
- Una Proposal con un Task di base e un Task per scheda; alla fine il codice vecchio sparisce.

Scelte mie da verificare:
- Corrispondenza delle icone: `play` → Play, `add` → Plus, `wand` → WandSparkles, `search` → Search, `type-hierarchy` → Network, `checklist` → ListChecks, `check` → Check, `close` → X, `circle-slash` → Ban, `go-to-file` → FileInput, `chevron-*` → Chevron*, `info` → Info, `settings-gear` → Settings, `link` → Link, `package` → Package.
- Con `Auto` un tema dell'editor ad alto contrasto scuro dà il tema scuro, uno ad alto contrasto chiaro il tema chiaro.
- I colori semantici: tag fra blue, green, amber, violet, cyan e red di Tailwind (600 in chiaro, 400 in scuro); bordo animato fra blue e cyan; pallino In progress amber, Done green.
- Le transizioni durano al massimo 200 ms.
- Un Task finale toglie il codice di disegno rimasto (helper DOM, SVG codicon, `shell.css`, DOM finto dei test).
