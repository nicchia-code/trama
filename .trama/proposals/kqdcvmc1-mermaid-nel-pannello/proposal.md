---
status: approved
base:
  requirements/ui/panel.md: 172dfc12993a578cc130c278e8ad3208d37c13428c156d20696b2cc90344e49c
  requirements/tech/panel.md: 3213cb30e6a4b71d5f2605f5e2d0e0b60a0c56d86f5ab28f75206ee287bc516a
  specs.yaml: 5961d83c2c741e7088ac23e092a05a3f89bf9d7cf2bc332ff42c2f6280d12668
  requirements/tech/markdown.md: new
  requirements/tech/general.md: 2aec893dee3d24a0d0585ae9244f7a64cdfd095fb256a769a3d35f8670177eaa
delete: []
created: 2026-10-25T13:53:31.418Z
label: Markdown GitHub
---
# Mermaid nel pannello

Il renderer Markdown del pannello impara i diagrammi `mermaid` e le estensioni del Markdown di GitHub, così la vista Team (Proposal che seguono) può mostrare un'anteprima fedele delle issue, e ogni altro testo del pannello ne beneficia.

Decisioni:
- I blocchi ```mermaid si disegnano come diagrammi ovunque il pannello rende Markdown, anche in omp Chat: un solo renderer, un solo comportamento.
- Le estensioni di GitHub (task list, barrato, indirizzi http/https nudi come link, `#123` e `@handle`) entrano nel renderer condiviso.
- Le immagini restano non supportate: le issue non porteranno immagini.
- Un diagramma che `mermaid` non sa leggere si mostra come blocco di codice scritto.

Scelte dell'agente, da verificare:
- Libreria `mermaid` 12, in un bundle separato `mermaid.js` caricato solo al primo diagramma, con il nonce della pagina: la CSP non cambia.
- `securityLevel: "strict"`: niente `click` né HTML nei diagrammi; l'SVG di `mermaid` è l'unico markup che entra nel DOM, con `DOMParser`.
- `#123` e `@handle` diventano link solo quando il remote `origin` del progetto è su github.com; altrimenti restano testo.
