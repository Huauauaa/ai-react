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
type TubeCoreLayout = {
  radius: number
  spacingX: number
  spacingY: number
}
type FiberColorBand = {
  name: string
  fill: string
  stroke: string
  labelColor?: string
}
type FiberColorLegend = {
  title: string
  description: string
  sequence: FiberColorBand[]
  indexStart?: number
}
type FiberLayout = {
  label: string
  totalCores: number
  arrangementLabel: string
  tubeRadius: number
  coreRadius: number
  coreColumns: number
  coreRows: number
  coreGridSpacingX: number
  coreGridSpacingY: number
  rings: RingLayout[]
  tubeColorSequence?: FiberColorBand[]
  coreColorSequence?: FiberColorBand[]
  colorLegends?: FiberColorLegend[]
}

const CANVAS_WIDTH = 760
const CANVAS_HEIGHT = 760
const OUTER_RADIUS = 320
const CANVAS_CENTER_X = CANVAS_WIDTH / 2
const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2

const STANDARD_COLOR_SEQUENCE: FiberColorBand[] = [
  { name: '蓝', fill: '#2563eb', stroke: '#1d4ed8', labelColor: '#ffffff' },
  { name: '橙', fill: '#f97316', stroke: '#ea580c', labelColor: '#ffffff' },
  { name: '绿', fill: '#16a34a', stroke: '#15803d', labelColor: '#ffffff' },
  { name: '棕', fill: '#92400e', stroke: '#78350f', labelColor: '#ffffff' },
  { name: '灰', fill: '#9ca3af', stroke: '#6b7280', labelColor: '#111827' },
  { name: '白', fill: '#f8fafc', stroke: '#94a3b8', labelColor: '#0f172a' },
  { name: '红', fill: '#dc2626', stroke: '#b91c1c', labelColor: '#ffffff' },
  { name: '黑', fill: '#111827', stroke: '#020617', labelColor: '#ffffff' },
  { name: '黄', fill: '#facc15', stroke: '#ca8a04', labelColor: '#111827' },
  { name: '紫', fill: '#7c3aed', stroke: '#6d28d9', labelColor: '#ffffff' },
  { name: '粉红', fill: '#ec4899', stroke: '#db2777', labelColor: '#ffffff' },
  { name: '青绿', fill: '#14b8a6', stroke: '#0f766e', labelColor: '#ffffff' },
]
const INNER_TUBE_COLOR_SEQUENCE = STANDARD_COLOR_SEQUENCE.slice(0, 9)
const OUTER_TUBE_COLOR_SEQUENCE = [
  ...STANDARD_COLOR_SEQUENCE,
  ...STANDARD_COLOR_SEQUENCE.slice(0, 3),
]
const STANDARD_COLOR_SEQUENCE_TEXT = STANDARD_COLOR_SEQUENCE.map((color) => color.name).join('、')

const DEFAULT_TUBE_COLOR: FiberColorBand = {
  name: '默认蓝',
  fill: '#dbeafe',
  stroke: '#3b82f6',
  labelColor: '#1e3a8a',
}

const DEFAULT_CORE_COLOR: FiberColorBand = {
  name: '默认黄',
  fill: '#facc15',
  stroke: '#ca8a04',
  labelColor: '#111827',
}

