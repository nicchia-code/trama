---
status: approved
base:
  requirements/ui/settings-specs.md: 603e9901fd2e19ed111f253dc0653d453f7ddc4e1899273be791ca43205b9306
  requirements/tech/settings.md: 4cbafa831ad063ecb07285caf39553529ee4d691cc56132c187111205afbd25b
delete: []
request: 2026-10-17T22-23-24
created: 2026-10-17T20:26:16.455Z
label: Ingranaggio Settings
---
# Settings come ingranaggio a destra della barra

La richiesta di design chiede di portare Settings tutto a destra nella barra in cima al pannello, con un ingranaggio.

Decisioni prese nell'intervista:
- La tab Settings è l'ultima della barra, staccata dalle altre dallo spazio libero e allineata al bordo destro del pannello; le altre tab restano a sinistra nel loro ordine.
- Mostra solo l'ingranaggio (glifo codicon `settings-gear`, 16 px, nel colore del testo), senza testo, con tooltip e nome accessibile `Settings`.
- Selezionata o no, si comporta come le altre tab: stessa sottolineatura nel colore del fuoco e stessa opacità.
- In Get Started, dove le tab sono solo Get Started e Settings, l'ingranaggio sta comunque tutto a destra.

Assunzione da verificare: l'ingranaggio è lo stesso SVG inline già usato sulle schede delle Proposal, coerente con la regola esistente che vieta font di icone nel pannello.
