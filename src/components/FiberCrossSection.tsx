import { useEffect, useRef, useState } from 'react'
import { Modal, Segmented, Space, Typography } from 'antd'
import { Canvas, Circle, Text } from 'fabric'

const { Paragraph, Text: AntText } = Typography

type FiberTargetType = 'tube' | 'core'
type FiberSpec = '144' | '288'

type FiberMeta = {
  targetType: FiberTargetType
  tubeIndex: number
  coreIndex?: number
  globalCoreIndex?: number
}

type FiberObject = Circle & { fiberMeta?: FiberMeta }
type RingLayout = { radius: number; tubeCount: number }
type FiberLayout = {
  label: string
  totalCores: number
  tubeRadius: number
  coreRadius: number
  coreColumns: number
  coreRows: number
  coreGridSpacingX: number
  coreGridSpacingY: number
  rings: RingLayout[]
}

const CANVAS_WIDTH = 760
const CANVAS_HEIGHT = 760
const OUTER_RADIUS = 320
const CANVAS_CENTER_X = CANVAS_WIDTH / 2
const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2

const FIBER_LAYOUTS: Record<FiberSpec, FiberLayout> = {
  '144': {
    label: '144 芯',
    totalCores: 144,
    tubeRadius: 56,
    coreRadius: 10,
    coreColumns: 4,
    coreRows: 3,
    coreGridSpacingX: 24,
    coreGridSpacingY: 24,
    rings: [
      { radius: 230, tubeCount: 8 },
      { radius: 120, tubeCount: 3 },
      { radius: 0, tubeCount: 1 },
    ],
  },
  '288': {
    label: '288 芯',
    totalCores: 288,
    tubeRadius: 38,
    coreRadius: 6,
    coreColumns: 4,
    coreRows: 3,
    coreGridSpacingX: 15,
    coreGridSpacingY: 15,
    rings: [
      { radius: 250, tubeCount: 12 },
      { radius: 165, tubeCount: 8 },
      { radius: 82, tubeCount: 3 },
      { radius: 0, tubeCount: 1 },
    ],
  },
}

function getTubeCount(layout: FiberLayout): number {
  return layout.rings.reduce((sum, ring) => sum + ring.tubeCount, 0)
}

function makeTube(
  fabricCanvas: Canvas,
  layout: FiberLayout,
  tubeIndex: number,
  globalCoreStartIndex: number,
  centerX: number,
  centerY: number,
): void {
  const tubeCircle = new Circle({
    left: centerX,
    top: centerY,
    radius: layout.tubeRadius,
    fill: '#dbeafe',
    stroke: '#3b82f6',
    strokeWidth: 3,
    originX: 'center',
    originY: 'center',
    hasControls: false,
    hasBorders: false,
    lockMovementX: true,
    lockMovementY: true,
    hoverCursor: 'pointer',
  }) as FiberObject

  tubeCircle.fiberMeta = {
    targetType: 'tube',
    tubeIndex,
  }
  fabricCanvas.add(tubeCircle)

  const label = new Text(String(tubeIndex), {
    left: centerX,
    top: centerY,
    fontSize: Math.max(14, layout.tubeRadius * 0.36),
    fontWeight: 'bold',
    fill: '#1e3a8a',
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  })
  fabricCanvas.add(label)

  const coreGridWidth = (layout.coreColumns - 1) * layout.coreGridSpacingX
  const coreGridHeight = (layout.coreRows - 1) * layout.coreGridSpacingY

  for (let row = 0; row < layout.coreRows; row += 1) {
    for (let col = 0; col < layout.coreColumns; col += 1) {
      const coreX = centerX - coreGridWidth / 2 + col * layout.coreGridSpacingX
      const coreY = centerY - coreGridHeight / 2 + row * layout.coreGridSpacingY
      const coreIndex = row * layout.coreColumns + col + 1
      const coreCircle = new Circle({
        left: coreX,
        top: coreY,
        radius: layout.coreRadius,
        fill: '#facc15',
        stroke: '#ca8a04',
        strokeWidth: 1.5,
        originX: 'center',
        originY: 'center',
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
        hoverCursor: 'pointer',
      }) as FiberObject

      coreCircle.fiberMeta = {
        targetType: 'core',
        tubeIndex,
        coreIndex,
        globalCoreIndex: globalCoreStartIndex + coreIndex - 1,
      }
      fabricCanvas.add(coreCircle)
    }
  }
}

