import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import 'antd/dist/reset.css'
import './index.css'
import './bones/registry'
import { appRoutes } from './appRoutes'

const baseUrl = import.meta.env.BASE_URL
const router = createBrowserRouter(appRoutes, {
  ...(baseUrl !== '/' && { basename: baseUrl.replace(/\/$/, '') }),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
