---
description: "Use when defining, storing or showing orders, carts and payments, and what each one contains."
---
# Data

## order
- An order has a number, the customer, its lines (product, quantity, unit price), a delivery address and a total.
- Totals are stored in cents.

## payment
- Keep the provider's payment ID; never store card numbers.
