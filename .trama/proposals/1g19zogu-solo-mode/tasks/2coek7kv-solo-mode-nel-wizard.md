---
refs:
  - setup-wizard
  - requirements/rules#setup-wizard
---
# Solo mode nel wizard

Il wizard di setup offre Solo mode, la modalità che tiene i file di Trama fuori da git solo in questa copia di lavoro, quando il progetto nasce. Il core e la CLI (`trama project new` e `trama project edit` con `solo: "off" | "folders" | "files"`) e la riga della scheda Settings (`ui#solo-switch`) arrivano con altri Task della stessa Proposal.

A Task finito:

- Nei modi primo setup e Modello vuoto, e solo lì (mai nel Guided setup), il passo `Project` mostra dopo `trama.skillsDir` la stessa riga `Solo Mode` della scheda Settings, con la nota `Only this workspace.`, il campo `Exclude` (`Whole folders` di default, `Only Trama's files`) quando è scelto, e fuori da un repository git il controllo spento e disattivato con `Solo mode needs a git repository.`. L'elenco dei file tracciati non si mostra nel wizard.
- Valore iniziale: spento nel primo setup; nel modo Modello vuoto quello attuale del progetto. La scelta vive nello stato del wizard come le cartelle escluse e viaggia in `confirmSetup` come `solo`; nulla si scrive prima della conferma.
- Riepilogo: il passo `Project` aggiunge `Solo Mode` con `On` o `Off` e, se acceso, `Exclude` con il valore scelto, evidenziati con il valore che sostituiscono quando cambiano quello attuale del progetto.
- Primo setup: l'inizializzazione passa `solo` a `trama project new`, che accende Solo mode prima di scrivere ogni altro file; se fallisce l'inizializzazione fallisce, non si crea nulla, e il riepilogo mostra il motivo come oggi.
- Modello vuoto: dopo le scritture delle impostazioni e prima del percorso, solo quando la scelta differisce dal valore del progetto, `trama project edit` con `solo` accende, cambia tipo o spegne Solo mode; una scrittura fallita conta come un salvataggio fallito, il wizard resta sul riepilogo e nulla parte.
- Con Solo mode scelto, l'avviso di Get Started nei passi `Path` e `Summary` usa il testo di Solo mode (`ui#panel/Get Started`).
- `rules#setup-wizard` dice che Solo Mode non è una chiave delle impostazioni utente e si scrive nel progetto.
