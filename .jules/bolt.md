
## 2025-03-13 - Homebrew API fetching compression
**Learning:** Homebrew JSON APIs (`formula.json`, `cask.json`) are extremely large (~28MB uncompressed). `fetchJSON` was previously downloading these uncompressed.
**Action:** Always fetch them using compression (e.g., `Accept-Encoding: gzip, deflate, br` with `zlib` decompression) to minimize memory pressure and network transfer time.
