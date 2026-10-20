---
refs:
  - focus
  - developer.STEP_FOCUS
  - developer.TOGGLE_ONLY_FOCUSED
  - developer.CLEAR_FOCUS
  - requirements/ui#focus
  - requirements/rules#focus
---
# Focus delle schede

Diagramma, Requisiti e Specs hanno ciascuno il proprio focus, indipendente dagli altri, che nasce da una Proposal, da un Task o da un solo riferimento e si percorre a passi.

Quando il Focus è fatto:

- Il focus di una Proposal comprende il suo scope (gli elementi del Modello che cambia più quelli a cui sono intitolate le sezioni che cambia; nei Requisiti le sezioni aggiunte, cambiate, tolte o spostate e le Aree intere); quello di un Task i suoi riferimenti, con nei Requisiti le sezioni intitolate ai suoi elementi o a ciò che contengono; quello di un chip il suo solo riferimento, compreso un campo delle Specs. Le regole esatte sono in `rules#focus`.
- In **Senza focus**, `developer.FOCUS_PROPOSAL` porta in **Con focus** disegnando la Proposal e mostrandone i dettagli nel Diagramma; `developer.FOCUS_TASK` e `developer.FOCUS_REF` portano in **Con focus** senza Proposal disegnata e con il primo elemento del passo selezionato nel Diagramma.
- In **Con focus**, un nuovo `FOCUS_PROPOSAL`, `FOCUS_TASK` o `FOCUS_REF` sostituisce del tutto il focus e la Proposal disegnata di prima.
- Nel Diagramma un passo è un livello con i suoi elementi del focus, nell'ordine del Modello; andarci apre il livello come un link e la vista scivola sui suoi elementi, entro il limite di `Fit`, senza animazione con movimento ridotto. Gli elementi del focus tengono i colori del cambiamento o sono in ciano; il resto del livello scende al 30% di opacità e resta cliccabile. Un livello aperto a mano senza elementi del focus si vede normale e il contatore dice `– of N`.
- Nei Requisiti tutte le Aree restano visibili, le sezioni del focus sono segnate (colore del cambiamento o ciano, anello sul passo corrente) e la pagina scorre al passo; nelle Specs lo stesso per il campo.
- La barra del focus in cima alla scheda mostra di cosa è il focus, il passo, il contatore, `Previous`/`Next`, `<M> not found` con l'elenco nel tooltip, `Only these` nei Requisiti e `Clear`, come in `ui#focus`.
- `developer.STEP_FOCUS` va al passo precedente o successivo, mai oltre il primo o l'ultimo.
- `developer.TOGGLE_ONLY_FOCUSED`, solo nei Requisiti, nasconde e rimostra le sezioni fuori dal focus e le Aree e i frammenti che non ne hanno.
- `developer.CLEAR_FOCUS` (Clear o Esc, quando non c'è aperta una modale, tendina, fumetto o tooltip) porta in **Senza focus**: via evidenze, attenuazione e barra; livello, posizione e Proposal disegnata restano. Nel Diagramma, con un elemento selezionato, il primo Esc toglie solo la selezione, come oggi, e il focus resta fino al secondo Esc.
- `developer.CHOOSE_DRAWN_PROPOSAL` nel selettore della scheda porta in **Senza focus**.
- `workspace.MODEL_CHANGED` ricalcola il focus e resta sul passo se esiste ancora; se il focus è di una Proposal che non è più aperta porta in **Senza focus**, con la scheda sul Modello senza Proposal, tenendo livello e posizione.
- `developer.CLOSE_PANEL` dimentica il focus di ogni scheda.
