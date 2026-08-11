import assert from 'node:assert/strict';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';

const execFileAsync = promisify(execFile);
const projectDirectory = fileURLToPath(new URL('..', import.meta.url));
const jwtSecret = 'production-image-upload-test-secret';
const accessToken = jwt.sign({ userId: 1 }, jwtSecret);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

let serverProcess: ChildProcess | undefined;
let serverOutput = '';
let baseUrl = '';

async function reserveAvailablePort(): Promise<number> {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = (probe.address() as AddressInfo).port;
  probe.close();
  await once(probe, 'close');
  return port;
}

async function waitForStartup(child: ChildProcess, expectedMessage: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const checkStartup = () => {
      if (serverOutput.includes(expectedMessage)) settle(resolve);
    };
    const timeout = setTimeout(
      () => settle(() => reject(new Error(`production server timed out:\n${serverOutput}`))),
      15_000,
    );

    child.stdout?.on('data', checkStartup);
    child.stderr?.on('data', checkStartup);
    child.once('exit', (code) => {
      checkStartup();
      settle(() => reject(new Error(`production server exited with code ${code}:\n${serverOutput}`)));
    });
  });
}

async function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  if (process.platform === 'win32' || child.pid === undefined) {
    child.kill('SIGTERM');
  } else {
    process.kill(-child.pid, 'SIGTERM');
  }
  await exited;
}

function getImageUrl(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('imageUrl' in body)) return null;
  return typeof body.imageUrl === 'string' ? body.imageUrl : null;
}

async function removeUploadedFile(body: unknown): Promise<void> {
  const imageUrl = getImageUrl(body);
  if (!imageUrl) return;
  const filename = path.basename(imageUrl);
  await Promise.all([
    rm(path.join(projectDirectory, 'uploads', filename), { force: true }),
    rm(path.join(projectDirectory, 'dist', 'uploads', filename), { force: true }),
  ]);
}

async function uploadImage(bytes: Uint8Array, mimeType: string, filename: string) {
  const form = new FormData();
  form.append('image', new Blob([bytes], { type: mimeType }), filename);
  const response = await fetch(`${baseUrl}/images/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  const body = (await response.json()) as unknown;
  return { response, body };
}

before(async () => {
  await execFileAsync(npmCommand, ['run', 'build'], { cwd: projectDirectory });
  const port = await reserveAvailablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(npmCommand, ['start'], {
    cwd: projectDirectory,
    detached: process.platform !== 'win32',
    env: { ...process.env, JWT_SECRET: jwtSecret, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverProcess.stdout?.setEncoding('utf8');
  serverProcess.stderr?.setEncoding('utf8');
  serverProcess.stdout?.on('data', (chunk: string) => {
    serverOutput += chunk;
  });
  serverProcess.stderr?.on('data', (chunk: string) => {
    serverOutput += chunk;
  });
  await waitForStartup(serverProcess, `서버가 http://localhost:${port} 에서 실행 중이에요!`);
});

after(async () => {
  if (serverProcess) await stopServer(serverProcess);
});

test('compiled npm start rejects active bytes and serves a decoded PNG upload', async () => {
  const malicious = await uploadImage(
    new TextEncoder().encode('<!doctype html><script>globalThis.pwned=true</script>'),
    'image/png',
    'attack.png',
  );
  try {
    assert.equal(malicious.response.status, 400);
    assert.equal(getImageUrl(malicious.body), null);
  } finally {
    await removeUploadedFile(malicious.body);
  }

  const pngBytes = new Uint8Array(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  const legitimate = await uploadImage(pngBytes, 'image/png', 'control.html');

  try {
    assert.equal(legitimate.response.status, 201);
    const imageUrl = getImageUrl(legitimate.body);
    assert.match(imageUrl ?? '', /^\/uploads\/[A-Za-z0-9_-]+\.png$/);

    const staticResponse = await fetch(`${baseUrl}${imageUrl}`);
    assert.equal(staticResponse.status, 200);
    assert.equal(staticResponse.headers.get('content-type'), 'image/png');
    assert.equal(staticResponse.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(new Uint8Array(await staticResponse.arrayBuffer()), pngBytes);
  } finally {
    await removeUploadedFile(legitimate.body);
  }
});
