---
created: 2026-10-25T18:29:08.085Z
updated: 2026-10-25T18:29:08.085Z
summary: Il renderer Markdown condiviso del pannello disegna i blocchi mermaid come diagrammi e riconosce barrato, task list, link nudi e riferimenti GitHub (#123, @handle) in ogni vista che rende testo.
tasks:
  - 3mvo2ub9
---
# Diagrammi mermaid e Markdown GitHub

Un blocco di codice `mermaid` si vede come diagramma nel tema del pannello. Se è illeggibile o il disegno fallisce, resta il blocco di codice. Il renderer riconosce anche il barrato, le task list con casella di sola lettura e gli indirizzi http/https nudi. `#123` e `@handle` diventano link solo quando l'host manda il repository GitHub del progetto, letto dal remote `origin`. Le immagini restano non supportate e l'HTML resta testo. mermaid 12 è una dipendenza nuova, in un bundle proprio spedito nel `.vsix`. Dal diagramma entra nella pagina solo l'SVG ripulito.
