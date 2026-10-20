---
created: 2026-10-20T12:33:23.885Z
updated: 2026-10-20T17:56:47.481Z
summary: PowerShell 5.1 argument quoting is changed but not yet verified on Windows.
tasks:
  - vhis6udf
---
# PowerShell 5.1 argument quoting

On Windows PowerShell 5.1, every argument of an agent command is now wrapped in double quotes, inner double quotes are doubled, and backslashes before a quote or at the end are doubled. PowerShell 7 and Git Bash keep their previous quoting. Open: the Windows PowerShell 5.1 run has not been done; the Windows suite on windows-latest is the real check and must pass before this is accepted.
