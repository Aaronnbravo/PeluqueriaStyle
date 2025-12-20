import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Esto asegura que public/ se copie a dist/
    copyPublicDir: true
  }
})