const FIBER_LAYOUTS: Record<FiberSpec, FiberLayout> = {
  '144': {
    label: '144 芯',
    totalCores: 144,
    arrangementLabel: '12 个管束围成单圈',
    tubeRadius: 56,
    coreRadius: 10,
    coreColumns: 4,
    coreRows: 3,
    coreGridSpacingX: 24,
    coreGridSpacingY: 24,
    rings: [{ radius: 230, tubeCount: 12 }],
    tubeColorSequence: STANDARD_COLOR_SEQUENCE,
    coreColorSequence: STANDARD_COLOR_SEQUENCE,
    colorLegends: [
      {
        title: '束管色谱',
        description: `按 ${STANDARD_COLOR_SEQUENCE_TEXT} 排列。`,
        sequence: STANDARD_COLOR_SEQUENCE,
      },
      {
        title: '纤芯色谱',
        description: `按 ${STANDARD_COLOR_SEQUENCE_TEXT} 排列。`,
        sequence: STANDARD_COLOR_SEQUENCE,
      },
    ],
  },
  '288': {
    label: '288 芯',
    totalCores: 288,
    arrangementLabel: '双圈排布：内圈 9 个，外圈 15 个',
    tubeRadius: 38,
    coreRadius: 6,
    coreColumns: 4,
    coreRows: 3,
    coreGridSpacingX: 15,
    coreGridSpacingY: 15,
    rings: [
      { radius: 150, tubeCount: 9 },
      { radius: 250, tubeCount: 15 },
    ],
    tubeColorSequence: [...INNER_TUBE_COLOR_SEQUENCE, ...OUTER_TUBE_COLOR_SEQUENCE],
    coreColorSequence: STANDARD_COLOR_SEQUENCE,
    colorLegends: [
      {
        title: '束管色谱（内圈第 1-9 管）',
        description: `依次为 ${INNER_TUBE_COLOR_SEQUENCE.map((color) => color.name).join('、')}。`,
        sequence: INNER_TUBE_COLOR_SEQUENCE,
        indexStart: 1,
      },
      {
        title: '束管色谱（外圈第 10-24 管）',
        description: `依次为 ${OUTER_TUBE_COLOR_SEQUENCE.map((color) => color.name).join('、')}。`,
        sequence: OUTER_TUBE_COLOR_SEQUENCE,
        indexStart: 10,
      },
      {
        title: '纤芯色谱',
        description: `按 ${STANDARD_COLOR_SEQUENCE_TEXT} 排列。`,
        sequence: STANDARD_COLOR_SEQUENCE,
      },
    ],
  },
}

function getTubeCount(layout: FiberLayout): number {
  return layout.rings.reduce((sum, ring) => sum + ring.tubeCount, 0)
}

function getColorBand(
  sequence: FiberColorBand[] | undefined,
  index: number,
  fallback: FiberColorBand,
): FiberColorBand {
  if (!sequence?.length) return fallback
  return sequence[(index - 1) % sequence.length]
}

function getTubeCoreLayout(layout: FiberLayout, tubeShellWidth: number): TubeCoreLayout {
  const halfGridWidth = ((layout.coreColumns - 1) * layout.coreGridSpacingX) / 2
  const halfGridHeight = ((layout.coreRows - 1) * layout.coreGridSpacingY) / 2
  const baseEnvelopeRadius = Math.hypot(halfGridWidth, halfGridHeight) + layout.coreRadius
  const tubeInnerRadius = layout.tubeRadius - tubeShellWidth
  // Keep a small visual gap so fiber cores do not touch the tube shell.
  const innerPadding = Math.max(2, layout.coreRadius * 0.25)
  const availableRadius = Math.max(0, tubeInnerRadius - innerPadding)
  const scale =
    baseEnvelopeRadius > 0
      ? Math.max(0, Math.min(1, availableRadius / baseEnvelopeRadius))
      : 1

  return {
    radius: layout.coreRadius * scale,
    spacingX: layout.coreGridSpacingX * scale,
    spacingY: layout.coreGridSpacingY * scale,
  }
}

