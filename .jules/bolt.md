## 2024-05-20 - Homebrew API Fetch Optimization
**Learning:** The Homebrew JSON APIs (`formula.json`, `cask.json`) are extremely large (up to 30MB+ uncompressed). Fetching them without compression results in significant network transfer overhead and memory pressure.
**Action:** Always fetch large remote JSON APIs using compression (`Accept-Encoding: gzip, deflate, br` with `zlib` decompression) to minimize memory pressure and network transfer time.
