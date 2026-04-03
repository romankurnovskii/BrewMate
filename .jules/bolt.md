## 2024-04-03 - [Optimize array filtering for ~100k App objects]
**Learning:** In applications like Pantry with ~100k items loaded into memory, creating inline closures/IIFEs inside `.filter()` and doing invariant transformations like `.toLowerCase()` on every iteration blocks the UI thread during keystrokes.
**Action:** Always move invariant transformations outside the loop, order early returns by condition speed (direct property checks > set lookups > string includes), and memoize expensive computed properties directly onto the item objects to drastically reduce the per-item filtering cost.
