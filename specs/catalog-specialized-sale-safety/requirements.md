# Requirements — Specialized catalog sale safety

- The system shall reject a `LIVESTOCK_SEED` product when `attrs.livestockStatus` or
  `attrs.status` is `QUARANTINED`, `SICK`, `DEAD`, or `REJECTED`.
- The system shall preserve sale eligibility for active livestock in other states.
- The system shall apply the same rule to order creation, order completion, and quick sale.
- The system shall not introduce a persistent livestock state machine in this slice.
