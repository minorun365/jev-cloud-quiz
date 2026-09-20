import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { choice, TypeSafeClient } from '@typesafe-ai/sdk';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT || process.env.AWS_LWA_PORT || 8080);

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

const CRITERIA = {
  aws: 'Amazon Web Services',
  azure: 'Microsoft Azure',
  google_cloud: 'Google Cloud',
};
const INSTRUCTIONS = 'Which cloud provider offers this service?';

let clientPromise = null;

async function apiKey() {
  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY;
  const name = process.env.TYPESAFE_API_KEY_PARAMETER;
  if (!name) throw new Error('TYPESAFE_API_KEY も TYPESAFE_API_KEY_PARAMETER も設定されていません');
  const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm');
  const ssm = new SSMClient({});
  const result = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
  const value = result.Parameter?.Value;
  if (!value) throw new Error(`パラメータ ${name} が空です`);
  return value;
}

// コールドスタートで1回だけ取りに行き、以降は温まったインスタンスで使い回す
function client() {
  if (!clientPromise) {
    clientPromise = apiKey()
      .then((key) => new TypeSafeClient({ apiKey: key }))
      .catch((error) => {
        clientPromise = null;
        throw error;
      });
  }
  return clientPromise;
}

// Lambdaのインスタンスごとの素朴な制限。公開デモの暴走を抑えるだけの用途
const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 15;
const hits = new Map();

function overLimit(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 2000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function json(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

async function classify(request, response, url) {
  const ip = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
  if (overLimit(ip)) {
    json(response, 429, { error: '短い時間に呼びすぎです。少し待ってからどうぞ' });
    return;
  }

  const name = url.searchParams.get('name');
  if (typeof name !== 'string' || !name.trim() || name.length > 80) {
    json(response, 400, { error: 'name が不正です' });
    return;
  }

  const startedAt = Date.now();
  try {
    const jev = await client();
    const result = await jev.systemOne({
      state: name.trim(),
      questions: { cloud: choice(INSTRUCTIONS, CRITERIA) },
    });
    const answer = result.answers.cloud;
    json(response, 200, {
      choice: answer.choice,
      confidence: answer.confidence,
      probabilities: answer.probabilities,
      model: result.model,
      serverMs: Date.now() - startedAt,
    });
  } catch (error) {
    const status = error?.status === 429 ? 429 : 502;
    console.error('[classify]', error?.message || error);
    json(response, status, { error: '判定できませんでした' });
  }
}

function sendFile(requestPath, response) {
  const safePath = normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const candidate = join(root, safePath);
  const filePath = existsSync(candidate) && statSync(candidate).isFile()
    ? candidate
    : join(root, 'index.html');
  response.statusCode = 200;
  response.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream');
  // immutable を付けてよいのは Vite がハッシュを付けた /assets/ だけ。OGP画像やファビコンへ
  // 付けると「永久に変わらない」宣言になり、差し替えてもクローラーが取りに来なくなる。
  response.setHeader(
    'Cache-Control',
    filePath.endsWith('index.html') ? 'no-cache, no-store, must-revalidate'
      : filePath.includes('/assets/') ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600',
  );
  createReadStream(filePath).pipe(response);
}

createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://localhost');
  if (url.pathname === '/health') {
    json(response, 200, { status: 'ok' });
    return;
  }
  if (url.pathname === '/api/classify') {
    if (request.method !== 'GET') {
      json(response, 405, { error: 'GET で呼んでください' });
      return;
    }
    classify(request, response, url);
    return;
  }
  sendFile(url.pathname === '/' ? '/index.html' : url.pathname, response);
}).listen(port, '0.0.0.0', () => {
  console.log(`listening on http://0.0.0.0:${port}`);
});
