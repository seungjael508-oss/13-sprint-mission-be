import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageJsonUrl = new URL('../package.json', import.meta.url);
const viteConfigUrl = new URL('../frontend/vite.config.js', import.meta.url);
const projectDirectory = fileURLToPath(new URL('..', import.meta.url));

async function reserveAvailablePort(): Promise<number> {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = (probe.address() as AddressInfo).port;
  probe.close();
  await once(probe, 'close');
  return port;
}

async function waitForHealthyServer(child: ReturnType<typeof spawn>, port: number): Promise<void> {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`ts-node ESM startup exited with code ${child.exitCode}`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.status === 200) return;
    } catch {
      // The process is still compiling or binding the socket.
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error('ts-node ESM startup timed out');
}

test('개발 서버는 nodemon과 ts-node로 TypeScript 변경을 감시한다', async () => {
  const packageJson = JSON.parse(await readFile(packageJsonUrl, 'utf8')) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  assert.match(packageJson.scripts?.dev ?? '', /nodemon/);
  assert.match(packageJson.scripts?.dev ?? '', /ts-node/);
  assert.ok(packageJson.devDependencies?.nodemon);
  assert.ok(packageJson.devDependencies?.['ts-node']);

  const port = await reserveAvailablePort();
  const child = spawn(process.execPath, ['--loader', 'ts-node/esm', 'app.ts'], {
    cwd: projectDirectory,
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
  });

  try {
    await waitForHealthyServer(child, port);
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.equal(child.exitCode, null, '개발 서버는 명시적으로 종료할 때까지 실행되어야 한다.');
    assert.equal(child.signalCode, null, '개발 서버는 명시적으로 종료할 때까지 실행되어야 한다.');
    const response = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(response.status, 200);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await exited;
    }
  }
});

test('production install에 Prisma client와 dotenv가 포함된다', async () => {
  const packageJson = JSON.parse(await readFile(packageJsonUrl, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  assert.ok(packageJson.dependencies?.['@prisma/client']);
  assert.ok(packageJson.dependencies?.dotenv);
  assert.equal(packageJson.devDependencies?.['@prisma/client'], undefined);
  assert.equal(packageJson.devDependencies?.dotenv, undefined);
});

test('번들된 프론트엔드의 기본 API 주소도 백엔드 기본 포트와 일치한다', async () => {
  const viteConfig = await readFile(viteConfigUrl, 'utf8');
  assert.match(viteConfig, /env\.PORT \|\| 3001/);
});
