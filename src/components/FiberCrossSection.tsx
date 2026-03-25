import { useEffect, useRef, useState } from 'react'
import { Modal, Typography } from 'antd'
import { Canvas, Circle, Text } from 'fabric'

const { Paragraph, Text: AntText } = Typography

type FiberTargetType = 'tube' | 'core'

type FiberMeta = {
  targetType: FiberTargetType
  tubeIndex: number
  coreIndex?: number
}

type FiberObject = Circle & { fiberMeta?: FiberMeta }

const CANVAS_WIDTH = 700
const CANVAS_HEIGHT = 700
const OUTER_RADIUS = 300
const TUBE_RADIUS = 75
const CORE_RADIUS = 15
const ORBIT_TUBE_COUNT = 6
const ORBIT_RADIUS = 190
const CORE_COLUMNS = 4
const CORE_ROWS = 3
const CORE_GRID_SPACING_X = 30
const CORE_GRID_SPACING_Y = 30

function makeTube(
  fabricCanvas: Canvas,
  tubeIndex: number,
  centerX: number,
  centerY: number,
): void {
  const tubeCircle = new Circle({
    left: centerX,
    top: centerY,
    radius: TUBE_RADIUS,
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
    top: centerY - TUBE_RADIUS - 20,
    fontSize: 18,
    fontWeight: 'bold',
    fill: '#1d4ed8',
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  })
  fabricCanvas.add(label)

  const coreGridWidth = (CORE_COLUMNS - 1) * CORE_GRID_SPACING_X
  const coreGridHeight = (CORE_ROWS - 1) * CORE_GRID_SPACING_Y

  for (let row = 0; row < CORE_ROWS; row += 1) {
    for (let col = 0; col < CORE_COLUMNS; col += 1) {
      const coreX = centerX - coreGridWidth / 2 + col * CORE_GRID_SPACING_X
      const coreY = centerY - coreGridHeight / 2 + row * CORE_GRID_SPACING_Y
      const coreCircle = new Circle({
        left: coreX,
        top: coreY,
        radius: CORE_RADIUS,
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
        coreIndex: row * CORE_COLUMNS + col + 1,
      }
      fabricCanvas.add(coreCircle)
    }
  }
}

function FiberCrossSection() {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!canvasElementRef.current) return

    const fabricCanvas = new Canvas(canvasElementRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#f8fafc',
      selection: false,
    })

    const outerRing = new Circle({
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2,
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

    for (let i = 0; i < ORBIT_TUBE_COUNT; i += 1) {
      const angle = (Math.PI * 2 * i) / ORBIT_TUBE_COUNT
      const centerX = CANVAS_WIDTH / 2 + ORBIT_RADIUS * Math.cos(angle)
      const centerY = CANVAS_HEIGHT / 2 + ORBIT_RADIUS * Math.sin(angle)
      makeTube(fabricCanvas, i + 1, centerX, centerY)
    }
    makeTube(fabricCanvas, 7, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)

    fabricCanvas.on('mouse:down', (event) => {
      const target = event.target as FiberObject | undefined
      if (!target?.fiberMeta) return

      if (target.fiberMeta.targetType === 'tube') {
        setMessage(`管束序号：${target.fiberMeta.tubeIndex}`)
      } else {
        setMessage(`管束序号：${target.fiberMeta.tubeIndex}，纤芯序号：${target.fiberMeta.coreIndex}`)
      }
      setOpen(true)
    })

    fabricCanvas.renderAll()
    return () => {
      fabricCanvas.dispose()
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
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