function FiberCrossSection() {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null)
  const [selectedSpec, setSelectedSpec] = useState<FiberSpec>('144')
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const layout = FIBER_LAYOUTS[selectedSpec]
  const tubeCount = getTubeCount(layout)
  const coresPerTube = layout.coreColumns * layout.coreRows

  useEffect(() => {
    if (!canvasElementRef.current) return

    const fabricCanvas = new Canvas(canvasElementRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#f8fafc',
      selection: false,
    })

    const outerRing = new Circle({
      left: CANVAS_CENTER_X,
      top: CANVAS_CENTER_Y,
      radius: OUTER_RADIUS,
      fill: '#ffffff',
      stroke: '#334155',
      strokeWidth: 4,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    })
    fabricCanvas.add(outerRing)

    let tubeIndex = 1
    let globalCoreStartIndex = 1

    for (const ring of layout.rings) {
      if (ring.tubeCount === 1 && ring.radius === 0) {
        makeTube(fabricCanvas, layout, tubeIndex, globalCoreStartIndex, CANVAS_CENTER_X, CANVAS_CENTER_Y)
        tubeIndex += 1
        globalCoreStartIndex += coresPerTube
        continue
      }

      for (let i = 0; i < ring.tubeCount; i += 1) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * i) / ring.tubeCount
        const centerX = CANVAS_CENTER_X + ring.radius * Math.cos(angle)
        const centerY = CANVAS_CENTER_Y + ring.radius * Math.sin(angle)
        makeTube(fabricCanvas, layout, tubeIndex, globalCoreStartIndex, centerX, centerY)
        tubeIndex += 1
        globalCoreStartIndex += coresPerTube
      }
    }

    fabricCanvas.on('mouse:down', (event) => {
      const target = event.target as FiberObject | undefined
      if (!target?.fiberMeta) return

      if (target.fiberMeta.targetType === 'tube') {
        setMessage(`管束序号：${target.fiberMeta.tubeIndex}`)
      } else {
        setMessage(
          `管束序号：${target.fiberMeta.tubeIndex}，管束内纤芯序号：${target.fiberMeta.coreIndex}，全局纤芯序号：${target.fiberMeta.globalCoreIndex}`,
        )
      }
      setOpen(true)
    })

    fabricCanvas.renderAll()
    return () => {
      fabricCanvas.dispose()
    }
  }, [coresPerTube, layout])

  return (
    <div className="flex flex-col items-center gap-4">
      <Space direction="vertical" size={8} align="center">
        <Segmented<FiberSpec>
          options={[
            { label: '144 芯', value: '144' },
            { label: '288 芯', value: '288' },
          ]}
          value={selectedSpec}
          onChange={(value) => setSelectedSpec(value)}
        />
        <Paragraph style={{ marginBottom: 0, textAlign: 'center' }}>
          <AntText strong>当前规格：</AntText>
          {layout.label}
          {' · '}
          <AntText strong>管束数：</AntText>
          {tubeCount}
          {' · '}
          <AntText strong>每管纤芯数：</AntText>
          {coresPerTube}
        </Paragraph>
      </Space>
      <Paragraph style={{ marginBottom: 0 }}>
        <AntText strong>交互说明：</AntText>点击任意管束或纤芯，会弹出对应序号信息。
      </Paragraph>
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <canvas ref={canvasElementRef} />
      </div>
      <Modal
        open={open}
        title="横切面编号信息"
        onCancel={() => setOpen(false)}
        onOk={() => setOpen(false)}
        okText="确定"
        cancelText="关闭"
      >
        <Paragraph style={{ marginBottom: 0 }}>{message}</Paragraph>
      </Modal>
    </div>
  )
}

export default FiberCrossSection
