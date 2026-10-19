---
column: done
technical: false
refs:
  - panel/Settings
  - panel/Open/developer.SHOW_SETTINGS
  - requirements/ui#panel/Settings
  - requirements/tech#panel/Settings
drift: null
proposal: ld5527fo
agent: false
created: 2026-10-19T20:15:55.261Z
finished: 2026-10-19T20:28:08.748Z
---
# Gruppo Experimental e Advisor Scanner

Fatto quando:
- la scheda Settings ha quattro gruppi, `Agent`, `Models`, `Project` ed `Experimental`, e `Experimental` contiene, in quest'ordine, `trama.driftAutoPilot`, `trama.submitWhileRunning`, `trama.experimentalDriftBlocker` e `trama.experimentalAdvisorScanner`; i gruppi `Drift autopilot` e `Runs` non esistono più (`SETTING_GROUPS`);
- `trama.driftAutoPilot` e `trama.submitWhileRunning` tengono chiave, dichiarazione nel manifest, controllo, spiegazione, avviso del workspace, dialogo di conferma della delega e comportamento: cambia solo il gruppo;
- il manifest dichiara `trama.experimentalAdvisorScanner` booleana, default `false`, `scope: "application"`, con la descrizione in inglese di `ui#panel/Settings`, che dice anche che vale solo con omp e che `.omp/WATCHDOG.yml` sostituisce l'advisor predefinito di omp nelle sessioni avviate a mano; nella scheda è una casella di spunta con il titolo `Experimental Advisor Scanner`, sempre attiva qualunque sia `trama.agent`;
- un solo aiuto dell'host dice se l'Advisor Scanner è attivo: valore utente `true` e `trama.agent` uguale a `omp`; un valore non booleano vale spento;
- il test dei gruppi segue i gruppi nuovi; `README.md` ed `extension/README.md` nominano i gruppi nuovi e descrivono l'Advisor Scanner con la sua conseguenza sulle sessioni di omp avviate a mano; `CHANGELOG.md` registra il cambiamento.
