import { Button, Card, ConfigProvider, Select, Space, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { DraggableModal } from './components/DraggableModal'
import { KonvaTiledPhotoGrid } from './components/KonvaTiledPhotoGrid'
import FiberCrossSection from './components/FiberCrossSection'
import case1Data from './components/case1.json'
import case2Data from './components/case2.json'

function App() {
  const cases = useMemo(
    () => ({
      case1: case1Data,
      case2: case2Data,
    }),
    [],
  )
  const [activeCaseKey, setActiveCaseKey] = useState<keyof typeof cases>('case1')
  const [draggableModalOpen, setDraggableModalOpen] = useState(false)
  const [tiledPhotoActive, setTiledPhotoActive] = useState<number | null>(null)

  const tiledPhotoSources = useMemo(
    () => Array.from({ length: 6 }, () => '/vite.svg'),
    [],
  )

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
        <section className="mx-auto max-w-3xl">
          <Card className="shadow-sm" variant="borderless">
            <Space direction="vertical" size="middle" className="w-full">
              <Space wrap>
                <Select
                  value={activeCaseKey}
                  onChange={(value) => setActiveCaseKey(value)}
                  options={[
                    { value: 'case1', label: 'case1.json' },
                    { value: 'case2', label: 'case2.json' },
                  ]}
                  style={{ width: 180 }}
                />
                <Button type="primary" onClick={() => setDraggableModalOpen(true)}>
                  打开可拖拽弹窗
                </Button>
              </Space>
              <FiberCrossSection caseData={cases[activeCaseKey]} />
              <div>
                <Typography.Text type="secondary" className="mb-2 block">
                  Konva 六格图（悬停 / 点击选中；再点同一格取消）
                </Typography.Text>
                <div className="inline-block max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 shadow-inner">
                  <KonvaTiledPhotoGrid
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
              </div>
            </Space>
          </Card>
        </section>
      </main>
      <DraggableModal
        title="可拖拽弹窗（按住标题栏拖动）"
        open={draggableModalOpen}
        onCancel={() => setDraggableModalOpen(false)}
        onOk={() => setDraggableModalOpen(false)}
        draggable
        destroyOnHidden
      >
        <p className="text-slate-600">
          在标题栏按下并拖动即可移动窗口，关闭按钮区域不会触发拖拽。
        </p>
      </DraggableModal>
    </ConfigProvider>
  )
}

export default App
