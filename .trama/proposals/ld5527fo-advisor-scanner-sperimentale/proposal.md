---
status: approved
base:
  agent-launching/feature.md: 4648bed7d6f1c1a0789760cf26b41f4ff75c06a54d93a34a5fe9fb3effd88382
  agent-launching/drift-resolution.md: eeb23fd9d900e8826fb3df5d85862bdcb4bb59f1233a4da8811565d8c4eefff6
  editor-panel/panel.md: 448c209f7a75ede4c760276228b9caaacb18553e3369be39e9b708ac6fa40693
  work/task.md: d60807294263f3902c459510ee1cdbcddacb1b07651bbd345f3a56e230a01864
  work/drift.md: f59a9740d5139de74b34703427b5f73b24b550da9305db8b96a0d73f9d4c04ea
  work/announcement.md: 444d5440caa7cc32871b07e11f806079759b180ae924213cdd1220e70285ef66
  project-setup/project.md: f6e2b2f66a69f83595dd0b3daf893f4e681be1b057fd8a953ee41f6c5ba4a9cb
  requirements/rules/models.md: 51b9f7f9d115e16eed23c4ab5ff17576f2c4b25a1c34a0a8d2976b0ee4b6e510
  requirements/rules/scans.md: new
  requirements/ui/settings-specs.md: e61eb3da8f8404b872f0c6b4a6c9540abb062452c1fdcf71a5898ce53694343e
  requirements/ui/panel.md: df3465b55e66a3279529018cceed603dca9d41b8abca143340fb5549080f18a5
  requirements/ui/agents.md: 790671a1aa4d30e28b9e38eb08ceffdeb7224a67a4cfad58b06afc6bb2393dc6
  requirements/tech/settings.md: caeede4945d191f67cb1e179760956136e7299224e0deb9da4acee63d2e07f0f
  requirements/tech/models.md: 5377191636af5197c1fb061832a31fd49771743587b82a90d628f76eb209da94
  requirements/quality/main.md: f4b9be5a87555cb639ed42d671215e33c7f6bdeb9f523880ea3737d2f3e9742a
  requirements/rules/project.md: 0f541fa14c706e208e732e1a9dcfb899b21636f7a067e21fac6d4cb81d6e5018
  requirements/tech/scans.md: new
delete: []
request: 2026-10-19T21-39-54
created: 2026-10-19T20:00:03.595Z
label: Advisor Scanner
---
# Advisor Scanner sperimentale

Con omp, un advisor (secondo modello di omp, `--advisor`) controlla durante i Run, mentre l'agente scrive, che il codice segua Modello e Requisiti, e sostituisce tutti gli scan. È un'impostazione sperimentale; nello stesso gruppo Experimental vanno anche Drift autopilot e Submit While Running, con lo stesso comportamento.

Decisioni dell'intervista:
- Una differenza nel codice che il Task sta scrivendo: l'advisor avvisa l'agente perché segua il Modello. Una differenza nel codice già esistente, fuori dal lavoro del Task: l'advisor archivia lui un Drift, con `trama drift new` (gli serve `bash`).
- L'advisor lavora solo nei Run (un Task, Run all, Run automatico dell'autopilota), non in design, import e Resolve Drifts.
- Con l'impostazione accesa e omp si spengono tutti gli scan: pulsanti Scan di Board e Diagramma, pre-flight e scansione mirata di fine corsa. Resta lo scan leggero del design.
- Con un agente diverso da omp l'impostazione non ha effetto: gli scan restano come oggi.
- Ritmo: un advisor rivede ogni turno senza fermare l'agente; un secondo advisor rivede la corsa intera alla fine e l'agente lo aspetta prima di finire, così nessuna revisione va persa.
- Modello dell'advisor: il ruolo `trama.scan`.
- Nei Run paralleli ogni sotto-agente che realizza Task ha il suo advisor.
- Drift archiviati dall'advisor: senza origine, come quelli dello scan; non si distinguono dagli altri.
- Dopo la riapertura dell'editor, con l'Advisor Scanner attivo anche la fine di un Run rende di nuovo operativa la delega dell'autopilota.
- Istruzioni dell'advisor in `.omp/WATCHDOG.yml` del progetto, scritto da init e Update skills come `trama-analysis.md`; l'advisor tace fuori dai Run di Trama.
- La corsa sa di saltare pre-flight e scansione di fine corsa da una frase nell'istruzione del Run.
- Pulsanti Scan disattivati, con un tooltip che dice che l'Advisor Scanner li sostituisce.
- Nuova impostazione `trama.experimentalAdvisorScanner`, booleana, spenta di base, solo nelle impostazioni utente.
- Drift autopilot e Submit While Running tengono le loro chiavi; cambia solo il gruppo. Ordine in Experimental: `trama.driftAutoPilot`, `trama.submitWhileRunning`, `trama.experimentalDriftBlocker`, `trama.experimentalAdvisorScanner`.
- Nella scheda Settings l'Advisor Scanner è sempre attivo; il fumetto dice che vale solo con omp.
- `.omp/WATCHDOG.yml` resta sempre installato: nelle sessioni di omp avviate a mano nel progetto con l'advisor acceso, omp non crea il suo advisor predefinito e gli advisor di Trama tacciono. La spiegazione dell'impostazione e la documentazione lo dicono.

Scelte mie da controllare:
- Testi in inglese: il titolo `Experimental Advisor Scanner`, la sua spiegazione, il tooltip dei pulsanti Scan disattivati (`Scans are off: the Advisor Scanner checks the code during Runs.`) e la frase dell'istruzione del Run.
- I pulsanti Scan disattivati non portano il numero dei Task finiti dall'ultimo scan.
- Una richiesta di scan che arriva comunque all'editor con gli scan spenti è rifiutata.
- `.omp/WATCHDOG.yml` resta fuori dall'impronta del codice, come `.omp/agents/`, e all'inizializzazione conta come i file delle skill.
- Il modello dell'advisor arriva da un overlay `--config` scritto dall'estensione fuori dal repository (`modelRoles.advisor`, `task.agentAdvisor` per i sotto-agenti). Nei Run con advisor Trama non passa più `--slow`.
- L'advisor non annuncia schede e non dà il giudizio del blocco sperimentale dei Drift: i suoi Drift bloccano come tutti.
- Un advisor che fallisce non ferma il Run, e nessuno scan lo sostituisce.
- Da verificare con omp 18.12 in implementazione: che `--config` accetti `task.agentAdvisor` e che `session_stop` scatti dopo l'attesa dell'advisor finale; altrimenti l'hook di Trama aspetta gli advisor prima di segnalare il riposo.
- Le regole di `rules#work` passano dal frammento `rules/models.md` a un frammento nuovo, `rules/scans.md`, che raccoglie anche quelle dell'Advisor Scanner.
