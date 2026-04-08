
## 2024-03-25 - filterApps Bottleneck (100k items)
**Learning:** In a codebase managing a huge local list of items (e.g. ~100k apps in Homebrew's JSON), running inline string conversions (`searchTerm.toLowerCase()`) or complex condition checks on every iteration of a `.filter()` loop blocks the main thread noticeably during keystrokes.
**Action:** Always hoist invariant calculations (like `toLowerCase` on user input or computing active filter states) outside of filter loops. Order loop conditions to short-circuit by speed: property equality checks > Set lookups > string processing > multiple `.includes()` checks.
