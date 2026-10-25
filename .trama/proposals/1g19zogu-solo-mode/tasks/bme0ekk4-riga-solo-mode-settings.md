---
refs:
  - panel
  - requirements/ui#solo-switch
  - requirements/ui#panel/Get Started
  - requirements/quality#panel/Settings
---
# Riga Solo Mode in Settings

La scheda Settings mostra Solo mode, la modalità che tiene i file di Trama fuori da git solo in questa copia di lavoro. Il core e la CLI di Solo mode (`trama project edit` con `solo`, il risultato con `solo` e `tracked`) arrivano con un altro Task della stessa Proposal.

A Task finito:

- In un progetto, nel gruppo `Project`, subito dopo `trama.skillsDir`, la riga `Solo Mode` con lo stesso componente delle impostazioni: titolo, spiegazione «Use Trama alone in a repository where the others do not: Trama's files stay in this working copy, kept out of git by `.git/info/exclude`. They are versioned nowhere else.», un `Checkbox` e sotto, sempre, la nota `Only this workspace.`. Senza progetto la riga non c'è.
- Con Solo mode acceso, il campo `Exclude` (`Select`) con `Whole folders` (default) e `Only Trama's files`, con la descrizione del valore scelto come per un enum, e, quando dei file di Trama sono ancora tracciati da git, l'avviso `These Trama files are tracked by git, so their changes are still committed:` con un percorso per riga, al massimo 10, poi `and <N> more`.
- Fuori da un repository git il `Checkbox` è spento e disattivato, con `Solo mode needs a git repository.`.
- Durante una scrittura i controlli sono disattivati; una scrittura fallita mostra `Trama: could not save Solo Mode: <reason>.` e i controlli tornano al valore reale del progetto.
- Messaggi: webview → host `setSoloMode { solo: "off" | "folders" | "files" }`, validato da `parseToHost`; host → webview `soloMode { available, solo, tracked }` al `ready`, quando la vista Settings diventa visibile e dopo ogni scrittura. Solo mode non è nel manifest, né in `SETTING_GROUPS`, né in `EXPLICIT_TITLES`, e `setSetting` non lo accetta. La riga ha il suo componente in `extension/src/webview/settings/`, come `OmpStatusBox` e `Providers`.
- Accessibilità: nomi accessibili `Solo Mode` ed `Exclude`, spiegazione, nota e messaggi collegati con `aria-describedby`, tutto da tastiera. Testi in inglese, senza seguire `trama.language`.
- `quality#panel/Settings`: la riga scrive solo `.trama/solo/` e l'`info/exclude` locale di git, mai un file tracciato.
- Get Started: con Solo mode scelto nel passo `Project` del wizard, l'avviso dei passi `Path` e `Summary` dice invece «Trama will create a `.trama` folder that describes this project, and write the agent skills and the Trama sub-agent definition into this project. Solo mode keeps them out of git in this working copy only: they are never committed and are versioned nowhere else.»
