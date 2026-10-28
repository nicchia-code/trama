---
description: "Usa quando mostri Get Started, Start from Scratch, Import from Code o il Diagramma con il Modello vuoto."
---
# Get Started

## panel/Get Started
- Il pannello mostra soltanto Get Started e Settings, che il developer sceglie dal menu laterale (`ui#menu-laterale`). The title of the panel's tab is `Get Started`, or `Settings` while it shows the settings (`ui#panel`).
- La scheda mostra il wizard di setup (`ui#setup-wizard`). Nei passi `Path` e `Summary`, e solo in quelli, sotto la frase del passo e prima del suo contenuto, l'avviso: «Trama will create a `.trama` folder that describes this project. It holds no secrets and is meant to be committed. It also writes the agent skills and the Trama sub-agent definition into this project, which are meant to be committed too.» Gli altri passi non lo mostrano.
- With `Solo Mode` on in the `Project` step (`ui#solo-switch`), the same notice, in the same place, reads instead: «Trama will create a `.trama` folder that describes this project, and write the agent skills and the Trama sub-agent definition into this project. Solo mode keeps them out of git in this working copy only: they are never committed and are versioned nowhere else.»

## panel/Diagram
- Con il Modello vuoto, in cima al Diagramma, il testo «The Model is empty. Import the existing code or start from scratch; later, design changes from the Board.», in cui «Board» è un collegamento con nome accessibile e tooltip «Open the Board».
- Sotto il testo due pulsanti uno accanto all'altro, nello stile dei pulsanti del pannello: «Import from Code», con tooltip «Open the guided setup to describe the existing code as Proposals», e «Start from Scratch», con tooltip «Open the guided setup to describe the project you want to build».

## project
- Il dialogo modale delle skill personalizzate dice «Trama did not initialize this project.», con il dettaglio che elenca i file in conflitto, e ha un solo pulsante, «Overwrite and Initialize», più l'annullamento dell'editor.
- Senza nessuna cartella aperta, aprire Trama mostra il messaggio informativo «Trama: open a folder to use Trama.»; l'inizializzazione mostra l'errore «Trama: open a folder first, then initialize it.».
- Ogni altra azione in un'area di lavoro senza progetto mostra «Trama: this workspace has no .trama/ project. Open Trama to set it up.».
- Quando il controllo all'apertura di Trama ha aggiornato qualcosa compare il messaggio informativo «Trama: updated the agent skills to this version.», senza pulsanti e senza elenco dei file; quando non ha cambiato nulla non compare niente. Se fallisce compare il messaggio di errore «Trama: could not update the agent skills: <motivo>.», senza pulsanti. Il comando `Trama: Update Agent Skills` mantiene il suo resoconto, anche quando non cambia nulla.
- When a step of the extension's start fails (`rules#project`) the editor error message «Trama could not start: <reason>.» appears once, with one button, «Show Log», which opens the `Trama` output channel. A command that needs the failed step shows the same message when the developer runs it.
- Tutti questi testi sono in inglese e non seguono `trama.language`.
