---
status: rejected
base:
  work/dirty-point.md: new
  work/feature.md: 051cd041039c620fd9f7263c8828385e22778e3ac1e1a70b5eb9245796734daf
  work/announcement.md: 5e637cb8ad0df516620ecdee33810cfb20e50c1b4619e9573031c22a11f77f1d
  work/task.md: 1b66ca3135057d05447b855a40b61d192a7a6eaa3de37b22fe808f090caadea6
  agent-launching/agent-terminal.md: 05cc109dc4d0d5eb74458d065ea1a55318ca67ec22316865ce00950805162240
  agent-launching/feature.md: 22e5dfaf637db3e874ad060985ad969772f117b9de3f61debef3c5ef4f8e613d
  model-changes/proposal.md: b068a95dee434f0ad6f8159cd7aa27873de0cdff574f5e5742fa5a5a8974c530
  requirements/rules/decisions.md: b66b5784a0f08570cad9970aa30561916658e2993a8de3d1d779eb3d3dc00cf6
  requirements/rules/agent-terminal.md: 47db42f63255aa7d2c819f63750987b149f566473cbc6894b8b65a4d8ace4de2
  requirements/rules/models.md: 248d088aa4131de587a9fe1c96eb2be692db9831bb1acf7e68fefba403149442
  requirements/rules/announcements.md: df5827496effa0dc74d1115b6fbd4341af71ad785e231a21f451a3e50bebd415
  requirements/tech/proposal.md: 7fbf0e6030e371a1e3f46f7c57a258a3b40743bb1de515af853c0ac31f65ee19
  requirements/tech/announcements.md: 5d5af422c78b7684fc083071c216f1c5fcdd009ed6424253bf75d2972bffa3c0
  requirements/tech/work.md: 3e9fab10c27fa0034749b0abc15e6b22751c640ef58bf104b14c64496dc4f9c1
  requirements/data/proposals.md: 50b49da857851a34169b245870b0ff3b89faa62a246bb36d8b5c74de4dc2fcf3
  requirements/data/work.md: c242df05e09f625f04cdfcef1f3edb7bbc70b116121479871b57a6a953e40cf6
  requirements/quality/main.md: 822f1524f61a1c5ab5a8aa947651a09b7b14bcfbbf8b2d2c4c3eb91e7023baf5
  requirements/ui/agents.md: 0210ce308fd31f943f3936e114a5ed63ae4f2dbd6f3e1c14ea3d375125596682
delete: []
request: 2026-10-14T08-26-05
created: 2026-10-14T06:43:03.506Z
---
# Scan only dirty points after approval

Lo scan automatico dopo l'approvazione è lento perché parte a ogni approvazione e legge Machine intere. Lo si fa partire solo sui punti "dirty" (cambiati da un'approvazione e non ancora confrontati da uno scan riuscito), segnati in file temporanei locali, e lo si restringe a quei punti.

Decisioni prese nell'intervista:
- Segno dei punti dirty: file temporanei locali e non versionati in `.trama/dirty/`, un file per Proposal e uno per scan.
- Dirty = voce dell'ambito di scansione; la descrizione cambiata di una Machine entra da sola, senza trascinare la Machine intera.
- Un punto resta dirty finché uno scan riuscito non lo copre; ogni scan riuscito che lo copre lo pulisce (dopo l'approvazione, System, Feature, fine corsa).
- Scansione: un sotto-agente per Machine con letture ristrette ai riferimenti; una sola Machine senza sotto-agenti; solo le General toccate e Task/Drift filtrati per riferimento.
- Una General cambiata si confronta con un sotto-agente per Feature.
- Punti rimasti (scan fallito, interrotto, non partito, approvazione a editor chiuso) vanno alla prossima approvazione e a «Scan now».
- Approvazione durante uno scan in corso: parte uno scan solo sui punti liberi.
- I Task si legano alla Proposal che ha sporcato il punto per ultima.
- Solo le approvazioni di questa copia sporcano; i cambi da git no. Con `trama.autoScan` spento i punti si sporcano comunque.
- Gli scan manuali confrontano tutto come oggi e puliscono i punti che coprono.
- Messaggio breve in barra di stato per 5 secondi: `Proposal "<titolo>": scanning N changed points`; nulla quando non c'è niente da scansionare.
- Lo scan riceve un'identità; `trama scan show <scan>` elenca i suoi punti.
- La pulizia avviene alla chiusura riuscita del controllo Scanning, che dichiara cosa scansiona (`--scan`, `--system`, `--feature`, `--ref`).
- I punti di uno scan finito senza pulirli tornano liberi appena Trama vede finire il lavoro.
- Un punto ripreso da un'altra approvazione mentre è in scansione torna dirty e lo prende il nuovo scan.
- La descrizione della Feature work è allineata: niente più smistamento con System 1.

Assunzioni da verificare:
- Un elemento tolto da un'approvazione successiva chiude il suo punto; al suo posto si sporca il contenitore.
- Uno scan pulisce solo i punti sporcati prima che dichiarasse la copertura; una General la pulisce solo lo scan del System.
- All'avvio dell'editor si liberano solo i punti di scan il cui processo non è più vivo (più finestre sullo stesso progetto).
- Nuovo valore `description changed` per la `reason` dell'ambito; `trama task list --ref` come `trama drift list --ref`.
- L'avviso di Cursor diventa «Scan the changed points not scanned yet?»; la frase dei sotto-agenti aggiunge «unless the scan has only one Machine».
- La presa dei punti è serializzata fra finestre con un file di lock in `.trama/dirty/`.

## Feedback

Superata. Il dirty-tracking (.trama/dirty/, Machine dirty-point) non salta nessuno scan: ogni approvazione ordinaria sporca tutti i punti dello scanScope, quindi lo scan scatterebbe sempre. Nuova direzione: i Task nascono con la Proposal (un file per Task nella cartella della Proposal), l'approvazione li crea in modo deterministico senza scan, un pre-flight scan unico e parallelo per Machine parte all'avvio di ogni Run, e le General dei Task Done entrano nello scan di fine corsa. Vedi la nuova design request.
