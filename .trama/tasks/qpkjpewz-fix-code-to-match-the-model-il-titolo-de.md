---
column: done
technical: false
refs:
  - panel
  - requirements/ui#panel
drift: onoa6rvg
proposal: null
agent: false
created: 2026-10-10T14:15:26.749Z
finished: 2026-10-10T14:58:13.727Z
---
# Fix code to match the Model: Il titolo del pannello resta Trama invece del nome del Sistema

## What happens

La scheda dell'editor che contiene il pannello si chiama sempre **Trama**, anche quando il Modello contiene un nome del Sistema. Gli aggiornamenti dei file e i nuovi quadri del pannello non cambiano il titolo; con un Modello vuoto o illeggibile non compare neppure il nome della cartella del progetto.

## What should happen

La scheda deve portare **il nome del Sistema**, ricavato dal suo H1 senza spazi attorno. Se il Modello manca, non si legge o non ha un nome, deve usare il nome della cartella del progetto. Il titolo deve aggiornarsi a ogni nuovo quadro, seguendo le modifiche del Modello. Il nome dell'estensione e dei comandi resta Trama.

## Chosen option

**Aggiornare il titolo insieme al quadro**

Ogni nuovo quadro del pannello aggiorna anche il titolo con il nome corrente del Sistema. All'apertura e quando il Modello non offre un nome leggibile si usa la cartella del progetto. Il developer vede così titolo e contenuto riferiti allo stesso Modello; il costo è integrare il titolo nel ciclo già esistente di apertura e aggiornamento.

## Where in the code

extension/src/host/controller.ts: Controller.create assegna il titolo fisso "Trama"; Controller.refresh invia il quadro senza aggiornare WebviewPanel.title.
