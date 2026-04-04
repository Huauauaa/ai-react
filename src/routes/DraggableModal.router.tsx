import { Button, Card, Space } from 'antd'
import { useState } from 'react'
import type { RouteObject } from 'react-router-dom'
import { DraggableModal as DraggableModalBase } from '../components/DraggableModal'

export function DraggableModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card className="shadow-sm" variant="borderless">
        <Space direction="vertical" size="middle">
          <Button type="primary" onClick={() => setOpen(true)}>
            打开可拖拽弹窗
          </Button>
          <p className="text-slate-600">
            在标题栏按下并拖动即可移动窗口，关闭按钮区域不会触发拖拽。
          </p>
        </Space>
      </Card>
      <DraggableModalBase
        title="可拖拽弹窗（按住标题栏拖动）"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => setOpen(false)}
        draggable
        destroyOnHidden
      >
        <p className="text-slate-600">
          在标题栏按下并拖动即可移动窗口，关闭按钮区域不会触发拖拽。
        </p>
      </DraggableModalBase>
    </>
  )
}

export const draggableModalRoute: RouteObject = {
  path: 'modal',
  element: <DraggableModal />,
}
