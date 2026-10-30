import uni from '@dcloudio/vite-plugin-uni';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [uni()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3721',
        changeOrigin: true,

      },
      '/admin': {
        target: 'http://127.0.0.1:3777',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3721',
        changeOrigin: true,
      },
    },
  },
});
