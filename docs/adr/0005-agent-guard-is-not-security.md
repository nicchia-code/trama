---
status: superseded
---
# Agent decisions follow the developer's explicit request

The agent may run `proposal approve`, `proposal reject`, `proposal discard`, `drift resolve`, `task take-back` and `ids rewrite` only when the developer explicitly asks for that decision in the conversation. Otherwise it stops and asks the developer to decide. Trama applies its normal checks regardless of who runs the command; `TRAMA_AGENT` and `CURSOR_AGENT` do not block decisions. The variables still identify agents for Task ownership and announcements. The former guard was never a security boundary: an agent could unset them or edit files directly.
