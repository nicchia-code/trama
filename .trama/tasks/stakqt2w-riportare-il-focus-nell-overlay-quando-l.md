---
column: done
technical: false
refs:
  - question-round/Out of sight/developer.RESTORE_QUESTIONS
  - question-round/Out of sight/developer.OPEN_PANEL
  - requirements/ui#question-round
drift: null
proposal: null
agent: false
created: 2026-10-06T15:32:13.702Z
finished: 2026-10-06T15:36:47.331Z
---
# Riportare il focus nell'overlay quando le domande ridotte a barra vengono riaperte

Quando il developer riapre le domande ridotte a barra (cliccando la barra o Open questions, oppure con il pannello o con Reopen mentre il pannello è ancora aperto), l'overlay ricompare sulla domanda o sul riepilogo che mostrava, ma il focus non torna dentro l'overlay: resta sul pulsante della barra ormai nascosta e finisce fuori dal dialogo. Così i tasti da 1 a 9 non scelgono le opzioni e la navigazione da tastiera riparte da fuori finché il developer non clicca nell'overlay.

Fatto quando: ogni volta che l'overlay torna visibile dalla barra, il focus è dentro il dialogo, sul testo della domanda o sul titolo del riepilogo che mostra (o su Go back se fosse aperta la conferma di Skip all), come vuole il Requisito che l'overlay tenga il focus al suo interno finché è aperto. Lo stato del round non cambia.
