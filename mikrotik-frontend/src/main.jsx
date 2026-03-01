import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* ✅ 2. ครอบ App ด้วย BrowserRouter */}
    <BrowserRouter>
      
      {/* ✅ 3. วาง Toaster ไว้ที่ระดับบนสุดของแอป */}
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          duration: 3000, // แสดงข้อความ 3 วินาที
          style: {
            borderRadius: '12px',
            background: '#333',
            color: '#fff',
          },
        }} 
      />

      <App />
    </BrowserRouter>
  </React.StrictMode>,
)