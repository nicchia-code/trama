---
created: 2026-10-25T09:50:24.083Z
updated: 2026-10-25T09:50:24.083Z
summary: Il menu laterale porta il nome del progetto nell'intestazione; la scheda dell'editor porta il nome della vista mostrata (Board, Diagram, Settings…), mai il nome del System, della cartella o «Trama».
tasks:
  - 3g600tqt
  - n1b6rn0g
---
# Nome progetto nel menu e titolo scheda dalla vista

L'intestazione della vista del menu laterale mostra il nome del System nel Model. Se il Model manca, non si legge o non ha un nome di System, mostra il nome della cartella del progetto. Quando il nome del System cambia, l'intestazione lo segue. Fuori da un progetto Trama, cioè senza cartella aperta o in una cartella che non è un progetto Trama, dice solo `TRAMA`. L'icona nella activity bar resta `Trama`, perché l'editor non permette di cambiarla mentre è in esecuzione.

Il titolo della scheda dell'editor porta invece il nome della vista mostrata, con le stesse parole delle voci del menu laterale: `Board`, `Diagram`, `Requirements`, `Specs`, `History`, `Settings` o `Get Started`. Il titolo cambia appena il panel cambia vista, qualunque ne sia l'origine: menu laterale, comando della palette, focus o link interno.
