---
refs:
  - menu-laterale
  - requirements/ui#menu-laterale
  - requirements/tech#menu-laterale
---
# Menu laterale stretto e Scan System

Il menu laterale di Trama (la vista `trama.home` nella barra delle attività) cambia in due modi.

**Modalità solo icone.** Il developer può stringere la vista quanto l'editor permette (VS Code non scende sotto 170 px per la barra primaria; la vista può stare anche nella barra secondaria o nel pannello). Quando la vista è larga meno di 200 px, ovunque stia, ogni voce e ogni pulsante (`Open Folder`, `Get Started`, `Board`, `Diagram`, `Requirements`, `Specs`, `History`, `Scan System`, `Settings`) mostra soltanto la sua icona a 16 px, centrata nel pulsante, che resta largo quanto la vista. Non si vedono il testo, il `Badge` di `Board` né il numero `· N` di `Scan System`, e sulle icone non compare nessun numero né puntino. Da 200 px in su il menu è come prima. Il passaggio avviene mentre il developer ridimensiona, senza ricaricare, e lascia il focus dov'era.
- In modalità solo icone ogni pulsante ha sempre un tooltip con il suo nome: le voci tengono `Open <nome della voce> in the Trama panel`, e `Board` con N > 0 aggiunge ` · N awaiting a decision`; `Scan System` ha `Scan System`, seguito da ` · ` e dal suo tooltip di `ui#panel` (numero di Task finiti dall'ultimo scan, o Advisor Scanner attivo) quando ce l'ha; `Open Folder` ha `Open a folder to use Trama.`. I nomi accessibili restano quelli della vista larga.
- Senza cartelle aperte, in modalità solo icone, la frase `Open a folder to use Trama.` non si mostra: resta solo nel tooltip di `Open Folder`.
- Tecnica: solo CSS nel webview del menu (`extension/src/webview/menu/app.tsx`): la radice è un container di Tailwind 4 (`@container`) e le varianti `@max-[200px]:` nascondono testi, `Badge` e numeri, centrano le icone e tolgono la frase. Nessun `ResizeObserver`, nessun messaggio con l'host, nessuna impostazione, nessuna chiave di contesto. Il tooltip di `Scan System` deve esistere sempre, anche senza numero.

**Scan System in fondo e con conferma.** Nello stato Project il menu ha, dall'alto, `Board`, `Diagram`, `Requirements`, `Specs`, `History`; in fondo alla vista, dopo la linea, `Scan System` e poi `Settings`. `Scan System` non è più il pulsante primario blu: ha la stessa variante trasparente (`ghost`) delle voci, largo quanto la vista, icona e testo allineati a sinistra. Numero `· N`, tooltip, nome accessibile e disattivazione con l'Advisor Scanner restano quelli di `ui#panel`. Senza cartella e fuori da un progetto il blocco in fondo resta con la sola `Settings`.
- Premere `Scan System` non lancia più subito lo scan: il webview manda `scan` e l'host apre prima un dialogo modale dell'editor (`vscode.window.showWarningMessage` con `modal: true`): «Scan the whole System?», dettaglio «The agent compares every Machine with the code: this can take a long time.», pulsante `Scan`. Solo con `Scan` l'host lancia lo scan come oggi (stesse condizioni, Advisor Scanner compreso, stesso ricordo dello scan), senza aprire il pannello e senza spostare il focus. `Cancel`, Esc o la chiusura del dialogo non fanno nulla: nessuno scan, il numero resta. Lo stesso dialogo lo usano anche il pulsante `Scan` del Diagramma e il comando `Trama: Scan System` (un altro Task): se esiste già una funzione condivisa dell'host per questo dialogo, usarla; altrimenti crearla in modo che gli altri la possano usare. Testi in inglese, non seguono `trama.language`.

Aggiornare i commenti che parlano del "primary button" o di voci "above Scan System" e i test del menu (`test/menu-webview.test.tsx`), dove happy-dom non valuta le container query: si possono verificare le classi e la presenza dei tooltip.
