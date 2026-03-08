import https from 'https';
import zlib from 'zlib';

export function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // ⚡ Bolt: Fetch Homebrew JSON APIs with compression to minimize memory pressure and network transfer time.
    // Impact: Reduces transfer size for large files (e.g. 30MB+ uncompressed formula.json), making the fetch significantly faster.
    https
      .get(
        url,
        {
          headers: {
            'Accept-Encoding': 'gzip, deflate, br',
          },
        },
        (res) => {
          let stream: NodeJS.ReadableStream = res;
          const encoding = res.headers ? res.headers['content-encoding'] : undefined;

          // ⚡ Bolt: Decompress stream on the fly based on the response's content-encoding header.
          if (encoding === 'gzip') {
            stream = res.pipe(zlib.createGunzip());
          } else if (encoding === 'deflate') {
            stream = res.pipe(zlib.createInflate());
          } else if (encoding === 'br') {
            stream = res.pipe(zlib.createBrotliDecompress());
          }

          const chunks: Buffer[] = [];
          stream.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          stream.on('end', () => {
            try {
              const data = Buffer.concat(chunks).toString('utf8');
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
          stream.on('error', reject);
        }
      )
      .on('error', reject);
  });
}
