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
---
# Pannello in React e shadcn/ui

Il webview passa da DOM costruito a mano a React 19 con componenti shadcn/ui, icone lucide e Tailwind 4, compilato in un solo foglio di stile e un solo bundle. Il guscio ha una sola radice React; le schede Board, Settings, Requirements, Specs, Get Started, Diagramma e l'overlay delle domande sono componenti React che mandano gli stessi messaggi all'host di prima.

Settings ha il nuovo gruppo Appearance con `trama.theme` (auto, light, dark), applicato subito senza ricaricare, e una `Combobox` riusata dalla modale del modello della Board. Il Diagramma resta disegnato da cytoscape con elkjs dentro un componente React. Il vecchio codice di disegno (helper DOM, glifi codicon, `shell.css`, CSS delle schede) è rimosso; i test usano happy-dom e Testing Library.
