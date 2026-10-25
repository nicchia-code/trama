---
created: 2026-10-25T09:50:24.211Z
updated: 2026-10-25T09:50:24.211Z
summary: Solo mode tiene i file di Trama fuori da git solo nella propria copia di lavoro, da CLI, Settings e wizard. Con esso acceso, Merge porta un branch nel corrente, fa scansionare il System e segna i Drift da merge.
tasks:
  - 6tyqi07l
  - bme0ekk4
  - 2coek7kv
  - 1is9ng78
  - rbz0kw4y
  - zg5kh2zf
---
# Solo mode e Merge

Solo mode permette di usare Trama da soli in un repository dove gli altri non lo usano. I file di Trama restano solo nella copia di lavoro e non entrano mai nei commit. La scelta vale per la copia di lavoro, mai per l'utente, e non è una chiave delle impostazioni dell'editor.

Il core e la CLI leggono e scrivono la scelta in `.trama/solo/mode.json`, con esclusioni a cartelle intere o ai soli file di Trama. Le esclusioni sono scritte in `.git/info/exclude` fra i marcatori `# trama solo mode` e `# end trama solo mode`. `trama project new` e `trama project edit` accettano `solo` (`off`, `folders`, `files`) e il risultato riporta `solo` e `tracked`. La scheda Settings mostra la riga Solo Mode nel gruppo Project, subito dopo `trama.skillsDir`, con interruttore e scelta di cosa escludere. Il wizard di setup la offre nel passo Project, solo nel primo setup e nel Modello vuoto, con la nota «Only this workspace.».

Con Solo mode acceso il menu laterale mostra in fondo il pulsante primario Merge, prima di Scan System e Settings. Merge porta nel branch corrente un branch scelto dal developer, tra fetch, scelta del branch, conflitti e abort, e poi fa scansionare all'agente tutto il System. Parte solo se non ci sono merge, rebase, cherry-pick o revert in corso, se HEAD è su un branch e se non ci sono modifiche a file tracciati.

Lo scan dopo il Merge riceve l'intervallo `<base>...<incoming>` portato dal merge. Ogni Drift il cui Where in the code sta in un file di quell'intervallo viene segnato come Drift da merge, con `merge: true` nel front matter. Gli altri hanno cambiato quel codice senza il Model, quindi il codice potrebbe essere giusto. `trama drift new`, i Drift di `trama comparison move … delivered` e Unify Drifts accettano e scrivono il segno.
