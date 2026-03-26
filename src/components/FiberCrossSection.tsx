import { useEffect, useRef, useState } from 'react'
import { InputNumber, Modal, Space, Typography } from 'antd'
import { Canvas, Circle } from 'fabric'

const { Paragraph, Text: AntText } = Typography

type FiberTargetType = 'tube' | 'core'
type TemplateSpec = '144' | '288'

type FiberMeta = {
  targetType: FiberTargetType
  tubeIndex: number
  tubeSlotIndex?: number
  coreIndex?: number
  globalCoreIndex?: number
}

type FiberVisualState = {
  baseStroke: string
  baseStrokeWidth: number
}

type FiberObject = Circle & {
  fiberMeta?: FiberMeta
  fiberVisualState?: FiberVisualState
}
type RingLayout = {
  radius: number
  slotCount: number
  emptySlotIndices?: number[]
}
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
  isolationLayerMaxRadius?: number
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
const OUTER_SHEATH_THICKNESS = 24
const DEFAULT_ISOLATION_LAYER_MAX_RADIUS = 80
const CANVAS_CENTER_X = CANVAS_WIDTH / 2
const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2
const HOVER_STROKE = '#0f172a'
const SELECTED_STROKE = '#2563eb'

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
const SINGLE_RING_SLOT_COUNT = 12
const INNER_RING_SLOT_COUNT = 9
const OUTER_RING_SLOT_COUNT = 15
const DOUBLE_RING_SLOT_COUNT = INNER_RING_SLOT_COUNT + OUTER_RING_SLOT_COUNT
const CORES_PER_TUBE = STANDARD_COLOR_SEQUENCE.length
const SINGLE_RING_EMPTY_SLOT_PRIORITY = [6, 7, 8, 9, 10, 11, 12, 5, 4, 3, 2, 1] as const

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

const EMPTY_SLOT_COLOR = {
  fill: '#ffffff',
  stroke: '#cbd5e1',
}

function getRequiredTubeCount(totalCores: number, slotCount: number): number {
  if (totalCores <= 0) return 0
  return Math.min(slotCount, Math.ceil(totalCores / CORES_PER_TUBE))
}

function getSingleRingEmptySlotIndices(totalCores: number): number[] {
  const tubeCount = getRequiredTubeCount(totalCores, SINGLE_RING_SLOT_COUNT)
  const emptyCount = Math.max(0, SINGLE_RING_SLOT_COUNT - tubeCount)
  return [...SINGLE_RING_EMPTY_SLOT_PRIORITY.slice(0, emptyCount)]
}

function getSingleRingTubeLegendDescription(emptySlotIndices: number[]): string {
  if (!emptySlotIndices.length) {
    return `按 ${STANDARD_COLOR_SEQUENCE_TEXT} 排列。`
  }

  const emptySlotNames = emptySlotIndices
    .map((slotIndex) => getColorBand(STANDARD_COLOR_SEQUENCE, slotIndex, DEFAULT_TUBE_COLOR).name)
    .join('、')

  return `按 ${STANDARD_COLOR_SEQUENCE_TEXT} 管位排列，其中 ${emptySlotNames} 管位为空圆占位。`
}

function createSingleRingLayout(totalCores: number): FiberLayout {
  const tubeCount = getRequiredTubeCount(totalCores, SINGLE_RING_SLOT_COUNT)
  const emptySlotIndices = getSingleRingEmptySlotIndices(totalCores)
  const emptyCount = emptySlotIndices.length

  return {
    label: `${totalCores} 芯`,
    totalCores,
    arrangementLabel:
      emptyCount > 0
        ? `${SINGLE_RING_SLOT_COUNT} 个管位围成单圈：${tubeCount} 个管束 + ${emptyCount} 个空圆`
        : `${SINGLE_RING_SLOT_COUNT} 个管束围成单圈`,
    isolationLayerMaxRadius: 122,
    tubeRadius: 56,
    coreRadius: 10,
    coreColumns: 4,
    coreRows: 3,
    coreGridSpacingX: 24,
    coreGridSpacingY: 24,
    rings: [
      {
        radius: 228,
        slotCount: SINGLE_RING_SLOT_COUNT,
        emptySlotIndices: emptyCount > 0 ? emptySlotIndices : undefined,
      },
    ],
    tubeColorSequence: STANDARD_COLOR_SEQUENCE,
    coreColorSequence: STANDARD_COLOR_SEQUENCE,
    colorLegends: [
      {
        title: '束管色谱',
        description: getSingleRingTubeLegendDescription(emptySlotIndices),
        sequence: STANDARD_COLOR_SEQUENCE,
      },
      {
        title: '纤芯色谱',
        description: `按 ${STANDARD_COLOR_SEQUENCE_TEXT} 排列。`,
        sequence: STANDARD_COLOR_SEQUENCE,
      },
    ],
  }
}

