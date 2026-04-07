import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Granja Vô Nael',
        short_name: 'Granja Nael',
        description: 'Gestão da Granja Galinha Caipira',
        theme_color: '#F5A624',
        background_color: '#1E2B5E',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/logo192.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
