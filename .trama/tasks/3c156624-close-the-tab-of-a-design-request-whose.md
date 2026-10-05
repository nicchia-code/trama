---
column: done
technical: false
refs:
  - design-request/Sent/proposal.SUBMITTED
  - design-request/Sent/workspace.REQUEST_DELETED
  - workspace.REQUEST_DELETED
  - design-request/Consumed
  - requirements/rules#design-request
  - requirements/tech#design-request
drift: null
proposal: a1657b14
agent: false
created: 1970-01-01T00:00:00.152Z
---
# Close the tab of a design request whose file is deleted

Quando il file di una richiesta inviata sparisce, perché la consegna della prima Proposal legata l'ha cancellato o perché qualcuno l'ha cancellato da fuori, la richiesta è consumata. L'estensione se ne accorge con l'osservatore dei file che già usa per `.trama/`: se la scheda del file è aperta e non ha modifiche non salvate la chiude; con modifiche non salvate la lascia all'editor. Nella cancellazione da fuori Trama non fa nient'altro, e le Proposal nate dalla richiesta restano come sono. Il pannello non mostra mai le richieste.
