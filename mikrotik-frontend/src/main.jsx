import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query' // ✅ 1. Import
import { ReactQueryDevtools } from '@tanstack/react-query-devtools' // ✅ 2. Import Devtools
import App from './App.jsx'
import './index.css'

// ✅ 3. สร้าง Query Client และตั้งค่าพื้นฐาน
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 1, // ข้อมูลจะถูกมองว่าสดใหม่ใน 1 นาที (ไม่ต้องดึงใหม่ถ้าสลับหน้าไปมาเร็วๆ)
      refetchOnWindowFocus: true, // ดึงข้อมูลใหม่เมื่อผู้ใช้สลับแท็บกลับมาหน้าเว็บเรา
      retry: 1, // ถ้า Error ให้ลองใหม่ 1 ครั้ง
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* ✅ 4. ครอบ App ด้วย QueryClientProvider */}
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster 
          position="top-right" 
          toastOptions={{ 
            duration: 3000, 
            style: { borderRadius: '12px', background: '#333', color: '#fff' },
          }} 
        />
        <App />
      </BrowserRouter>
      {/* เครื่องมือ Devtools (จะไม่แสดงบน Production) */}
      <ReactQueryDevtools initialIsOpen={false} /> 
    </QueryClientProvider>
  </React.StrictMode>,
)