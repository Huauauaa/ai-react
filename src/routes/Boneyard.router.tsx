import { Button, Card, Segmented, Space, Switch } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import type { RouteObject } from 'react-router-dom'
import { Skeleton } from 'boneyard-js/react'

type FeedItem = {
  id: string
  title: string
  subtitle: string
  tag: string
}

const FEED: FeedItem[] = [
  { id: 'p-1', title: 'Build a calm skeleton state', subtitle: 'Keep layout stable across loading', tag: 'UX' },
  { id: 'p-2', title: 'Capture bones from real UI', subtitle: 'No manual measurement needed', tag: 'DX' },
  { id: 'p-3', title: 'Responsive bones by breakpoint', subtitle: 'Mobile → Desktop stays accurate', tag: 'Layout' },
]

function FallbackSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 shrink-0 rounded-full bg-slate-200/80" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-slate-200/80" />
          <div className="h-4 w-5/12 rounded bg-slate-200/70" />
          <div className="mt-3 h-9 w-24 rounded-lg bg-slate-200/70" />
        </div>
      </div>
    </div>
  )
}

function FeedCard({ item }: { item: FeedItem }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white">
          {item.tag}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-slate-900">{item.title}</div>
          <div className="mt-1 text-sm text-slate-600">{item.subtitle}</div>
          <div className="mt-3 flex items-center gap-2">
            <Button size="small" type="primary">
              View
            </Button>
            <Button size="small">Save</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function BoneyardDemo() {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [manualLoading, setManualLoading] = useState(true)
  const [autoLoading, setAutoLoading] = useState(true)

  useEffect(() => {
    if (mode !== 'auto') return
    setAutoLoading(true)
    const t = window.setTimeout(() => setAutoLoading(false), 1200)
    return () => window.clearTimeout(t)
  }, [mode])

  const loading = mode === 'auto' ? autoLoading : manualLoading

  const fixture = useMemo(
    () => (
      <div className="space-y-3">
        {FEED.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </div>
    ),
    [],
  )

  return (
    <Space direction="vertical" size="middle" className="w-full">
      <Card className="shadow-sm" variant="borderless">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">Boneyard skeleton demo</div>
            <div className="mt-1 text-sm text-slate-600">
              用 <code className="rounded bg-slate-100 px-1.5 py-0.5">boneyard-js</code> 从真实 UI 自动生成骨架（bones）。
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              value={mode}
              options={[
                { label: '自动加载', value: 'auto' },
                { label: '手动开关', value: 'manual' },
              ]}
              onChange={(v) => setMode(v as 'auto' | 'manual')}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">loading</span>
              <Switch
                disabled={mode !== 'manual'}
                checked={manualLoading}
                onChange={(v) => setManualLoading(v)}
              />
            </div>
          </div>
        </div>
      </Card>

      <Skeleton
        name="boneyard-feed"
        loading={loading}
        animate="pulse"
        fixture={fixture}
        fallback={<FallbackSkeleton />}
      >
        <div className="space-y-3">
          {FEED.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      </Skeleton>
    </Space>
  )
}

export const boneyardRoute: RouteObject = {
  path: 'boneyard',
  element: <BoneyardDemo />,
}

