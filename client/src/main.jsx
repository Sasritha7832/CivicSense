import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
import './index.css'
import 'leaflet/dist/leaflet.css'

window.addEventListener('error', function(e) {
  document.body.innerHTML += '<div style="color:red;font-size:20px;padding:20px;background:white;z-index:9999;position:fixed;top:0;left:0;right:0;white-space:pre-wrap;font-family:monospace;"><b>Runtime Error:</b><br>' + e.error?.stack + '</div>';
});
window.addEventListener('unhandledrejection', function(e) {
  document.body.innerHTML += '<div style="color:red;font-size:20px;padding:20px;background:white;z-index:9999;position:fixed;top:0;left:0;right:0;white-space:pre-wrap;font-family:monospace;"><b>Promise Rejection:</b><br>' + e.reason?.stack + '</div>';
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#111827', color: '#f9fafb', border: '1px solid #1f2937', borderRadius: '12px', fontSize: '14px' },
              success: { iconTheme: { primary: '#22c55e', secondary: '#111827' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#111827' } },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
