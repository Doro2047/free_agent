import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Plugin } from 'vite'

function gzipReportPlugin(): Plugin {
  return {
    name: 'gzip-report',
    closeBundle() {
      console.log('\n========== 构建报告 ==========')
      console.log('生产环境优化已启用: Terser压缩 + CSS压缩 + 代码分割')
      console.log('================================\n')
    }
  }
}

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? './' : '/',
  plugins: [react(), gzipReportPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor'
          }

          if (id.includes('node_modules/react-markdown/') ||
              id.includes('node_modules/remark-') ||
              id.includes('node_modules/micromark/') ||
              id.includes('node_modules/mdast-')) {
            return 'markdown-renderer'
          }

          if (id.includes('node_modules/react-syntax-highlighter/') ||
              id.includes('node_modules/highlight.js/')) {
            return 'syntax-highlight'
          }

          if (id.includes('node_modules/date-fns/') ||
              id.includes('node_modules/axios/') ||
              id.includes('node_modules/zustand/') ||
              id.includes('node_modules/lucide-react/')) {
            return 'utils-vendor'
          }

          if (id.includes('node_modules/')) {
            return 'vendor'
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      format: {
        comments: false,
      },
    },
    sourcemap: false,
    target: 'es2020',
    cssCodeSplit: true,
    reportCompressedSize: true,
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['electron', 'electron-updater'],
  },
})
