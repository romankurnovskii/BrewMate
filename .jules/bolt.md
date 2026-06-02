## 2024-05-18 - Optimized filter loop for 100k items array
**Learning:** In Electron applications rendering large sets of data (~100k items from Homebrew API), executing string transformations like `.toLowerCase()` and instantiating inline closures or IIFEs inside `.filter()` heavily blocks the main thread.
**Action:** When filtering massive datasets, always precompute and attach invariant transformations (`toLowerCase()`, calculated categories) to the object fields at ingestion time. Within the filtering loop, declare invariants (like `searchTerm.toLowerCase()`) outside the loop, avoid creating temporary closures, and use early returns to shortcut evaluations as quickly as possible.
## 2024-05-18 - Optimized fetchData with zlib compression
**Learning:** For Electron apps fetching large JSON payloads (like 100k items from the Homebrew API), not requesting compressed responses and using string concatenation (`+=`) on the `data` event blocks the network/main thread heavily.
**Action:** When fetching large data, request compressed payloads using `Accept-Encoding: gzip, deflate, br` headers. Read response `headers['content-encoding']` and pipe through `zlib` for decompression. In streams, accumulate buffers in an array and use `Buffer.concat(chunks).toString('utf8')` inside the `end` event to prevent O(N^2) memory and time overhead while avoiding chunk boundary multi-byte character issues.

## 2024-05-24 - DOM and String Optimization
**Learning:** Using `document.createElement('div')` for HTML escaping and `innerHTML +=` for appending content causes significant performance degradation due to memory reallocation and O(N^2) DOM serialization overhead during high-frequency updates (like terminal output or virtual scrolling).
**Action:** Always use a hoisted Regex replacement map for `escapeHtml` and `insertAdjacentHTML('beforeend', ...)` instead of `innerHTML +=`.
## 2024-05-24 - Async Cache I/O
**Learning:** For Electron apps handling large JSON payloads (like 100k items from the Homebrew API), using synchronous file system operations (`fs.readFileSync` and `fs.writeFileSync`) blocks the main thread.
**Action:** When performing file I/O for large data, always use asynchronous file system methods (`fs.promises`) to avoid blocking the event loop and maintain UI responsiveness.
## 2026-06-02 - Optimized nested arrays scan with O(1) map lookups
**Learning:** In Electron applications rendering large sets of data, performing an `Array.find()` search inside of a loop (like iterating through `installedApps` and searching inside the massive 100k `allApps` array) generates an O(N * M) time complexity that heavily blocks the UI thread.
**Action:** When filtering or counting a massive dataset by referencing another list of keys (e.g. counting app categories by name), initialize a `Map` structure using the massive dataset's unique identifiers as keys. Maintain it during IPC ingestion events (`all-apps` and `all-apps-updated`), and use `allAppsMap.get(appName)` to perform O(1) lookups inside the loop, collapsing performance cost from O(N * M) to O(M).
