'use client'

import { motion } from 'framer-motion'

const FLOATING_TAGS = [
  { label: '<div />', className: 'left-[-1.5rem] top-[1.2rem]' },
  { label: 'const ui', className: 'right-[-2rem] top-[2.6rem]' },
  { label: 'useState()', className: 'left-[-2.8rem] bottom-[3.8rem]' },
  { label: 'pnpm dev', className: 'right-[-1.8rem] bottom-[2rem]' },
]

export function DashboardBootLoading() {
  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6"
      style={{ background: 'var(--theme-bg-base)' }}
      aria-label="首页加载中"
      role="status"
    >
      <div className="bokeh-orb bokeh-orb-1 absolute top-[8%] left-[12%] h-72 w-72 rounded-full opacity-70 blur-3xl" style={{ background: 'var(--theme-bg-orb-1)' }} />
      <div className="bokeh-orb bokeh-orb-2 absolute top-[15%] right-[8%] h-96 w-96 rounded-full opacity-60 blur-3xl" style={{ background: 'var(--theme-bg-orb-2)' }} />
      <div className="bokeh-orb bokeh-orb-3 absolute bottom-[20%] left-[5%] h-80 w-80 rounded-full opacity-50 blur-3xl" style={{ background: 'var(--theme-bg-orb-3)' }} />
      <div className="bokeh-orb bokeh-orb-4 absolute bottom-[10%] right-[15%] h-64 w-64 rounded-full opacity-65 blur-3xl" style={{ background: 'var(--theme-bg-orb-4)' }} />

      <div className="relative z-10 flex max-w-3xl flex-col items-center gap-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {FLOATING_TAGS.map((tag, index) => (
            <motion.div
              key={tag.label}
              className={`absolute hidden rounded-full border border-line-glass bg-surface-glass px-3 py-1 text-xs font-medium text-content-secondary shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-md sm:block ${tag.className}`}
              animate={{
                y: [0, index % 2 === 0 ? -8 : 8, 0],
                rotate: index % 2 === 0 ? [-2, 2, -2] : [2, -2, 2],
              }}
              transition={{
                duration: 3.4 + index * 0.35,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {tag.label}
            </motion.div>
          ))}

          <motion.div
            className="relative"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="relative h-[18rem] w-[16rem] sm:h-[20rem] sm:w-[18rem]">
              <div
                className="absolute left-1/2 top-2 h-28 w-28 -translate-x-1/2 rounded-full border border-white/55 shadow-[0_20px_40px_rgba(15,23,42,0.10)]"
                style={{
                  background:
                    'radial-gradient(circle at 35% 30%, color-mix(in srgb, white 78%, var(--theme-accent-tertiary) 22%), color-mix(in srgb, #f0c7ad 88%, var(--theme-accent-primary-light) 12%) 68%, color-mix(in srgb, #d59a78 92%, var(--theme-accent-primary-dark) 8%))',
                }}
              >
                <div
                  className="absolute -top-1 left-1/2 h-[3.25rem] w-[7.6rem] -translate-x-1/2 rounded-[999px_999px_26px_26px]"
                  style={{
                    background:
                      'linear-gradient(180deg, color-mix(in srgb, var(--theme-accent-primary-dark) 88%, #2f2538 12%), color-mix(in srgb, var(--theme-accent-primary) 74%, #443456 26%))',
                  }}
                />
                <div
                  className="absolute left-[0.95rem] top-[2.2rem] h-4 w-4 rounded-full"
                  style={{ background: 'color-mix(in srgb, var(--theme-accent-primary-dark) 84%, #201726 16%)' }}
                />
                <div
                  className="absolute right-[0.95rem] top-[2.2rem] h-4 w-4 rounded-full"
                  style={{ background: 'color-mix(in srgb, var(--theme-accent-primary-dark) 84%, #201726 16%)' }}
                />
                <motion.div
                  className="absolute left-[2.25rem] top-[2.45rem] h-[2px] w-4 rounded-full"
                  style={{ background: 'color-mix(in srgb, var(--theme-accent-primary-dark) 72%, #201726 28%)' }}
                  animate={{ opacity: [1, 1, 0.15, 1] }}
                  transition={{ duration: 2.8, repeat: Infinity, times: [0, 0.42, 0.48, 1] }}
                />
                <motion.div
                  className="absolute right-[2.25rem] top-[2.45rem] h-[2px] w-4 rounded-full"
                  style={{ background: 'color-mix(in srgb, var(--theme-accent-primary-dark) 72%, #201726 28%)' }}
                  animate={{ opacity: [1, 1, 0.15, 1] }}
                  transition={{ duration: 2.8, repeat: Infinity, times: [0, 0.42, 0.48, 1] }}
                />
                <div
                  className="absolute left-1/2 top-[4.2rem] h-[0.34rem] w-4 -translate-x-1/2 rounded-full"
                  style={{ background: 'color-mix(in srgb, #d68d87 84%, var(--theme-accent-secondary) 16%)' }}
                />
                <div
                  className="absolute left-1/2 top-[5.15rem] h-[0.38rem] w-7 -translate-x-1/2 rounded-full"
                  style={{ background: 'color-mix(in srgb, #bc6c6d 90%, var(--theme-accent-tertiary) 10%)' }}
                />
                <div className="absolute -bottom-3 left-1/2 h-6 w-8 -translate-x-1/2 rounded-full bg-white/30 blur-md" />
              </div>

              <div
                className="absolute left-1/2 top-[6.2rem] h-[6.4rem] w-[9.2rem] -translate-x-1/2 rounded-[2.2rem_2.2rem_1.4rem_1.4rem] border border-white/45 shadow-[0_22px_36px_rgba(15,23,42,0.10)]"
                style={{
                  background:
                    'linear-gradient(180deg, color-mix(in srgb, var(--theme-accent-primary-light) 72%, white 28%), color-mix(in srgb, var(--theme-accent-primary) 58%, white 42%))',
                }}
              >
                <div className="absolute inset-x-4 top-4 h-2 rounded-full bg-white/35" />
              </div>

              <motion.div
                className="absolute left-1/2 top-[9.25rem] h-[4.2rem] w-[11.6rem] -translate-x-1/2 rounded-[1.3rem] border border-white/55 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.10)]"
                style={{
                  background:
                    'linear-gradient(180deg, color-mix(in srgb, var(--theme-surface-primary) 72%, white 28%), color-mix(in srgb, var(--theme-accent-primary-subtle) 72%, white 28%))',
                }}
                animate={{ rotate: [-2, 1.5, -2] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="grid grid-cols-6 gap-1.5">
                  {Array.from({ length: 18 }).map((_, index) => (
                    <span
                      key={index}
                      className="h-1.5 rounded-full"
                      style={{
                        background:
                          index % 5 === 0
                            ? 'color-mix(in srgb, var(--theme-accent-secondary) 58%, white 42%)'
                            : 'color-mix(in srgb, var(--theme-accent-primary) 28%, white 72%)',
                      }}
                    />
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="absolute bottom-[1.1rem] left-1/2 h-[5.3rem] w-[12.8rem] -translate-x-1/2 rounded-[1.5rem] border border-white/65 p-3 shadow-[0_26px_60px_rgba(15,23,42,0.12)]"
                style={{
                  background:
                    'linear-gradient(180deg, color-mix(in srgb, var(--theme-surface-selected) 78%, white 22%), color-mix(in srgb, var(--theme-accent-primary-light) 84%, white 16%))',
                }}
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div
                  className="flex h-full flex-col rounded-[1rem] border border-white/55 p-3 text-left shadow-inner"
                  style={{
                    background:
                      'linear-gradient(180deg, color-mix(in srgb, var(--theme-accent-primary-subtle) 56%, white 44%), color-mix(in srgb, var(--theme-surface-primary) 90%, white 10%))',
                  }}
                >
                  <div className="mb-2 flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--theme-accent-primary)_70%,white_30%)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--theme-accent-secondary)_70%,white_30%)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[color-mix(in_srgb,var(--theme-accent-tertiary)_70%,white_30%)]" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-[72%] rounded-full bg-[color-mix(in_srgb,var(--theme-accent-primary)_24%,white_76%)]" />
                    <div className="h-2.5 w-[88%] rounded-full bg-[color-mix(in_srgb,var(--theme-accent-secondary)_28%,white_72%)]" />
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-[40%] rounded-full bg-[color-mix(in_srgb,var(--theme-accent-tertiary)_28%,white_72%)]" />
                      <motion.div
                        className="h-4 w-1 rounded-full bg-accent-primary"
                        animate={{ opacity: [1, 0.1, 1] }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl space-y-2"
        >
          <p className="font-display text-2xl font-semibold tracking-tight text-content-primary sm:text-3xl">
            正在唤醒首页
            <span className="mx-2 text-content-muted">/</span>
            Waking up the dashboard
          </p>
          <p className="text-sm leading-7 text-content-secondary sm:text-base">
            正在读取布局、图片和导航配置，请稍等片刻。
            <span className="mx-2 text-content-muted">|</span>
            Loading layout, images, and nav data.
          </p>
        </motion.div>
      </div>

      <span className="sr-only">首页加载中</span>
    </div>
  )
}
