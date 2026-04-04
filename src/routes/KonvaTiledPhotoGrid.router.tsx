import { Card, Typography } from 'antd'
import { useMemo, useState } from 'react'
import type { RouteObject } from 'react-router-dom'
import { KonvaTiledPhotoGrid as KonvaTiledPhotoGridBase } from '../components/KonvaTiledPhotoGrid'

export function KonvaTiledPhotoGrid() {
  const [tiledPhotoActive, setTiledPhotoActive] = useState<number | null>(null)
  const tiledPhotoSources = useMemo(
    () => Array.from({ length: 6 }, () => '/vite.svg'),
    [],
  )

  return (
    <Card className="shadow-sm" variant="borderless">
      <Typography.Text type="secondary" className="mb-2 block">
        Konva 六格图（悬停 / 点击选中；再点同一格取消）
      </Typography.Text>
      <div className="inline-block max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 shadow-inner">
        <KonvaTiledPhotoGridBase
          width={720}
          height={260}
          imageSources={tiledPhotoSources}
          activeIndex={tiledPhotoActive}
          onActiveChange={setTiledPhotoActive}
        />
      </div>
      <Typography.Text className="mt-2 block text-slate-600">
        当前选中：
        {tiledPhotoActive === null ? '无' : `格子 ${tiledPhotoActive + 1}`}
      </Typography.Text>
    </Card>
  )
}

export const konvaTiledPhotoGridRoute: RouteObject = {
  path: 'konva',
  element: <KonvaTiledPhotoGrid />,
}
