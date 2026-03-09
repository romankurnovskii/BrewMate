## 2024-03-09 - [Homebrew API Network Compression]
**Learning:** The Homebrew JSON APIs (`formula.json`, `cask.json`) are extremely large (up to 30MB+ uncompressed). Fetching them directly without compression causes significant memory pressure and long load times.
**Action:** Always fetch Homebrew API data (or any large static JSON) using compression headers (e.g., `Accept-Encoding: gzip, deflate, br`) and decompress via Node's `zlib` stream to minimize network payload and speed up loading.
