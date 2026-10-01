# Cart

What a customer has chosen so far.

## States

### Empty (initial)
- `user.ADD_ITEM` → Has items

### Has items
- `user.ADD_ITEM` → Has items
- `user.CHECKOUT` → Confirmed: emits CONFIRM.

### Confirmed (final)

## Events

### CONFIRM
Emitted when a non-empty cart is confirmed.
