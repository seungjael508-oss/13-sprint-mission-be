import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = `http://localhost:${env.PORT || 3001}`;

  return {
    root: 'frontend',
    plugins: [react()],
    define: {
      __API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL || apiTarget),
    },
    server: {
      port: 5173,
    },
    build: {
      outDir: '../dist/frontend',
      emptyOutDir: true,
    },
  };
});
