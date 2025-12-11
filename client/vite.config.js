import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-admin-html',
      writeBundle() {
        copyFileSync(
          resolve(__dirname, 'public/admin.html'),
          resolve(__dirname, 'dist/admin.html')
        )
      }
    }
  ],
})
