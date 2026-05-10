## 2024-05-18 - Optimized filter loop for 100k items array
**Learning:** In Electron applications rendering large sets of data (~100k items from Homebrew API), executing string transformations like `.toLowerCase()` and instantiating inline closures or IIFEs inside `.filter()` heavily blocks the main thread.
**Action:** When filtering massive datasets, always precompute and attach invariant transformations (`toLowerCase()`, calculated categories) to the object fields at ingestion time. Within the filtering loop, declare invariants (like `searchTerm.toLowerCase()`) outside the loop, avoid creating temporary closures, and use early returns to shortcut evaluations as quickly as possible.
## 2024-05-18 - Optimized fetchData with zlib compression
**Learning:** For Electron apps fetching large JSON payloads (like 100k items from the Homebrew API), not requesting compressed responses and using string concatenation (`+=`) on the `data` event blocks the network/main thread heavily.
**Action:** When fetching large data, request compressed payloads using `Accept-Encoding: gzip, deflate, br` headers. Read response `headers['content-encoding']` and pipe through `zlib` for decompression. In streams, accumulate buffers in an array and use `Buffer.concat(chunks).toString('utf8')` inside the `end` event to prevent O(N^2) memory and time overhead while avoiding chunk boundary multi-byte character issues.
## 2023-10-25 - Escaping HTML strings efficiently
**Learning:** `document.createElement('div')` to escape HTML is incredibly slow because it instantiates an entire DOM element, sets `textContent`, and calls `.innerHTML`. In high-frequency code like a virtual scroll renderer that executes this multiple times per item, this blocks the UI thread.
**Action:** Use a fast regex replacement map (e.g., `text.replace(/[&<>"']/g, match => HTML_ESCAPE_MAP[match])`) which avoids the DOM completely.

## 2023-10-25 - Terminal output appending performance and security
**Learning:** Using `innerHTML += ...` to append chunked terminal output creates severe O(n²) overhead because it forces the browser to re-serialize and parse the entire content of the terminal for every new chunk.
**Action:** Always append directly using `appendChild(document.createTextNode(data))` or `document.createElement(...)` which executes in O(1) time and is completely immune to HTML injection/XSS.
