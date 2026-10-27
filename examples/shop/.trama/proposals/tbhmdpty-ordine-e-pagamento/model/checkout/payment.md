# Payment

The money side of one order.

## States

### Idle (initial)
- `order.CONFIRMED` → Charging

### Charging
- `stripe.CHARGE_OK` → Paid
- `stripe.CHARGE_FAILED` → Declined

### Paid

### Declined (final)

## Events

### SUCCEEDED
Emitted when the charge goes through.

### DECLINED
Emitted when the charge is refused.
