import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' supaya build bisa dibuka dari folder/host statis mana pun
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, host: true },
})
