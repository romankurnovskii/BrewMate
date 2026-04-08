import https from 'https';

export function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        // Optimize: collect Buffer chunks in an array instead of repeated string concatenation.
        // This avoids O(n^2) memory complexity and high allocation overhead for large responses
        // like the ~30MB Homebrew JSON APIs.
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on('end', () => {
          try {
            const data = Buffer.concat(chunks).toString('utf-8');
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}
