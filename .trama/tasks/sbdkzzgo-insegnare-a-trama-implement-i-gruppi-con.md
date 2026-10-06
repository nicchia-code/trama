---
column: done
technical: false
refs:
  - task
  - requirements/rules#task
  - requirements/tech#task
  - requirements/tech#announcement
  - requirements/quality#task
  - requirements/tech#General
drift: null
proposal: rhfwtu3m
agent: false
created: 2026-10-06T10:45:28.722Z
---
# Insegnare a trama-implement i gruppi con i sotto-agenti e lo scan del System intero a fine corsa

La skill `trama-implement`, chiesta per più Task, li prende da `trama task next --batch` (con `--proposal` per un design). Quando l'agente ha dei sotto-agenti dà ogni Task del gruppo a un sotto-agente, al massimo quattro, con l'ID e l'istruzione di spostarlo, leggerlo con `trama task show`, realizzarlo ed eseguire solo i suoi test; aspetta tutti, anche quelli fermati da un Drift, poi chiede il gruppo seguente. Senza sotto-agenti, o per un gruppo di uno, li realizza lei uno dopo l'altro. Un sotto-agente non lancia `trama task next`, non sceglie altri Task, non esegue suite intera, lint o build, non scansiona, annuncia le schede che archivia e torna con il Task fatto o il Drift. Test, lint e build una volta, dopo l'ultimo gruppo. Dopo la verifica riuscita, se la corsa ha portato almeno un Task in Done e nessun Task del suo ambito è bloccato, segue i passi di `trama-scan` sul System intero, annunciando ogni scheda e legando i Task al design della corsa o del Task singolo se c'è; non li realizza; un'istruzione di worktree che lo vieta vince. Il resoconto aggiunge ciò che quello scan ha archiviato. La skill non nomina lo strumento di sotto-agenti di un agente preciso.
