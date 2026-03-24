
## 2024-11-20 - [Stream Buffer Concatenation Optimization]
**Learning:** `fetchJSON` loads very large payloads (30MB+ Homebrew APIs). Node.js stream events dispatch chunks iteratively. Appending strings with `data += chunk` results in an O(n^2) complexity and massive intermediate memory allocations, choking the V8 engine and blocking CPU execution.
**Action:** Use an array to collect stream chunks: `const chunks: Buffer[] = []; chunks.push(chunk);`. In the `end` event, compute the final string with a single operation: `Buffer.concat(chunks).toString('utf-8')`. This is significantly faster for APIs of Homebrew scale.