function getDoubleRingOuterEmptySlotIndices(totalCores: number): number[] {
  const tubeCount = getRequiredTubeCount(totalCores, DOUBLE_RING_SLOT_COUNT)
  const outerTubeCount = Math.max(0, tubeCount - INNER_RING_SLOT_COUNT)
  const outerEmptyCount = Math.max(0, OUTER_RING_SLOT_COUNT - outerTubeCount)
  return Array.from({ length: outerEmptyCount }, (_, index) => outerTubeCount + index + 1)
}

function getDoubleRingOuterTubeLegendDescription(outerEmptySlotIndices: number[]): string {
  const baseDescription = `依次为 ${OUTER_TUBE_COLOR_SEQUENCE.map((color) => color.name).join('、')}。`
  if (!outerEmptySlotIndices.length) {
    return baseDescription
  }

  const emptySlotNames = outerEmptySlotIndices
    .map((slotIndex) => getColorBand(OUTER_TUBE_COLOR_SEQUENCE, slotIndex, DEFAULT_TUBE_COLOR).name)
    .join('、')

  return `${baseDescription.slice(0, -1)}，其中 ${emptySlotNames} 管位为空圆占位。`
}

function createDoubleRingLayout(totalCores: number): FiberLayout {
  const tubeCount = getRequiredTubeCount(totalCores, DOUBLE_RING_SLOT_COUNT)
  const outerEmptySlotIndices = getDoubleRingOuterEmptySlotIndices(totalCores)
  const emptyCount = outerEmptySlotIndices.length

  return {
    label: `${totalCores} 芯`,
    totalCores,
    arrangementLabel:
      emptyCount > 0
        ? `${DOUBLE_RING_SLOT_COUNT} 个管位双圈排布：${tubeCount} 个管束 + ${emptyCount} 个空圆`
        : `双圈排布：内圈 ${INNER_RING_SLOT_COUNT} 个，外圈 ${OUTER_RING_SLOT_COUNT} 个`,
    isolationLayerMaxRadius: DEFAULT_ISOLATION_LAYER_MAX_RADIUS,
    tubeRadius: 38,
    coreRadius: 6,
    coreColumns: 4,
    coreRows: 3,
    coreGridSpacingX: 15,
    coreGridSpacingY: 15,
    rings: [
      { radius: 150, slotCount: INNER_RING_SLOT_COUNT },
      {
        radius: 250,
        slotCount: OUTER_RING_SLOT_COUNT,
        emptySlotIndices: emptyCount > 0 ? outerEmptySlotIndices : undefined,
      },
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
        description: getDoubleRingOuterTubeLegendDescription(outerEmptySlotIndices),
        sequence: OUTER_TUBE_COLOR_SEQUENCE,
        indexStart: 10,
      },
      {
        title: '纤芯色谱',
        description: `按 ${STANDARD_COLOR_SEQUENCE_TEXT} 排列。`,
        sequence: STANDARD_COLOR_SEQUENCE,
      },
    ],
  }
}

function resolveLayout(totalCores: number): FiberLayout | null {
  if (totalCores <= 144) return createSingleRingLayout(totalCores)
  if (totalCores > 144 && totalCores < 288) return createDoubleRingLayout(totalCores)
  return null
}

