# Order

An order placed by a customer, from composition to delivery.

## States

### Draft (initial)
The customer is still choosing what to buy.
- `cart.CONFIRM` → Awaiting payment: only if the cart is not empty.

### Awaiting payment
- `payment.SUCCEEDED` → Paid
- `payment.DECLINED` → Cancelled: tells the customer by email.

### Paid

#### Preparing (initial)
- `warehouse.PACKAGE_READY` → Ready to ship

#### Ready to ship
- `courier.PICKED_UP` → Shipped

### Shipped (final)

### Cancelled (final)

## Events

### CONFIRMED
Emitted when the order leaves Draft.
