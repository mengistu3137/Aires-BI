import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { initPwaPrompts } from './pwa/pwaPrompts.js'

// Register service worker with update handling
const updateSW = registerSW({
  onNeedRefresh() {
    initPwaPrompts.showUpdateToast(() => updateSW(true))
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

// Set up install prompt listener (must run before React mounts, since
// the browser can fire beforeinstallprompt very early)
initPwaPrompts.listenForInstallPrompt()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
