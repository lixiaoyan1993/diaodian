import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { resolve } from 'node:path';

export default {
  base: '/admin/',
  plugins: [
    vue(),
    AutoImport({ resolvers: [ElementPlusResolver()] }),
    Components({ resolvers: [ElementPlusResolver()] }),
  ],
  resolve: {
    alias: { '@': resolve(process.cwd(), 'src') },
  },
  server: {
    port: 3777,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3721', changeOrigin: true },
    },
  },
};
