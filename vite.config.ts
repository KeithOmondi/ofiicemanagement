import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Allow importing HTML files as raw strings
  assetsInclude: ['**/*.html'],
  // Optional: Configure server to serve static files
  server: {
    // This allows the dev server to serve files from the templates folder
    fs: {
      allow: ['..'],
    },
  },
})