---
refs:
  - scripted-agent
  - visitor.SPEED_UP_AGENT
  - requirements/ui#scripted-agent
  - requirements/tech#scripted-agent
---
# Agente a copioni

Nella demo del sito ogni lavoro che l'estensione darebbe all'agente recita un copione in omp Chat che fa al progetto in memoria ciò che l'agente vero farebbe, così ogni pulsante funziona.

Comportamento (Machine `scripted-agent`):
- Un lavoro parte quando, nella finestra demo, il visitatore avvia ciò che nell'estensione va all'agente: richiesta di design, Ask more, Rework with feedback, Run o Run all, scan, Fix option o Rework di un Drift, risoluzione o unificazione dei Drift, import, raffinamento. Ogni lavoro ha la sua conversazione in omp Chat; più lavori possono recitare insieme. Non c'è agente nel terminale.
- Il copione viene dal tour quando il lavoro risponde a un passo di un capitolo; altrimenti è il copione generico per quel tipo di lavoro su quella scheda. Un copione fa al progetto ciò che l'agente fa con la riga di comando, con le stesse regole: annuncia il ghost e vi scrive note, prende e sposta Task, crea Proposal, Task e Drift, registra la History, chiede un round di domande; pannello, menu laterale e barra di stato reagiscono come all'agente vero. I copioni generici finiscono bene: un Run porta i suoi Task in Done, uno scan di codice conforme non trova Drift, una Fix option risolve il suo Drift.
- Playing: i passi si susseguono nella conversazione; quando il copione arriva al suo round (`ASKED_QUESTIONS`) va in Waiting for answers e il round si apre sopra il pannello come quello dell'agente vero; con `developer.SEND_ANSWERS` riprende, registrando le risposte dove l'agente vero le registrerebbe (per un design, le decisioni nel corpo della Proposal) mentre il resto del copione non cambia. Alla fine (`FINISHED`) va in Done e l'ultimo messaggio dice cosa ha fatto.
- Skip to end (`visitor.SPEED_UP_AGENT`) applica subito tutto il resto, fino al prossimo round di domande se ne resta uno (allora va in Waiting for answers), altrimenti fino alla fine (Done).
- Stop in omp Chat (`developer.STOP_CHAT_AGENT`), Reset della demo e uscita dalla pagina lo portano in Stopped: ciò che ha già fatto resta, il suo ghost sparisce.
- Scrivere liberamente in omp Chat (`developer.SEND_CHAT_MESSAGE`) avvia un copione di cortesia: due frasi che dicono che nella demo l'agente lavora solo dai pulsanti di Trama e qual è il prossimo passo del tour (o, a tour spento, quali pulsanti avviano l'agente).

Interfaccia e costruzione:
- Mentre un copione recita, la sua conversazione mostra Skip to end sopra il campo di input. I messaggi appaiono come quelli dell'agente vero: testo progressivo, righe delle chiamate ai tool (comandi Trama, letture e modifiche di file) con i risultati. L'intero copione dura fra 3 e 10 secondi.
- Un copione è un dato in `site/src/demo/scripts/`: una lista di passi, ciascuno un ritardo e un'azione (aggiornamento della chat come ACP `SessionNotification`, nota del ghost, round di domande, o chiamata a una funzione del core che l'agente raggiunge con la riga di comando: `announce`, `newProposal`, `editInProposal`, `submitProposal`, `newTask`, `moveTask`, `newDrift`, voci di History e simili). I copioni del tour hanno nome per capitolo e passo; quelli generici per tipo di lavoro e ricevono la scheda su cui agiscono. Le chat passano da `ChatViewModel` con un `OmpSessionPort` demo che riproduce le notifiche.
- Ogni copione è verificato da un test che lo recita a velocità infinita su un seme nuovo e controlla che dopo il progetto sia valido secondo le regole di `trama model check`.
