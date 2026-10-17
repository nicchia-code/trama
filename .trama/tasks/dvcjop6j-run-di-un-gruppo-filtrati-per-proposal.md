---
column: done
technical: false
refs:
  - task
  - requirements/rules#agent-terminal
  - requirements/tech#task
drift: null
proposal: znzyo6iv
agent: false
created: 2026-10-17T17:38:35.278Z
finished: 2026-10-17T17:53:29.835Z
---
# Run di un gruppo filtrati per Proposal

Quando il Task è finito, una corsa su più Task usa un solo modello per agente. Se i Task eseguibili in To do del suo ambito, al lancio, non hanno tutti lo stesso modello (perché alcuni appartengono a Proposal con un modello scelto che vale per l'agente di adesso), Run all e il Run automatico delle correzioni e delle origini diventano una sequenza di Run, uno per modello.

I gruppi si decidono al lancio, una volta sola: i Task che lavorano con lo stesso modello stanno insieme, che lo prendano dalla loro Proposal o dai Settings; i Task senza Proposal e quelli delle Proposal al default usano il modello di esecuzione dei Settings (`trama.execution`). I Run partono uno alla volta, prima il gruppo con il Task in To do più vecchio, e il successivo parte solo quando il precedente è finito. Ogni Run prende, come ogni corsa, i Task eseguibili del suo gruppo, anche quelli nati mentre lavora; un Task che nasce nel gruppo di un Run già finito aspetta il prossimo Run all. Ogni Run ha il suo pre-flight e la sua scansione mirata di fine corsa. Se un Run finisce in modo anomalo (il developer chiude il terminale mentre l'agente lavora, il comando dell'agente finisce in errore o ucciso, il turno della chat è interrotto o la sua conversazione chiusa) la sequenza si ferma e i gruppi rimasti non partono; il developer li rilancia con Run all. Un comando che finisce senza errore, anche senza che l'agente abbia detto di essere a riposo, è una fine normale e lascia partire il Run successivo. Riaprire l'editor dimentica la sequenza. Con un solo gruppo la corsa resta un solo Run, sul modello di quel gruppo.

Il terminale del Run di un gruppo della sequenza, in `Run all` come nel Run automatico, che non è il gruppo dei Settings si chiama `All tasks · <modello>`, con il modello del gruppo come scritto, tolti gli spazi attorno; il gruppo dei Settings resta `All tasks`.

Il Run di `Run all` che appartiene a una sequenza per modello o che deve lasciare fuori delle Proposal ha un'istruzione propria, con le identità permanenti delle Proposal nell'ordine di creazione:
- un gruppo personalizzato: "Use the trama-implement skill on every Task in the \"todo\" column that belongs to the Proposals `a`, `b`. Take them from `trama task next --batch --proposal a --proposal b --max <N>`, one group at a time, until it says there is none.";
- il gruppo dei Settings con Proposal da lasciare fuori: "Use the trama-implement skill on every Task in the \"todo\" column except those of the Proposals `a`, `b`. Take them from `trama task next --batch --not-proposal a --not-proposal b --max <N>`, one group at a time, until it says there is none.";
- con una sola Proposal il testo dice "the Proposal `a`".

Senza Proposal da nominare l'istruzione è quella di sempre. Il Run automatico di un gruppo usa la sua istruzione di sempre con le sole identità autorizzate del gruppo.

`trama task next` (anche con `--batch`) e `trama task scope --pre-flight` accettano `--proposal <id>` ripetibile, che considera i Task legati ad almeno una delle Proposal nominate, e `--not-proposal <id>` ripetibile, che lascia fuori i Task legati alle Proposal nominate e tiene quelli senza Proposal. Una Proposal che non esiste è rifiutata con entrambi; `--proposal` insieme a `--not-proposal` è un errore d'uso. Entrambi si intersecano con `--task`, non spostano nulla e sono calcolati in `src/core`.

La skill distribuita `trama-implement` (in `skills/`), quando l'istruzione nomina dei filtri `--proposal` o `--not-proposal`, li passa tali e quali a ogni `trama task next --batch` e al pre-flight `trama task scope --pre-flight`, e non ne usa altri.
