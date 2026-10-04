---
column: done
technical: false
refs:
  - drift/Open/developer.FIX_DRIFT_CODE
  - requirements/tech#drift
drift: null
proposal: "0024"
agent: false
---
# Ask for the fix option in the command line, with a menu in an interactive terminal

trama drift resolve --fix-code takes --option <n> and an optional --note <text>. Given --fix-code without --option for a Drift that has options, in an interactive terminal it shows the options as a numbered menu with the recommended one as the default, taken by pressing Enter, then asks for an optional note, empty for none. In a non-interactive run it is refused, saying that an option must be chosen. --option or --note with --accept-proposal or --dismiss are refused. The command stays developer-only.
