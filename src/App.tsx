import { ConfigProvider } from 'antd'
import { NavLink, Outlet } from 'react-router-dom'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
  }`

export function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 10,
        },
      }}
    >
      <main className="min-h-screen bg-slate-100 p-6 md:p-10">
        <div className="mx-auto max-w-3xl">
          <nav className="mb-4 flex flex-wrap gap-2 rounded-xl border border-slate-200/80 bg-slate-200/40 p-2">
            <NavLink to="/fiber" className={navLinkClass}>
              光纤截面
            </NavLink>
            <NavLink to="/konva" className={navLinkClass}>
              Konva 六格图
            </NavLink>
            <NavLink to="/modal" className={navLinkClass}>
              可拖拽弹窗
            </NavLink>
            <NavLink to="/boneyard" className={navLinkClass}>
              Boneyard 骨架屏
            </NavLink>
          </nav>
          <Outlet />
        </div>
      </main>
    </ConfigProvider>
  )
}
