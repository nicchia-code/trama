---
description: "Usa quando mostri Get Started, Start from Scratch, Import from Code o il Diagramma con il Modello vuoto."
---
# Get Started e Start from Scratch

## panel/Get Started
- Le schede del pannello sono solo Get Started e Settings. Il titolo della scheda del pannello è il nome della prima cartella dell'area di lavoro.
- In alto un avviso: «Trama will create a `.trama` folder that describes this project. It holds no secrets and is meant to be committed. It also writes the agent skills and the Trama sub-agent definition into this project, which are meant to be committed too.»
- Sotto, due pulsanti uno accanto all'altro: «Import from Code», con tooltip «Set up Trama and ask an agent to describe the existing code as Proposals», e «Start from Scratch», con tooltip «Set up Trama and describe the project you want to build». Il nome accessibile di ciascuno è il testo seguito da un punto e dal tooltip.
- Mentre una scelta è in corso, dalla scelta della cartella fino alla fine dell'inizializzazione, i due pulsanti sono disabilitati.
- Un'inizializzazione fallita mostra il motivo in un paragrafo sotto i pulsanti, annunciato alle tecnologie assistive (`role="alert"`). Un annullamento non mostra nulla.
- Con più cartelle nell'area di lavoro la scelta della cartella è un selettore delle cartelle dell'editor con il testo «Folder to initialize as a Trama project».

## panel/Diagram
- Con il Modello vuoto, sotto le schede, il testo «The Model is empty. Import the existing code or start from scratch; later, design changes from the Board.», in cui «Board» è un collegamento con nome accessibile e tooltip «Open the Board».
- Sotto il testo due pulsanti uno accanto all'altro, nello stile dei pulsanti del pannello: «Import from Code», con tooltip «Ask an agent to describe the existing code as Proposals», e «Start from Scratch», con tooltip «Set up Trama and describe the project you want to build».

## project
- Il dialogo modale della cartella con file dice «This folder already contains files. Start from Scratch ignores them unless your request mentions them; Import from Code describes them instead.» e ha i pulsanti «Start from Scratch» e «Import from Code», più l'annullamento dell'editor.
- Il dialogo modale delle skill personalizzate dice «Trama did not initialize this project.», con il dettaglio che elenca i file in conflitto, e ha un solo pulsante, «Overwrite and Initialize», più l'annullamento dell'editor.
- Senza nessuna cartella aperta, aprire Trama mostra il messaggio informativo «Trama: open a folder to use Trama.»; l'inizializzazione mostra l'errore «Trama: open a folder first, then initialize it.».
- Ogni altra azione in un'area di lavoro senza progetto mostra «Trama: this workspace has no .trama/ project. Open Trama to set it up.».
- Tutti questi testi sono in inglese e non seguono `trama.language`.
