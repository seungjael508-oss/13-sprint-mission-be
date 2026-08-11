import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';

const projectDirectory = fileURLToPath(new URL('..', import.meta.url));
const uploadsDirectory = path.join(projectDirectory, 'uploads');
const jwtSecret = 'image-upload-security-test-secret';
const accessToken = jwt.sign({ userId: 1 }, jwtSecret);

let serverProcess: ChildProcess | undefined;
let serverOutput = '';
let baseUrl = '';

async function reserveAvailablePort(): Promise<number> {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const address = probe.address() as AddressInfo;
  probe.close();
  await once(probe, 'close');
  return address.port;
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
      () => settle(() => reject(new Error(`image upload test server timed out:\n${serverOutput}`))),
      10_000,
    );

    child.stdout?.on('data', checkStartup);
    child.stderr?.on('data', checkStartup);
    child.once('exit', (code) => {
      checkStartup();
      settle(() => reject(new Error(`image upload test server exited with code ${code}:\n${serverOutput}`)));
    });
  });
}

function getImageUrl(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('imageUrl' in body)) return null;
  return typeof body.imageUrl === 'string' ? body.imageUrl : null;
}

async function removeUploadedFile(body: unknown): Promise<void> {
  const imageUrl = getImageUrl(body);
  if (!imageUrl) return;
  const filename = path.basename(imageUrl);
  await rm(path.join(uploadsDirectory, filename), { force: true });
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
  const port = await reserveAvailablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, ['--loader', 'ts-node/esm', 'app.ts'], {
    cwd: projectDirectory,
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
  if (!serverProcess || serverProcess.exitCode !== null || serverProcess.signalCode !== null) return;
  const exited = once(serverProcess, 'exit');
  serverProcess.kill('SIGTERM');
  await exited;
});

test('active and spoofed bytes cannot be persisted as images', async (t) => {
  const fixtures = [
    {
      name: 'plain HTML',
      bytes: new TextEncoder().encode('<!doctype html><script>globalThis.pwned=true</script>'),
    },
    {
      name: 'PNG-signature polyglot-like payload',
      bytes: new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ...new TextEncoder().encode('<html><script>globalThis.pwned=true</script></html>'),
      ]),
    },
    {
      name: 'active SVG image payload',
      bytes: new TextEncoder().encode(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>globalThis.pwned=true</script></svg>',
      ),
    },
  ];

  for (const fixture of fixtures) {
    await t.test(fixture.name, async () => {
      const { response, body } = await uploadImage(fixture.bytes, 'image/png', 'attack.png');
      try {
        assert.equal(response.status, 400);
        assert.equal(getImageUrl(body), null);
      } finally {
        await removeUploadedFile(body);
      }
    });
  }
});

test('legitimate PNG, JPEG, GIF, and WebP images retain the upload response shape', async (t) => {
  const fixtures = [
    {
      format: 'PNG',
      mimeType: 'image/png',
      extension: 'png',
      base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    },
    {
      format: 'JPEG',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      base64: '/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABgj/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABykX//Z',
    },
    {
      format: 'GIF',
      mimeType: 'image/gif',
      extension: 'gif',
      base64: 'R0lGODlhAQABAIAAAExpcf8AACH5BAUAAAAALAAAAAABAAEAAAICTAEAOw==',
    },
    {
      format: 'WebP',
      mimeType: 'image/webp',
      extension: 'webp',
      base64: 'UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoBAAEAAUAmJaACdLoB+AADsAD+8ut//NgVzXPv9//S4P0uD9Lg/9KQAAA=',
    },
  ];

  for (const fixture of fixtures) {
    await t.test(fixture.format, async () => {
      const bytes = new Uint8Array(Buffer.from(fixture.base64, 'base64'));
      const { response, body } = await uploadImage(bytes, fixture.mimeType, 'control.html');

      try {
        assert.equal(response.status, 201);
        const imageUrl = getImageUrl(body);
        assert.match(
          imageUrl ?? '',
          new RegExp(`^/uploads/[A-Za-z0-9_-]+\\.${fixture.extension}$`),
        );

        const staticResponse = await fetch(`${baseUrl}${imageUrl}`);
        assert.equal(staticResponse.status, 200);
        assert.equal(staticResponse.headers.get('x-content-type-options'), 'nosniff');
      } finally {
        await removeUploadedFile(body);
      }
    });
  }
});

test('the API does not expose repository-root static files', async () => {
  const response = await fetch(`${baseUrl}/check.html`);
  assert.equal(response.status, 404);
});
