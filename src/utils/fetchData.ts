import https from 'https';

export function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        // Accumulate buffer chunks to avoid O(n^2) string concatenation memory overhead and ensure split multi-byte characters are safely decoded at the end.
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
        res.on('end', () => {
          try {
            const data = Buffer.concat(chunks).toString();
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}
