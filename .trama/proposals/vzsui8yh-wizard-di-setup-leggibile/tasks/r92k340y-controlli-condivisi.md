---
technical: false
refs:
  - panel/Settings
  - requirements/ui#panel/Settings
  - requirements/ui#General
---

# Controlli di Settings senza sovrapposizioni

I controlli delle impostazioni sono condivisi fra la scheda Settings, il wizard di setup e la finestra del modello sulla Board; i difetti qui sotto vanno corretti nei componenti condivisi, così valgono ovunque. La scheda Settings mantiene la sua griglia (colonne di pari larghezza, almeno circa 240 px, a capo fino a una colonna sola; titoli e controlli di una riga alla stessa altezza) e la sua «i» con il fumetto. Il wizard usa gli stessi componenti; la spiegazione scritta sotto il titolo al posto della «i», nel wizard, è oggetto di un altro Task.

Quando il lavoro è finito vale quanto segue.

- Spazio sotto i campi: messaggi di errore e avvisi del workspace stanno sotto il controllo della loro impostazione, dentro la sua colonna; un messaggio assente non lascia spazio vuoto sotto il controllo. Il resto del layout della griglia non cambia.
- Checkbox: una `Checkbox` sta a sinistra del titolo, sulla stessa riga, e cliccare il titolo la cambia. Le altre impostazioni mantengono il titolo con subito a destra la «i» e il controllo sotto.
- Tooltip della «i»: il tooltip `About <titolo>` (per esempio `About Max Parallel Agents`) c'è solo mentre il puntatore è sulla «i» o la «i» ha il fuoco, mai insieme al fumetto e mai dopo che il puntatore se n'è andato. Il comportamento del fumetto resta quello già descritto nei Requisiti.
- Tendina dei suggerimenti dei modelli (`Combobox` di `trama.analysis`, `trama.scan`, `trama.execution`): è larga quanto il campo e allineata ai suoi bordi, non ne esce mai di lato e non copre i campi accanto. Mentre il developer scrive e l'elenco si filtra la larghezza non cambia. Nessuna voce si accorcia con i puntini: le voci più lunghe del campo vanno a capo. Vale in ogni posto in cui compare il campo: la scheda Settings, il wizard di setup e la finestra del modello sulla Board.
- Contrasto della Checkbox: una `Checkbox` non spuntata ha un bordo con contrasto di almeno 3:1 rispetto allo sfondo, nel tema chiaro e nel tema scuro, così si riconosce senza cercarla. Vale per ogni `Checkbox` del pannello.
