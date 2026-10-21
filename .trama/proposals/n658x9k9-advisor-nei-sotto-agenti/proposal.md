---
status: approved
base:
  requirements/rules/scans.md: ee7e7266db603b4d45e47015a41c85353904fa2f47d1d2a5452811ddae62d0b1
  requirements/tech/models.md: 8f34ef0739c6ec5c10746609154050a8dc953cb143f86ce9685832ff5c16ddbe
  requirements/cli/main.md: 651a3704a8bd004cdead73b62d47d64be2407d3ce5f39217b7679dc487a969c6
  requirements/quality/main.md: d171f57688982db804c8d84c8ba36081ce6eaf4758b1b092bda8872ff81a43d3
delete: []
created: 2026-10-21T04:38:50.193Z
label: Advisor Scanner
---
# Advisor nei sotto-agenti

# Advisor nei sotto-agenti

Con l'Advisor Scanner attivo gli advisor di omp dei sotto-agenti non lavorano. Un advisor agisce solo se l'istruzione della sessione contiene la frase "The Advisor Scanner is on". Un sotto-agente però riceve come istruzione solo la sua assegnazione ("Task id: … Implement it per the skill."): la frase gli arriva nel `context`, che il suo advisor non vede. Dal 19 ottobre gli advisor dei sotto-agenti hanno taciuto in 67 sessioni su 69, ogni volta dicendo che la frase mancava. Con l'esecuzione parallela il codice lo scrivono quasi solo i sotto-agenti, quindi nessuno lo confrontava con il Modello: da allora non è nato nessun Drift.

Il Modello dice già che ogni sotto-agente che realizza un Task ha il suo advisor. Questa Proposal cambia i Requisiti che dicono come l'advisor capisce di essere in un Run, così il comportamento del Modello si avvera.

## Decisioni

Il developer ha chiesto di scegliere la soluzione più efficace senza domande. Scelte da controllare:

- L'advisor non cerca più una frase nel testo che vede. Trama mette la variabile d'ambiente `TRAMA_ADVISOR_SCANNER=1` nel terminale dei soli Run lanciati con l'Advisor Scanner attivo. omp la passa a ogni sotto-agente e ai loro advisor. Verificato con omp 18.12.1: un advisor della sessione principale e quello di un sotto-agente `task` leggono la stessa variabile con `bash`.
- Nuovo comando `trama advisor show`, in sola lettura: dice se la sessione appartiene a un Run con l'Advisor Scanner, leggendo solo quella variabile. È un comando di Trama e non `printenv`, così funziona con ogni shell, Windows compreso, e si può testare.
- Le istruzioni degli advisor (`.omp/WATCHDOG.yml`) dicono di lanciare `trama advisor show` alla prima revisione di ogni sessione, e di nuovo dopo un azzeramento del contesto. Se il comando dice di sì l'advisor lavora; altrimenti tace per tutta la sessione e non lancia altri comandi. La regola vale identica per la sessione principale e per ogni sotto-agente.
- Prima di archiviare un Drift l'advisor guarda i Task In progress con `trama task list`. In una corsa parallela il codice che un altro sotto-agente sta scrivendo è lavoro di un Task della corsa, non codice già esistente: senza questo controllo l'advisor di un sotto-agente archivierebbe Drift sul lavoro dei vicini.
- La frase dell'Advisor Scanner resta nell'istruzione del Run: serve all'agente principale per saltare pre-flight e scansione di fine corsa, non più all'advisor.
- Una sessione di omp avviata a mano, anche con l'advisor acceso, non ha la variabile: gli advisor di Trama lanciano solo `trama advisor show` e poi tacciono.
