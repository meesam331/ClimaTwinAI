import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'FLASK_');
  const apiPort = env.FLASK_PORT || '5000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': `http://127.0.0.1:${apiPort}`,
      },
    },
  };
});
