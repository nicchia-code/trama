---
column: done
technical: false
refs:
  - project/Not a Trama project/developer.INITIALIZE_PROJECT
  - project/Trama project/developer.UPDATE_SKILLS
  - requirements/rules#project
drift: null
proposal: o3h29jss
agent: false
created: 2026-10-10T12:54:35.934Z
finished: 2026-10-10T13:19:04.223Z
---
# Non installare più lo smistamento e rimuoverne la definizione con Update skills

L’inizializzazione installa soltanto la definizione omp di confronto trama-analysis insieme alle skill previste: non installa né riscrive trama-triage e una sua vecchia copia non conta più fra i conflitti che impediscono l’inizializzazione. Una copia personalizzata di trama-analysis continua invece a richiedere il rifiuto senza creazioni e la conferma esplicita del developer prima della sostituzione. Update skills riscrive trama-analysis senza chiedere e cancella dal progetto la definizione obsoleta .omp/agents/trama-triage.md, se presente, qualunque sia il suo contenuto; il resoconto comunica la rimozione anche nell’editor. Non viene rimossa trama-analysis e non si scambia la definizione obsoleta con una skill: resta la rimozione già prevista della cartella trama-fix da tutti i percorsi delle skill richiesti. Le altre skill e la rigenerazione dei Requisiti continuano come da Modello. La predisposizione e l’aggiornamento degli hook Copilot restano coperti dalla Task 0z1xt7vh e non fanno parte di questo lavoro.
