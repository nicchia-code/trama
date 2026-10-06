---
column: done
technical: false
refs:
  - question-round/Confirming skip all
  - question-round/In view/developer.MINIMIZE_QUESTIONS
  - requirements/ui#question-round
drift: null
proposal: null
agent: false
created: 2026-10-06T14:25:37.095Z
---
# Ridurre a barra l'overlay anche mentre è aperta la conferma di Skip all

Nel Modello la Transizione `developer.MINIMIZE_QUESTIONS` → Out of sight vale per tutto In view, quindi anche in Confirming skip all. Oggi, mentre il dialogo di conferma di Skip all è aperto, l'intestazione dell'overlay non risponde e il developer non può ridurre le domande a barra: deve prima scegliere Go back.

Quando è fatto:
- con la conferma di Skip all aperta, il pulsante Minimize dell'intestazione funziona e riduce l'overlay alla barra delle domande in attesa;
- nulla viene saltato: la conferma si chiude senza effetto e, riaprendo le domande, l'overlay torna sulla domanda o sul riepilogo da cui la conferma era stata chiesta;
- la conferma resta un dialogo dentro l'overlay con il focus che parte su Go back, come chiede il Requisito ui.
