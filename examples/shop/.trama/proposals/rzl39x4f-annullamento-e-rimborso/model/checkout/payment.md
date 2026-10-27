# Payment

The money side of one order.

## States

### Idle (initial)
- `order.CONFIRMED` → Charging

### Charging
- `stripe.CHARGE_OK` → Paid
- `stripe.CHARGE_FAILED` → Declined

### Paid
- `order.REFUND_REQUESTED` → Refunding

### Refunding
- `stripe.REFUND_DONE` → Refunded

### Declined (final)
### Refunded (final)

## Events

### SUCCEEDED
Emitted when the charge goes through.

### DECLINED
Emitted when the charge is refused.

### REFUNDED
Emitted when the money is back with the customer.
