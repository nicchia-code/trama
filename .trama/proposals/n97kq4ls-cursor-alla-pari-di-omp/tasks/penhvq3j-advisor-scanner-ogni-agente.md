---
refs:
  - agent-launching
  - agent-terminal
  - requirements/rules#work
  - requirements/tech#agent-launching
  - requirements/quality#agent-launching
---
# Istruzione e regole dell'Advisor

L'Advisor Scanner vale con ogni agente: con omp l'advisor è quello di omp, nella chat di Cursor è l'Advisor della chat. Con l'impostazione accesa tutti gli scan sono spenti con qualunque agente.

Quando il Task è fatto:

- L'Advisor Scanner è attivo quando `trama.experimentalAdvisorScanner` è acceso, letto quando un lavoro sta per partire, senza più la condizione `configuredAgent() === "omp"` (`configuredAdvisorScanner` in `extension/src/host/agent.ts`); un cambio vale per i lavori che partono dopo e un Run già partito finisce con le regole con cui è partito.
- L'istruzione di ogni Run con l'Advisor Scanner attivo porta, dopo l'istruzione e la frase del limite e prima della lingua, la frase del suo agente e mai la frase dei sotto-agenti di confronto: con omp quella di oggi; con la chat di Cursor "The Advisor Scanner is on: skip the pre-flight and the targeted end-of-run scan; whenever Trama asks, have the trama-advisor sub-agent review the code as the skill says, and tell your sub-agents." (`agentPrompt`, ramo della chat di `launchAgent`). Design, import, Resolve Drifts e setup partono come sempre.
- Con omp la riga di comando, l'overlay, `TRAMA_ADVISOR_SCANNER` e `.omp/WATCHDOG.yml` restano come oggi; con la chat la consegna non cambia e l'advisor è l'Advisor della chat.
- Le regole di ciò che fa l'advisor quando il codice non segue Modello, Requisiti o il Task (nota all'agente per il codice del Task, Drift senza origine per il codice che c'era già, mai `notBlocking`, mai Task, file, spostamenti, annunci o decisioni) valgono per l'advisor di omp e per `trama-advisor`.
- Un annuncio di lancio nella chat appartiene alla conversazione che parte con quell'istruzione, appena Trama la riconosce, e fino ad allora alla chat del progetto.
- Qualità: `trama.experimentalAdvisorScanner` si legge solo dalle impostazioni utente; un advisor che fallisce non ferma il Run; le definizioni utente di `trama-advisor` stanno fuori dal repository, con il modello come stringa YAML citata.
