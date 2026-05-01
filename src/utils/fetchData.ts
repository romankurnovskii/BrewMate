import https from 'https';
import zlib from 'zlib';

export function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
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

          res.on('error', reject);

          const encoding = res.headers?.['content-encoding'];
          if (encoding === 'br') {
            stream = res.pipe(zlib.createBrotliDecompress());
          } else if (encoding === 'gzip') {
            stream = res.pipe(zlib.createGunzip());
          } else if (encoding === 'deflate') {
            stream = res.pipe(zlib.createInflate());
          }

          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer | string) => {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
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
