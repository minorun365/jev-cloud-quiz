import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    // 開発時は同じオリジンで /api を受けたいので、ローカルのサーバーへ渡す
    proxy: {
      '/api': 'http://127.0.0.1:8080',
    },
  },
});
