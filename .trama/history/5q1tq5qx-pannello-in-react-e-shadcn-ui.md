---
created: 2026-10-20T21:38:55.593Z
updated: 2026-10-20T21:38:55.593Z
summary: "Il pannello è rifatto in React con shadcn/ui e Tailwind: tutte le schede, un solo createRoot, tema chiaro/scuro con la nuova impostazione trama.theme e il vecchio disegno DOM tolto."
tasks:
  - g8r0eyfz
  - bds9889h
  - cujuq7dh
  - lmsfs9eg
  - twwuk0b5
  - 05qo36rx
  - hbkk737w
cleared:
  hbkk737w:
    title: Pulizia del disegno vecchio
    proposal: p5ty6g5g
    tag: React + shadcn
    finished: 2026-10-20T21:37:48.534Z
    refs:
      - panel
  05qo36rx:
    title: Board in React
    proposal: p5ty6g5g
    tag: React + shadcn
    finished: 2026-10-20T21:34:38.933Z
    refs:
      - panel/Board
      - requirements/ui#panel/Board
      - requirements/ui#proposal
      - requirements/ui#task
      - requirements/ui#voce-history
      - requirements/tech#proposal
  bds9889h:
    title: Settings in React
    proposal: p5ty6g5g
    tag: React + shadcn
    finished: 2026-10-20T21:26:43.471Z
    refs:
      - panel/Settings
      - panel/Open/developer.SHOW_SETTINGS
      - requirements/ui#panel/Settings
      - requirements/tech#panel/Settings
  lmsfs9eg:
    title: Diagramma in React
    proposal: p5ty6g5g
    tag: React + shadcn
    finished: 2026-10-20T21:23:53.174Z
    refs:
      - panel/Diagram
  twwuk0b5:
    title: Overlay domande in React
    proposal: p5ty6g5g
    tag: React + shadcn
    finished: 2026-10-20T21:21:36.696Z
    refs:
      - question-round
      - requirements/ui#question-round
  cujuq7dh:
    title: Requirements, Specs e Get Started
    proposal: p5ty6g5g
    tag: React + shadcn
    finished: 2026-10-20T21:20:58.701Z
    refs:
      - panel/Requirements
      - panel/Specs
      - panel/Get Started
  g8r0eyfz:
    title: Base React e shadcn
    proposal: p5ty6g5g
    tag: React + shadcn
    finished: 2026-10-20T21:18:32.152Z
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
# Pannello in React e shadcn/ui

Il webview passa da DOM costruito a mano a React 19 con componenti shadcn/ui, icone lucide e Tailwind 4, compilato in un solo foglio di stile e un solo bundle. Il guscio ha una sola radice React; le schede Board, Settings, Requirements, Specs, Get Started, Diagramma e l'overlay delle domande sono componenti React che mandano gli stessi messaggi all'host di prima.

Settings ha il nuovo gruppo Appearance con `trama.theme` (auto, light, dark), applicato subito senza ricaricare, e una `Combobox` riusata dalla modale del modello della Board. Il Diagramma resta disegnato da cytoscape con elkjs dentro un componente React. Il vecchio codice di disegno (helper DOM, glifi codicon, `shell.css`, CSS delle schede) è rimosso; i test usano happy-dom e Testing Library.
