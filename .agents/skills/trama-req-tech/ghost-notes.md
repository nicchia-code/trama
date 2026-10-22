# Requirements: Tecnologia e vincoli, Tecnologia delle note dei ghost

Usa quando lavori al codice delle note dei ghost: scrittura nel nucleo, quadro della Board, modale dei dettagli e skill.

## agent.DECLARE_ANNOUNCEMENT_NOTE

- La scrittura sta in `src/core/announcements.ts`, accanto a `changeCheckPhase`: una funzione che riceve il progetto, l'identità facoltativa, l'origine (`originFromEnv`), il testo e l'istante, sceglie gli annunci, normalizza e tronca il testo, aggiunge la nota e riscrive solo `notes` del front matter. Le regole di scelta degli annunci senza identità riusano quelle con cui gli annunci appartengono a un terminale o a una conversazione, non una copia. La lettura degli annunci (`listAnnouncements`) restituisce `notes` già validate.
- Il comando `announcement edit` si dichiara nel registro della riga di comando (`src/cli/registry.ts`) con il suo schema zod, come gli altri `edit`.
- Il quadro della Board (`src/core/snapshot.ts`) porta `notes` e `announced` per ogni annuncio; il watcher dell'estensione già segue `announcements/`, quindi una nota arriva alla Board con il quadro successivo, senza messaggi nuovi fra host e webview.
- Webview: il ghost (`extension/src/webview/board/`) diventa un `button` con la riga della nota; il modale è un componente a parte, `GhostDetails`, sul `Dialog` di shadcn/ui già copiato in `extension/src/webview/ui/`, come il modale del corpo di una Proposal, con l'identità dell'annuncio aperto tenuta nello stato della Board e ricavata a ogni quadro. Le spiegazioni per tipo e fase e il calcolo della durata sono funzioni pure in `board/logic.ts`, provate con `bun:test`. La durata si aggiorna con un intervallo di 30 s, solo mentre il modale è aperto.
- Skill: `trama-design`, `trama-setup`, `trama-scan`, `trama-implement`, `trama-import`, `trama-resolve-drifts` hanno una sezione breve «Notes on the ghost» che dice quando dichiarare una nota e come (`rules#agent.DECLARE_ANNOUNCEMENT_NOTE`); `trama-compare` dice di scrivere sul proprio confronto con la sua identità. Il testo è corto, perché lo leggono tutti i sotto-agenti.
- `README.md`, `extension/README.md`, `docs/cli.md` e `CHANGELOG.md` descrivono le note e i dettagli dei ghost.
