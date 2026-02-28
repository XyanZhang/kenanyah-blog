/**
 * 与首页 Dashboard 一致的背景：主题底色 + bokeh 光球，用于 (main) 下各子页面统一视觉。
 */
export function PageBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ background: 'var(--theme-bg-base)' }}
      aria-hidden
    >
      <div className="bokeh-orb bokeh-orb-1 absolute top-[8%] left-[12%] h-72 w-72 rounded-full opacity-70 blur-3xl" style={{ background: 'var(--theme-bg-orb-1)' }} />
      <div className="bokeh-orb bokeh-orb-2 absolute top-[15%] right-[8%] h-96 w-96 rounded-full opacity-60 blur-3xl" style={{ background: 'var(--theme-bg-orb-2)' }} />
      <div className="bokeh-orb bokeh-orb-3 absolute bottom-[20%] left-[5%] h-80 w-80 rounded-full opacity-50 blur-3xl" style={{ background: 'var(--theme-bg-orb-3)' }} />
      <div className="bokeh-orb bokeh-orb-4 absolute bottom-[10%] right-[15%] h-64 w-64 rounded-full opacity-65 blur-3xl" style={{ background: 'var(--theme-bg-orb-4)' }} />
      <div className="bokeh-orb bokeh-orb-5 absolute top-[45%] left-[35%] h-56 w-56 rounded-full opacity-40 blur-3xl" style={{ background: 'var(--theme-bg-orb-5)' }} />
      <div className="bokeh-orb bokeh-orb-6 absolute top-[5%] left-[55%] h-48 w-48 rounded-full opacity-55 blur-3xl" style={{ background: 'var(--theme-bg-orb-6)' }} />
      <div className="bokeh-orb bokeh-orb-7 absolute bottom-[35%] right-[30%] h-40 w-40 rounded-full opacity-45 blur-2xl" style={{ background: 'var(--theme-bg-orb-7)' }} />
      <div className="bokeh-orb bokeh-orb-8 absolute top-[60%] left-[65%] h-36 w-36 rounded-full opacity-50 blur-2xl" style={{ background: 'var(--theme-bg-orb-8)' }} />
    </div>
  )
}
