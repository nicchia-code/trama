---
refs:
  - menu-laterale
  - requirements/ui#menu-laterale
  - requirements/tech#menu-laterale
technical: false
---

# Nome progetto nel menu laterale

In un progetto Trama l'intestazione della vista del menu laterale (Machine `menu-laterale`) porta il nome del progetto: il nome del System nel Model oppure, quando il Model manca, non si può leggere o non ha un nome di System, il nome della cartella del progetto. Quando il nome del System cambia, l'intestazione lo segue. L'icona nella activity bar mantiene il nome `Trama`, che l'editor non permette di cambiare mentre è in esecuzione. Fuori da un progetto Trama (nessuna cartella aperta, oppure una cartella che non è un progetto Trama) l'intestazione dice solo `TRAMA`.

## Cosa deve valere a lavoro finito

- In situazione `project` il titolo della vista è il nome del progetto: il testo dell'H1 di `system.md`, senza spazi iniziali e finali; se il Model manca, non si legge o l'H1 è vuoto, il `basename` della cartella del progetto. Poiché la vista è l'unica del suo container, VS Code mostra l'intestazione come `TRAMA: <NOME>` con le sue maiuscole.
- Il titolo segue ogni cambiamento del nome del System.
- Senza cartella aperta o in una cartella che non è un progetto Trama il titolo della vista è `Trama` e l'intestazione mostra solo `TRAMA`.
- Tooltip e nome accessibile dell'icona nella activity bar restano `Trama`: il container `trama` e la vista `trama.home` mantengono il nome `Trama` in `extension/package.json` (righe ~93-98, 109-115), quindi anche l'intestazione prima della prima risoluzione della vista resta `Trama`. `test/activity-bar-manifest.test.ts` (righe 11, 13) resta invariato.

## Come

- Il titolo è `WebviewView.title` (scrivibile a runtime), impostato dal provider del menu `MenuView` in `extension/src/host/menu/view.ts` in `resolveWebviewView` (righe ~70-93) e a ogni `menuState` (refresh/schedule): in situazione `project` (vedi `menuSituation()`, righe ~28-31) il nome del progetto, altrimenti `Trama`.
- Il nome del progetto viene da una sola funzione host esportata e testata, che restituisce `system.name.trim()` dello Snapshot che il provider già costruisce (`surface()`/`facts()`), oppure il `basename` della cartella del progetto quando quel nome è vuoto o il Model non si legge.
- Il metodo privato `Controller.projectTitle` in `extension/src/host/controller.ts` (riga ~858; chiamato solo alle righe ~768, 878, 881) sparisce, perché il pannello non usa più il nome del System (`tech#panel`, gestito da un'altra Task della stessa Proposal che smette di chiamarlo). Lo rimuove la Task che lo trova inutilizzato: se al momento di questo lavoro non ha più chiamanti, l'agente lo elimina; la nuova funzione non deve dipendere da esso.
- Test in `test/host-menu.test.ts` (accanto ai test di `MenuView` con `fakeView`, righe ~272-399) verificano il titolo nelle tre situazioni (progetto con nome del System; progetto con Model mancante/illeggibile/H1 vuoto → nome della cartella; nessuna cartella o cartella non progetto → `Trama`) e dopo un cambiamento del nome del System.
