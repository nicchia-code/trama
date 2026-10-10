---
status: resolved
resolution: fix-code
refs:
  - panel
  - requirements/ui#panel
proposal: null
task: qpkjpewz
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:47:42.977Z
---
# Il titolo del pannello resta Trama invece del nome del Sistema

## What happens

La scheda dell'editor che contiene il pannello si chiama sempre **Trama**, anche quando il Modello contiene un nome del Sistema. Gli aggiornamenti dei file e i nuovi quadri del pannello non cambiano il titolo; con un Modello vuoto o illeggibile non compare neppure il nome della cartella del progetto.

## What should happen

La scheda deve portare **il nome del Sistema**, ricavato dal suo H1 senza spazi attorno. Se il Modello manca, non si legge o non ha un nome, deve usare il nome della cartella del progetto. Il titolo deve aggiornarsi a ogni nuovo quadro, seguendo le modifiche del Modello. Il nome dell'estensione e dei comandi resta Trama.

## Fix options

### Aggiornare il titolo insieme al quadro

Ogni nuovo quadro del pannello aggiorna anche il titolo con il nome corrente del Sistema. All'apertura e quando il Modello non offre un nome leggibile si usa la cartella del progetto. Il developer vede così titolo e contenuto riferiti allo stesso Modello; il costo è integrare il titolo nel ciclo già esistente di apertura e aggiornamento.

### Seguire direttamente il nome del Modello

Il pannello segue il nome del Sistema anche separatamente dal contenuto delle schede, tornando al nome della cartella quando manca o non si legge. Ogni nuovo quadro riallinea comunque il titolo. Questo rende visibili le modifiche del nome anche quando altri file impediscono un aggiornamento completo; il costo è una lettura dedicata e mantenere allineati i due aggiornamenti.

## Where in the code

extension/src/host/controller.ts: Controller.create assegna il titolo fisso "Trama"; Controller.refresh invia il quadro senza aggiornare WebviewPanel.title.
