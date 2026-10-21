---
refs:
  - panel
  - requirements/ui#panel
  - requirements/ui#panel/Settings
  - requirements/tech#panel/Settings
---
# Advisor Scanner con ogni agente

L'Advisor Scanner è attivo quando `trama.experimentalAdvisorScanner` vale `true` nel valore utente (`inspect(key).globalValue`), qualunque valga `configuredAgent()`: l'unico aiuto dell'host (`configuredAdvisorScanner()` in `extension/src/host/agent.ts`) perde la condizione su omp e resta il solo calcolo usato dai lanci, dal quadro della Board e del Diagramma (`controller.ts`) e dal rifiuto delle richieste di scan. Con l'Advisor Scanner attivo, con qualunque agente, ogni pulsante Scan (Sistema nella barra della Board, `Scan` nella barra del Diagramma a ogni livello) resta al suo posto disabilitato, senza `· N`, con la sua icona e il tooltip `Scans are off: the Advisor Scanner checks the code during Runs.`, ripetuti nel nome accessibile; torna normale al quadro successivo solo quando l'impostazione è spenta. Le richieste di scan sono rifiutate allo stesso modo con Cursor.

Nel manifest (`extension/package.json`) la `markdownDescription` di `trama.experimentalAdvisorScanner` diventa esattamente il testo inglese di `ui#panel/Settings` (senza «Only with omp as the agent», con la frase su omp's advisor e `.omp/WATCHDOG.yml` e quella sul sub-agente `trama-advisor` della chat di Cursor); il controllo in Settings, nel gruppo Experimental, è sempre attivo qualunque sia `trama.agent`.

Sulla Board, quando un Run nella chat di Cursor con l'Advisor Scanner finisce senza l'esito della revisione finale, compare in cima un avviso accanto agli avvisi dei ghost, con lo stesso pulsante di chiusura, che resta finché il developer non lo chiude o il pannello non si chiude; un Run finito così non cambia nient'altro sulla Board (testo e regole dell'avviso come li danno i Requisiti dell'Advisor della chat).
