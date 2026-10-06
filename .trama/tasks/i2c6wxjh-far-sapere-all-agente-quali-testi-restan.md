---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
drift: null
proposal: null
agent: false
created: 2026-10-06T15:37:01.420Z
finished: 2026-10-06T15:40:55.682Z
---
# Far sapere all'agente quali testi restano in inglese quando è scelta una lingua

Quando l'istruzione chiede all'agente di scrivere in una lingua, oggi l'agente sa solo che il codice resta in inglese, e infatti scrive nella lingua scelta anche i titoli delle schede e dei Requisiti.

Quando è fatto, le skill di Trama dicono all'agente, senza nominare nessuna lingua precisa:
- che nella lingua chiesta vanno solo la prosa che produce per Trama: corpi, descrizioni e introduzioni di Proposal, file del Model, Requisiti, Task e Drift, il testo delle domande e delle loro opzioni, e le sue risposte nella conversazione;
- che restano sempre in inglese il codice e i suoi commenti, i messaggi di commit, la documentazione del progetto, i nomi e i titoli degli elementi del Model, dei Requisiti, delle Proposal, dei Task e dei Drift, gli ID, i nomi degli Event, i titoli di sezione che Trama richiede e i contrassegni `(initial)` e `(final)`;
- che cambiare lingua non cambia nulla di già scritto: modificando un file scritto in un'altra lingua tiene il testo esistente e scrive nella lingua chiesta solo il testo nuovo o riscritto, senza tradurre tutto il file.

Senza una lingua chiesta nell'istruzione l'agente si comporta come prima.