function makeTube(
  fabricCanvas: Canvas,
  layout: FiberLayout,
  tubeIndex: number,
  globalCoreStartIndex: number,
  centerX: number,
  centerY: number,
): void {
  const tubeColor = getColorBand(layout.tubeColorSequence, tubeIndex, DEFAULT_TUBE_COLOR)
  const tubeShellWidth = Math.max(6, Math.round(layout.tubeRadius * 0.14))
  const tubeCoreLayout = getTubeCoreLayout(layout, tubeShellWidth)
  const tubeCircle = new Circle({
    left: centerX,
    top: centerY,
    radius: layout.tubeRadius,
    fill: tubeColor.fill,
    stroke: tubeColor.stroke,
    strokeWidth: 1.5,
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

  const tubeCore = new Circle({
    left: centerX,
    top: centerY,
    radius: layout.tubeRadius - tubeShellWidth,
    fill: '#ffffff',
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  })
  fabricCanvas.add(tubeCore)

  const label = new Text(String(tubeIndex), {
    left: centerX,
    top: centerY,
    fontSize: Math.max(14, layout.tubeRadius * 0.36),
    fontWeight: 'bold',
    fill: tubeColor.stroke,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  })
  fabricCanvas.add(label)

  const coreGridWidth = (layout.coreColumns - 1) * tubeCoreLayout.spacingX
  const coreGridHeight = (layout.coreRows - 1) * tubeCoreLayout.spacingY

  for (let row = 0; row < layout.coreRows; row += 1) {
    for (let col = 0; col < layout.coreColumns; col += 1) {
      const coreX = centerX - coreGridWidth / 2 + col * tubeCoreLayout.spacingX
      const coreY = centerY - coreGridHeight / 2 + row * tubeCoreLayout.spacingY
      const coreIndex = row * layout.coreColumns + col + 1
      const coreColor = getColorBand(layout.coreColorSequence, coreIndex, DEFAULT_CORE_COLOR)
      const coreCircle = new Circle({
        left: coreX,
        top: coreY,
        radius: tubeCoreLayout.radius,
        fill: coreColor.fill,
        stroke: coreColor.stroke,
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
        const tubeColor = getColorBand(
          layout.tubeColorSequence,
          target.fiberMeta.tubeIndex,
          DEFAULT_TUBE_COLOR,
        )
        setMessage(`管束序号：${target.fiberMeta.tubeIndex}，束管色谱：${tubeColor.name}`)
      } else {
        const tubeColor = getColorBand(
          layout.tubeColorSequence,
          target.fiberMeta.tubeIndex,
          DEFAULT_TUBE_COLOR,
        )
        const coreColor = getColorBand(
          layout.coreColorSequence,
          target.fiberMeta.coreIndex ?? 1,
          DEFAULT_CORE_COLOR,
        )
        setMessage(
          `管束序号：${target.fiberMeta.tubeIndex}，束管色谱：${tubeColor.name}，管束内纤芯序号：${target.fiberMeta.coreIndex}，纤芯色谱：${coreColor.name}，全局纤芯序号：${target.fiberMeta.globalCoreIndex}`,
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
          <AntText strong>排布：</AntText>
          {layout.arrangementLabel}
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
      {layout.colorLegends?.length ? (
        <Space direction="vertical" size={8} align="center">
          {layout.colorLegends.map((legend) => (
            <Space key={legend.title} direction="vertical" size={8} align="center">
              <Paragraph style={{ marginBottom: 0, textAlign: 'center' }}>
                <AntText strong>{legend.title}：</AntText>
                {legend.description}
              </Paragraph>
              <div className="flex flex-wrap justify-center gap-2">
                {legend.sequence.map((color, index) => (
                  <span
                    key={`${legend.title}-${legend.indexStart ?? 1}-${index}-${color.name}`}
                    className="rounded-full border px-3 py-1 text-sm shadow-sm"
                    style={{
                      backgroundColor: color.fill,
                      borderColor: color.stroke,
                      color: color.labelColor ?? DEFAULT_TUBE_COLOR.labelColor,
                    }}
                  >
                    {(legend.indexStart ?? 1) + index}. {color.name}
                  </span>
                ))}
              </div>
            </Space>
          ))}
        </Space>
      ) : null}
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
        <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-line' }}>{message}</Paragraph>
      </Modal>
    </div>
  )
}

export default FiberCrossSection
