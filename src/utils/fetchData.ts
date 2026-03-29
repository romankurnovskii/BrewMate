import https from 'https';

export function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        res.on('end', () => {
          try {
            // Buffer.concat(chunks) is O(n) instead of O(n^2) for string concatenation
            // This prevents excessive memory allocation when downloading Homebrew's large JSONs (30MB+)
            const data = Buffer.concat(chunks).toString('utf8');
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}
