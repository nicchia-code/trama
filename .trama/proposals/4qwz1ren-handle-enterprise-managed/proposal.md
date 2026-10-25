---
status: approved
base:
  requirements/rules/team.md: fa0510e748e46c3013155de481129af9dd3f0827b86732a57eb999bb39eb5e43
  requirements/ui/panel.md: f29120ebe3c8f6447e9df948372b46742f52c2644d20af63480b6809c7bb2067
delete: []
created: 2026-10-25T20:06:27.934Z
label: EMU handles
---
# Handle Enterprise Managed

Gli account di GitHub Enterprise Managed Users hanno handle della forma `<nome>_<shortcode>` (per esempio `32984238_EYGS`): oggi Trama li rifiuta nel campo `GitHub handle` di una persona e non li riconosce come menzioni nel Markdown del pannello, quindi un Manager di un'azienda con Enterprise Managed Users non può mettere nel team le persone vere.

Decisioni:
- Il campo `GitHub handle` accetta il formato attuale (lettere, cifre e trattini singoli, senza trattino iniziale o finale) seguito da un suffisso facoltativo `_` più lettere e cifre; ogni altro `_` resta rifiutato; il limite resta di 39 caratteri in tutto.
- Il messaggio d'errore diventa `Use 1 to 39 letters, digits, single hyphens and an optional _shortcode.`
- Nel Markdown del pannello `@<handle>` con il suffisso `_shortcode` diventa un link al profilo GitHub come gli altri handle (per esempio la riga `**Reviewer:**` nell'anteprima delle issue).