function resolveTemplateSpec(totalCores: number): TemplateSpec | null {
  if (totalCores <= 144) return '144'
  if (totalCores > 144 && totalCores < 288) return '288'
  return null
}

function getTubeCount(layout: FiberLayout): number {
  return layout.rings.reduce(
    (sum, ring) => sum + ring.slotCount - (ring.emptySlotIndices?.length ?? 0),
    0,
  )
}

function isEmptySlot(ring: RingLayout, slotIndex: number): boolean {
  return ring.emptySlotIndices?.includes(slotIndex) ?? false
}

function getTubeSlotCount(layout: FiberLayout): number {
  return layout.rings.reduce((sum, ring) => sum + ring.slotCount, 0)
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

function getIsolationLayerRadius(layout: FiberLayout): number {
  const innermostRingRadius = layout.rings[0]?.radius ?? 0
  const availableRadius = innermostRingRadius - layout.tubeRadius - 24
  const isolationLayerMaxRadius =
    layout.isolationLayerMaxRadius ?? DEFAULT_ISOLATION_LAYER_MAX_RADIUS

  return Math.max(0, Math.min(isolationLayerMaxRadius, availableRadius))
}

function setFiberVisualState(
  fiberObject: FiberObject,
  emphasis: 'default' | 'hover' | 'selected',
): void {
  const baseStroke = fiberObject.fiberVisualState?.baseStroke ?? '#334155'
  const baseStrokeWidth = fiberObject.fiberVisualState?.baseStrokeWidth ?? 1.5

  if (emphasis === 'selected') {
    fiberObject.set({
      stroke: SELECTED_STROKE,
      strokeWidth: baseStrokeWidth + 3,
      scaleX: 1.08,
      scaleY: 1.08,
      shadow: 'rgba(37, 99, 235, 0.32) 0px 0px 16px',
    })
    return
  }

  if (emphasis === 'hover') {
    fiberObject.set({
      stroke: HOVER_STROKE,
      strokeWidth: baseStrokeWidth + 1.5,
      scaleX: 1.04,
      scaleY: 1.04,
      shadow: 'rgba(15, 23, 42, 0.18) 0px 0px 10px',
    })
    return
  }

  fiberObject.set({
    stroke: baseStroke,
    strokeWidth: baseStrokeWidth,
    scaleX: 1,
    scaleY: 1,
    shadow: undefined,
  })
}

function makeTube(
  fabricCanvas: Canvas,
  layout: FiberLayout,
  tubeIndex: number,
  tubeSlotIndex: number,
  globalCoreStartIndex: number,
  centerX: number,
  centerY: number,
): void {
  const tubeColor = getColorBand(layout.tubeColorSequence, tubeSlotIndex, DEFAULT_TUBE_COLOR)
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
    selectable: false,
    hasControls: false,
    hasBorders: false,
    lockMovementX: true,
    lockMovementY: true,
    hoverCursor: 'pointer',
  }) as FiberObject

  tubeCircle.fiberMeta = {
    targetType: 'tube',
    tubeIndex,
    tubeSlotIndex,
  }
  tubeCircle.fiberVisualState = {
    baseStroke: tubeColor.stroke,
    baseStrokeWidth: 1.5,
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
        selectable: false,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
        hoverCursor: 'pointer',
      }) as FiberObject

      coreCircle.fiberMeta = {
        targetType: 'core',
        tubeIndex,
        tubeSlotIndex,
        coreIndex,
        globalCoreIndex: globalCoreStartIndex + coreIndex - 1,
      }
      coreCircle.fiberVisualState = {
        baseStroke: coreColor.stroke,
        baseStrokeWidth: 1.5,
      }
      fabricCanvas.add(coreCircle)
    }
  }
}

function makeEmptyTube(fabricCanvas: Canvas, layout: FiberLayout, centerX: number, centerY: number): void {
  const emptyCircle = new Circle({
    left: centerX,
    top: centerY,
    radius: layout.tubeRadius,
    fill: EMPTY_SLOT_COLOR.fill,
    stroke: EMPTY_SLOT_COLOR.stroke,
    strokeWidth: 2,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  })
  fabricCanvas.add(emptyCircle)
}

