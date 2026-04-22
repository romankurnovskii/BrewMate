## 2024-05-24 - Memoizing App Filter Fields
**Learning:** Repeated string operations in large filter loops block the UI thread.
**Action:** Cache computed properties directly on the object.
