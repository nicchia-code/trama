---
refs:
  - team
  - editor-panel
  - person
  - panel
  - panel/Team
  - panel/Closed/developer.SHOW_TEAM
  - panel/Open/developer.SHOW_TEAM
  - menu-laterale
  - developer.SHOW_TEAM
  - developer.EDIT_PERSON
  - developer.ADD_TO_TEAM
  - developer.REMOVE_FROM_TEAM
  - developer.DELETE_PERSON
  - requirements/ui#panel
  - requirements/tech#panel
  - requirements/ui#panel/Team
  - requirements/ui#menu-laterale
  - requirements/tech#menu-laterale
  - requirements/ui#person
  - requirements/data#person
  - requirements/rules#person
  - requirements/quality#person
  - requirements/tech#team
---
# Vista Team e persone

Con Team disponibile (Manager mode registrata e origin su GitHub), il pannello ha la vista Team con la scheda People, e il Manager gestisce le persone del team, che restano solo nel suo editor. Quando il Task è finito:

- **Menu e pannello.** Il menu laterale ha la voce `Team` (icona lucide `Users`) subito dopo `History` e prima della linea, solo con Team disponibile (`menuState.manager`), senza lasciare spazio quando manca. Il comando `trama.showTeam` (`Trama: Show Team`) sta in `contributes.commands` accanto agli altri `trama.show*`; con Team non disponibile fa l'apertura ordinaria, o lascia la vista com'è a pannello aperto. La vista `team` entra nel modulo condiviso delle etichette (`Team`), nel titolo della scheda del pannello e in `navigate`; quando Team smette di essere disponibile mentre il pannello la mostra (anche per `manager-mode.TURNED_OFF`), l'host manda `navigate` con `board`.
- **Vista.** In `extension/src/webview/team/`, montata come la History: titolo `Team`, barra delle schede `Tabs` di shadcn/ui nello stile segmentato con per ora la sola scheda `People`, linea di separazione. La scheda scelta resta finché il pannello è aperto. Testi in inglese, non seguono `trama.language`.
- **People.** Intestazione `<n> people in this project's team` (singolare `1 person…`), pulsanti `Add from other projects` (`outline`, `Users`, disabilitato con tooltip `Everyone you know is already in this team` quando non c'è nessuno fuori dal team) e `Add person` (primario, `UserPlus`). Tabella in una card con bordo: `Person` (avatar rotondo 32 px con le iniziali, mai l'avatar di GitHub; nome; `@handle` monospace), `Level` (`Badge` outline `Junior`/`Mid`/`Senior`), `Skills` (badge secondari), `Capacity` (`<giorni> d / sprint`), `Next absence` (`Calendar` e `Off 10–12 Nov`, `Off 2 Nov`, a cavallo di mesi `Off 30 Oct – 2 Nov`, anno solo se non è quello corrente; `None planned`), `Actions` (`Pencil` con tooltip `Edit <name>`, `UserMinus` con tooltip `Remove <name> from team`). Ordine per nome. Sotto i 640 px la tabella diventa un elenco a tre righe. Team vuoto: icona `Users`, `No one in this team yet`, il testo di `ui#person` e i pulsanti `Add the first person` e `Add from other projects`.
- **Dialogo della persona.** `Dialog` di circa 480 px, `Add person` o `Edit person`, descrizione `Trama uses this to propose assignees, reviewers and sprint load.`; campi Name, GitHub handle (prefisso `@` fisso, monospace), Level (`Select`, default Mid) e Capacity per sprint (numero, passo 0.5, default 5, `days`), Skills (tag input con chip rimovibili, Enter o virgola aggiungono, Backspace toglie l'ultimo, placeholder `Add a skill…`), Absences (righe con due date native `From`/`To`, `Trash2` `Remove absence`, `Add absence`). Piede: `Delete person` (solo in modifica, distruttivo), `Cancel`, `Save`. Validazione al salvataggio con i messaggi esatti di `rules#person` (nome 1–80; handle 1–39 lettere, cifre o trattini singoli, `@` iniziale tolta, `A GitHub handle can't contain spaces.`, handle già presente `@<handle> is already in your list: add them from other projects.`; capacità 0.5–5 a passi di 0.5; al massimo 20 skill da 1–30 caratteri, doppioni ignorati senza maiuscole; al massimo 50 assenze, entrambe le date, fine non prima dell'inizio); campo invalido con bordo distruttivo, `aria-invalid`, `CircleAlert` e messaggio collegato con `aria-describedby`, focus sul primo campo invalido. Le assenze finite da più di 90 giorni cadono al salvataggio.
- **Azioni.** `Remove from team` toglie subito il repository dalla persona, senza conferma, con l'avviso `<name> left this team.` e `Undo` per 10 secondi o fino al cambio successivo. `Delete person` apre il dialogo modale dell'editor `Delete <name>?` con il dettaglio `They leave every project's team. Issues already assigned to them on GitHub stay assigned.` e `Delete`. `Add from other projects` apre un `Popover` con `Command` di cmdk, ricerca `Search people…`, e aggiunge subito la persona scelta. Una modifica vale in ogni progetto della persona. Una scrittura fallita mostra `Trama could not save the team: <reason>.` con `Close`.
- **Dati.** Le persone stanno solo in `globalState`, chiave `trama.team`, valore `{ version: 1, people }` con `id` (8 caratteri minuscoli e cifre), `name`, `handle` senza `@`, `level`, `skills`, `capacity`, `absences` `{ from, to }` in `YYYY-MM-DD` ordinate, `repositories` `<owner>/<repo>` minuscoli; nessun `setKeysForSync`. Una persona invalida resta com'è nel valore, non si mostra e la scheda dice `<n> saved people could not be read and are not shown.`; un `version` diverso da 1 non si legge né si sovrascrive. Validazione pura e schemi zod in `src/core/people.ts` con test; l'host (`extension/src/host/team/people.ts`, unico modulo che tocca la chiave, con store iniettato `{ get, update }`) rivalida ogni persona. Messaggi `savePerson`, `addToTeam`, `removeFromTeam`, `undoRemoveFromTeam`, `deletePerson` validati da `parseToHost`; `team { members, others, unreadable, error }` al `ready`, quando Team diventa visibile e dopo ogni scrittura.
- **Privacy e accessibilità.** Nulla delle persone finisce nel progetto, in `.trama/`, nei log, nel canale di output, nelle notifiche, nella History, in Proposal, Task o Drift; il livello si vede solo nella scheda People e nel dialogo. Contrasto AA in chiaro e scuro, tutto da tastiera con anello del fuoco, focus intrappolato nel dialogo e restituito al pulsante che l'ha aperto.
- Documentazione: `README.md`, `extension/README.md`, `docs/`, `CHANGELOG.md` descrivono la vista Team e le persone che restano nell'editor; `docs/uat.md` i passi manuali (aggiungere, modificare, togliere e cancellare una persona, la stessa persona in due progetti).

Le immagini legate a questo Task mostrano menu laterale, scheda People, dialogo della persona e stati vuoti: valgono come riferimento visivo, i testi esatti sono quelli qui sopra.