function FiberCrossSection() {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null)
  const [coreCountInput, setCoreCountInput] = useState<number>(144)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const selectedTemplateSpec = resolveTemplateSpec(coreCountInput)
  const layout = resolveLayout(coreCountInput)
  const tubeCount = layout ? getTubeCount(layout) : 0
  const tubeSlotCount = layout ? getTubeSlotCount(layout) : 0
  const coresPerTube = layout ? layout.coreColumns * layout.coreRows : 0

  useEffect(() => {
    const canvasElement = canvasElementRef.current
    if (!canvasElement) return
    if (!layout) {
      const context = canvasElement.getContext('2d')
      context?.clearRect(0, 0, canvasElement.width, canvasElement.height)
      return
    }

    const fabricCanvas = new Canvas(canvasElement, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#f8fafc',
      selection: false,
    })

    const outerSheath = new Circle({
      left: CANVAS_CENTER_X,
      top: CANVAS_CENTER_Y,
      radius: OUTER_RADIUS,
      fill: '#334155',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    })
    fabricCanvas.add(outerSheath)

    const innerCableBody = new Circle({
      left: CANVAS_CENTER_X,
      top: CANVAS_CENTER_Y,
      radius: OUTER_RADIUS - OUTER_SHEATH_THICKNESS,
      fill: '#ffffff',
      stroke: '#cbd5e1',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    })
    fabricCanvas.add(innerCableBody)

    const isolationLayer = new Circle({
      left: CANVAS_CENTER_X,
      top: CANVAS_CENTER_Y,
      radius: getIsolationLayerRadius(layout),
      fill: '#9ca3af',
      stroke: '#6b7280',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    })
    fabricCanvas.add(isolationLayer)

    let tubeSlotIndex = 1
    let actualTubeIndex = 1
    let globalCoreStartIndex = 1

    for (const ring of layout.rings) {
      for (let i = 0; i < ring.slotCount; i += 1) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * i) / ring.slotCount
        const centerX = CANVAS_CENTER_X + ring.radius * Math.cos(angle)
        const centerY = CANVAS_CENTER_Y + ring.radius * Math.sin(angle)
        if (isEmptySlot(ring, i + 1)) {
          makeEmptyTube(fabricCanvas, layout, centerX, centerY)
        } else {
          makeTube(
            fabricCanvas,
            layout,
            actualTubeIndex,
            tubeSlotIndex,
            globalCoreStartIndex,
            centerX,
            centerY,
          )
          actualTubeIndex += 1
          globalCoreStartIndex += coresPerTube
        }
        tubeSlotIndex += 1
      }
    }

    let hoveredFiber: FiberObject | null = null
    let selectedFiber: FiberObject | null = null

    const syncFiberVisualState = (fiber: FiberObject | null) => {
      if (!fiber?.fiberMeta) return

      if (fiber === selectedFiber) {
        setFiberVisualState(fiber, 'selected')
        return
      }

      if (fiber === hoveredFiber) {
        setFiberVisualState(fiber, 'hover')
        return
      }

      setFiberVisualState(fiber, 'default')
    }

    const updateHoveredFiber = (nextFiber: FiberObject | null) => {
      if (hoveredFiber === nextFiber) return

      const previousFiber = hoveredFiber
      hoveredFiber = nextFiber
      syncFiberVisualState(previousFiber)
      syncFiberVisualState(hoveredFiber)
      fabricCanvas.requestRenderAll()
    }

    const updateSelectedFiber = (nextFiber: FiberObject | null) => {
      if (selectedFiber === nextFiber) return

      const previousFiber = selectedFiber
      selectedFiber = nextFiber
      syncFiberVisualState(previousFiber)
      syncFiberVisualState(selectedFiber)
      fabricCanvas.requestRenderAll()
    }

    fabricCanvas.on('mouse:over', (event) => {
      const target = event.target as FiberObject | undefined
      updateHoveredFiber(target?.fiberMeta ? target : null)
    })

    fabricCanvas.on('mouse:out', (event) => {
      const target = event.target as FiberObject | undefined
      if (target && hoveredFiber !== target) return
      updateHoveredFiber(null)
    })

    fabricCanvas.on('mouse:down', (event) => {
      const target = event.target as FiberObject | undefined
      if (!target?.fiberMeta) {
        updateSelectedFiber(null)
        return
      }

      updateSelectedFiber(target)

      const tubeColorIndex = target.fiberMeta.tubeSlotIndex ?? target.fiberMeta.tubeIndex
      if (target.fiberMeta.targetType === 'tube') {
        const tubeColor = getColorBand(
          layout.tubeColorSequence,
          tubeColorIndex,
          DEFAULT_TUBE_COLOR,
        )
        setMessage(
          target.fiberMeta.tubeSlotIndex && target.fiberMeta.tubeSlotIndex !== target.fiberMeta.tubeIndex
            ? `管束序号：${target.fiberMeta.tubeIndex}，管位序号：${target.fiberMeta.tubeSlotIndex}，束管色谱：${tubeColor.name}`
            : `管束序号：${target.fiberMeta.tubeIndex}，束管色谱：${tubeColor.name}`,
        )
      } else {
        const tubeColor = getColorBand(
          layout.tubeColorSequence,
          tubeColorIndex,
          DEFAULT_TUBE_COLOR,
        )
        const coreColor = getColorBand(
          layout.coreColorSequence,
          target.fiberMeta.coreIndex ?? 1,
          DEFAULT_CORE_COLOR,
        )
        setMessage(
          target.fiberMeta.tubeSlotIndex && target.fiberMeta.tubeSlotIndex !== target.fiberMeta.tubeIndex
            ? `管束序号：${target.fiberMeta.tubeIndex}，管位序号：${target.fiberMeta.tubeSlotIndex}，束管色谱：${tubeColor.name}，管束内纤芯序号：${target.fiberMeta.coreIndex}，纤芯色谱：${coreColor.name}，全局纤芯序号：${target.fiberMeta.globalCoreIndex}`
            : `管束序号：${target.fiberMeta.tubeIndex}，束管色谱：${tubeColor.name}，管束内纤芯序号：${target.fiberMeta.coreIndex}，纤芯色谱：${coreColor.name}，全局纤芯序号：${target.fiberMeta.globalCoreIndex}`,
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
        <InputNumber
          value={coreCountInput}
          min={0}
          precision={0}
          onChange={(value) => {
            if (typeof value !== 'number') return
            setCoreCountInput(Math.max(0, Math.floor(value)))
          }}
          style={{ minWidth: 240 }}
        />
        <Paragraph style={{ marginBottom: 0, textAlign: 'center' }}>
          <AntText strong>输入芯数：</AntText>
          {coreCountInput}
          {' · '}
          <AntText strong>模板匹配：</AntText>
          {selectedTemplateSpec ? `${layout?.label} 模板` : '不处理（芯数 ≥ 288）'}
          {layout ? (
            <>
              {' · '}
              <AntText strong>当前规格：</AntText>
              {layout.label}
              {' · '}
              <AntText strong>排布：</AntText>
              {layout.arrangementLabel}
              {' · '}
              <AntText strong>管束数：</AntText>
              {tubeCount}
              {' · '}
              <AntText strong>管位数：</AntText>
              {tubeSlotCount}
              {' · '}
              <AntText strong>每管纤芯数：</AntText>
              {coresPerTube}
            </>
          ) : null}
        </Paragraph>
      </Space>
      {layout ? (
        <>
          <Paragraph style={{ marginBottom: 0 }}>
            <AntText strong>交互说明：</AntText>悬停任意管束或纤芯可查看激活高亮，点击后会保留选中样式并弹出对应序号信息。
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
            <canvas ref={canvasElementRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
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
        </>
      ) : (
        <Paragraph style={{ marginBottom: 0, textAlign: 'center' }}>
          <AntText type="warning">当前芯数大于等于 288，不进行模板渲染。</AntText>
        </Paragraph>
      )}
    </div>
  )
}

export default FiberCrossSection
