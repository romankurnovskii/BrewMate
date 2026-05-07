## 2025-05-23 - Asynchronous I/O to prevent Event Loop Blocking
**Learning:** In Electron applications, using synchronous file system operations (`fs.readFileSync`, `fs.writeFileSync`) on large JSON payload files (e.g., parsing ~100k Homebrew apps) blocks the main process event loop, causing severe UI freezes and unresponsiveness.
**Action:** Always prefer `fs.promises` (e.g., `readFile`, `writeFile`) for I/O operations and handle them asynchronously to maintain a responsive Electron UI.
