---
status: resolved
resolution: proposal
refs:
  - requirements/ui#panel/Settings
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: islis7ut
created: 2026-10-21T04:43:54.327Z
---
# Testo Advisor Scanner nelle Settings

## What happens

La spiegazione dell'impostazione **Experimental Advisor Scanner** dice che, in una sessione di omp avviata a mano con l'advisor acceso, gli advisor di Trama *sostituiscono l'advisor di omp, lanciano solo `trama advisor show` e poi tacciono*. È il comportamento deciso dalla Proposal approvata e dal Task relativo, e README e documentazione dicono lo stesso.

## What should happen

Il Requisito delle Settings cita la spiegazione parola per parola e dice che gli advisor *sostituiscono l'advisor di omp e tacciono*, senza il passo di `trama advisor show`. La citazione non è stata aggiornata dalla Proposal che ha cambiato il comportamento, quindi il testo del Task e la citazione del Requisito non possono essere rispettati insieme.

## Fix options

### Aggiornare il Requisito

Approvare la Proposal allegata, che cambia solo la frase finale della citazione perché dica che gli advisor lanciano `trama advisor show` e poi tacciono. Il codice resta com'è e il comportamento deciso resta documentato.

### Riportare il testo vecchio

Rimettere nel manifest e nel README la frase originale. Il Requisito è rispettato, ma la spiegazione non dice più cosa fanno davvero gli advisor in una sessione avviata a mano, contro ciò che il Task chiedeva.

## Where in the code

extension/package.json (descrizione di trama.experimentalAdvisorScanner), extension/README.md, README.md; Requisito in requirements/ui, sezione panel/Settings.
