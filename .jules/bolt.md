
## 2024-05-24 - [Homebrew API Compression]
**Learning:** The Homebrew JSON APIs (`formula.json`, `cask.json`) are extremely large (up to 30MB+ uncompressed), and fetching them synchronously or uncompressed blocks the event loop and uses too much memory.
**Action:** Always fetch Homebrew JSON APIs with `Accept-Encoding: gzip, deflate, br` headers and decompress them using the `zlib` module to minimize memory pressure and network transfer time.
