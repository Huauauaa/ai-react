import { useEffect, useMemo, useRef } from 'react'
import { fabric } from 'fabric'

const { Canvas, Circle } = fabric


type FiberTargetType = 'tube' | 'core'
type TemplateSpec = '144' | '288'
export type FiberCoreColorMap = Record<string, string>
type FiberCaseCore = {
  position: string
  color: string
}
type FiberCaseData = {
  type: string
  cores?: FiberCaseCore[]
}
type FiberCrossSectionProps = {
  coreColorMap?: FiberCoreColorMap
  caseData?: FiberCaseData
}

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

type FiberObject = fabric.Circle & {
  fiberMeta?: FiberMeta
  fiberVisualState?: FiberVisualState
}
type RingLayout = {
  radius: number
  slotCount: number
  startAngleRad?: number
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
type FiberLayout = {
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
const SINGLE_RING_SLOT_COUNT = 12
const INNER_RING_SLOT_COUNT = 9
const OUTER_RING_SLOT_COUNT = 15
const DOUBLE_RING_SLOT_COUNT = INNER_RING_SLOT_COUNT + OUTER_RING_SLOT_COUNT
const CORES_PER_TUBE = STANDARD_COLOR_SEQUENCE.length
const SINGLE_RING_EMPTY_SLOT_PRIORITY = [6, 7, 8, 9, 10, 11, 12, 5, 4, 3, 2, 1] as const
const SINGLE_RING_START_ANGLE_RAD = (-5 * Math.PI) / 6 // 10 o'clock
const DOUBLE_RING_INNER_START_ANGLE_RAD = -Math.PI / 3 // 1 o'clock
const DOUBLE_RING_OUTER_START_ANGLE_RAD = Math.PI / 6 // 4 o'clock

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
const CORE_COLOR_ALIAS_MAP: Record<string, FiberColorBand> = {
  蓝: STANDARD_COLOR_SEQUENCE[0],
  橙: STANDARD_COLOR_SEQUENCE[1],
  绿: STANDARD_COLOR_SEQUENCE[2],
  棕: STANDARD_COLOR_SEQUENCE[3],
  灰: STANDARD_COLOR_SEQUENCE[4],
  白: STANDARD_COLOR_SEQUENCE[5],
  红: STANDARD_COLOR_SEQUENCE[6],
  黑: STANDARD_COLOR_SEQUENCE[7],
  黄: STANDARD_COLOR_SEQUENCE[8],
  紫: STANDARD_COLOR_SEQUENCE[9],
  粉红: STANDARD_COLOR_SEQUENCE[10],
  青绿: STANDARD_COLOR_SEQUENCE[11],
}

function getRequiredTubeCount(totalCores: number, slotCount: number): number {
  if (totalCores <= 0) return 0
  return Math.min(slotCount, Math.ceil(totalCores / CORES_PER_TUBE))
}

function getSequentialEmptySlotIndices(slotCount: number, filledSlotCount: number): number[] {
  const emptyCount = Math.max(0, slotCount - filledSlotCount)
  return Array.from({ length: emptyCount }, (_, index) => filledSlotCount + index + 1)
}

function getSingleRingEmptySlotIndices(totalCores: number): number[] {
  const tubeCount = getRequiredTubeCount(totalCores, SINGLE_RING_SLOT_COUNT)
  const emptyCount = Math.max(0, SINGLE_RING_SLOT_COUNT - tubeCount)
  return [...SINGLE_RING_EMPTY_SLOT_PRIORITY.slice(0, emptyCount)]
}

function createSingleRingLayout(totalCores: number): FiberLayout {
  const emptySlotIndices = getSingleRingEmptySlotIndices(totalCores)
  const emptyCount = emptySlotIndices.length

  return {
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
        startAngleRad: SINGLE_RING_START_ANGLE_RAD,
        emptySlotIndices: emptyCount > 0 ? emptySlotIndices : undefined,
      },
    ],
    tubeColorSequence: STANDARD_COLOR_SEQUENCE,
    coreColorSequence: STANDARD_COLOR_SEQUENCE,
  }
}

function getDoubleRingSlotOccupancy(totalCores: number): {
  tubeCount: number
  innerEmptySlotIndices: number[]
  outerEmptySlotIndices: number[]
} {
  const tubeCount = getRequiredTubeCount(totalCores, DOUBLE_RING_SLOT_COUNT)
  const innerTubeCount = Math.min(INNER_RING_SLOT_COUNT, tubeCount)
  const outerTubeCount = Math.max(0, tubeCount - INNER_RING_SLOT_COUNT)

  return {
    tubeCount,
    innerEmptySlotIndices: getSequentialEmptySlotIndices(INNER_RING_SLOT_COUNT, innerTubeCount),
    outerEmptySlotIndices: getSequentialEmptySlotIndices(OUTER_RING_SLOT_COUNT, outerTubeCount),
  }
}

function createDoubleRingLayout(totalCores: number): FiberLayout {
  const { innerEmptySlotIndices, outerEmptySlotIndices } = getDoubleRingSlotOccupancy(totalCores)
  const emptyCount = innerEmptySlotIndices.length + outerEmptySlotIndices.length

  return {
    isolationLayerMaxRadius: DEFAULT_ISOLATION_LAYER_MAX_RADIUS,
    tubeRadius: 38,
    coreRadius: 6,
    coreColumns: 4,
    coreRows: 3,
    coreGridSpacingX: 15,
    coreGridSpacingY: 15,
    rings: [
      {
        radius: 150,
        slotCount: INNER_RING_SLOT_COUNT,
        startAngleRad: DOUBLE_RING_INNER_START_ANGLE_RAD,
        emptySlotIndices: innerEmptySlotIndices.length ? innerEmptySlotIndices : undefined,
      },
      {
        radius: 250,
        slotCount: OUTER_RING_SLOT_COUNT,
        startAngleRad: DOUBLE_RING_OUTER_START_ANGLE_RAD,
        emptySlotIndices: emptyCount > 0 ? outerEmptySlotIndices : undefined,
      },
    ],
    tubeColorSequence: [...INNER_TUBE_COLOR_SEQUENCE, ...OUTER_TUBE_COLOR_SEQUENCE],
    coreColorSequence: STANDARD_COLOR_SEQUENCE,
  }
}

function resolveTemplateSpec(totalCores: number): TemplateSpec | null {
  if (totalCores <= 144) return '144'
  if (totalCores > 144 && totalCores <= 288) return '288'
  return null
}

function resolveLayout(totalCores: number, selectedTemplateSpec: TemplateSpec | null): FiberLayout | null {
  if (selectedTemplateSpec === '144') return createSingleRingLayout(totalCores)
  if (selectedTemplateSpec === '288') return createDoubleRingLayout(totalCores)
  return null
}

function isEmptySlot(ring: RingLayout, slotIndex: number): boolean {
  return ring.emptySlotIndices?.includes(slotIndex) ?? false
}

function getColorBand(
  sequence: FiberColorBand[] | undefined,
  index: number,
  fallback: FiberColorBand,
): FiberColorBand {
  if (!sequence?.length) return fallback
  return sequence[(index - 1) % sequence.length]
}

function normalizeColorToken(colorInput: string): string {
  return colorInput.trim().toLowerCase().replace(/\s+/g, '')
}

function parseFiberCorePositionKey(positionKey: string): { tubeIndex: number; coreIndex: number } | null {
  const matched = positionKey.trim().match(/^(\d+)\s*-\s*(\d+)$/)
  if (!matched) return null

  const tubeIndex = Number(matched[1])
  const coreIndex = Number(matched[2])
  if (!Number.isInteger(tubeIndex) || !Number.isInteger(coreIndex)) return null
  if (tubeIndex <= 0 || coreIndex <= 0) return null

  return { tubeIndex, coreIndex }
}

function resolveCustomCoreColorBand(colorInput: string): FiberColorBand | null {
  const token = normalizeColorToken(colorInput)
  const aliasColorBand = CORE_COLOR_ALIAS_MAP[token]
  if (aliasColorBand) return aliasColorBand

  const cssColor = colorInput.trim()
  const isCssColor =
    /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(cssColor) ||
    /^rgba?\(/i.test(cssColor) ||
    /^hsla?\(/i.test(cssColor)

  if (!isCssColor) return null

  return {
    name: cssColor,
    fill: cssColor,
    stroke: '#334155',
    labelColor: '#ffffff',
  }
}

function resolveCoreColorMap(coreColorMap: FiberCoreColorMap | undefined): Map<string, FiberColorBand> {
  const resolvedCoreColorMap = new Map<string, FiberColorBand>()
  if (!coreColorMap) return resolvedCoreColorMap

  for (const [positionKey, colorInput] of Object.entries(coreColorMap)) {
    const position = parseFiberCorePositionKey(positionKey)
    if (!position) continue

    const colorBand = resolveCustomCoreColorBand(colorInput)
    if (!colorBand) continue

    resolvedCoreColorMap.set(`${position.tubeIndex}-${position.coreIndex}`, colorBand)
  }

  return resolvedCoreColorMap
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
  fabricCanvas: fabric.Canvas,
  layout: FiberLayout,
  tubeIndex: number,
  tubeSlotIndex: number,
  globalCoreStartIndex: number,
  centerX: number,
  centerY: number,
  useCustomCoreColorMap: boolean,
  customCoreColorMap: Map<string, FiberColorBand>,
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
      const customCoreColor = customCoreColorMap.get(`${tubeIndex}-${coreIndex}`)
      if (useCustomCoreColorMap && !customCoreColor) {
        continue
      }
      const coreColor = customCoreColor ?? getColorBand(layout.coreColorSequence, coreIndex, DEFAULT_CORE_COLOR)
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

function makeEmptyTube(
  fabricCanvas: fabric.Canvas,
  layout: FiberLayout,
  centerX: number,
  centerY: number,
): void {
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

function FiberCrossSection({ coreColorMap, caseData }: FiberCrossSectionProps) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null)
  const coreCountInput = caseData ? (caseData.type === '288' ? 288 : 144) : 144
  const effectiveCoreColorMap = useMemo(() => {
    if (!caseData) return coreColorMap
    const caseCoreColorMap: FiberCoreColorMap = {}
    for (const core of caseData.cores ?? []) {
      caseCoreColorMap[core.position] = core.color
    }
    return caseCoreColorMap
  }, [caseData, coreColorMap])
  const useCustomCoreColorMap = effectiveCoreColorMap !== undefined
  const resolvedCoreColorMap = useMemo(
    () => resolveCoreColorMap(effectiveCoreColorMap),
    [effectiveCoreColorMap],
  )
  const caseTubeIndices = useMemo(() => {
    if (!caseData) return null
    const indices = new Set<number>()
    for (const [positionKey] of Object.entries(effectiveCoreColorMap ?? {})) {
      const position = parseFiberCorePositionKey(positionKey)
      if (!position) continue
      indices.add(position.tubeIndex)
    }
    return indices
  }, [caseData, effectiveCoreColorMap])
  const selectedTemplateSpec = caseData
    ? caseData.type === '288'
      ? '288'
      : caseData.type === '144'
        ? '144'
        : null
    : resolveTemplateSpec(coreCountInput)
  const layout = caseData
    ? selectedTemplateSpec === '144'
      ? createSingleRingLayout(144)
      : selectedTemplateSpec === '288'
        ? createDoubleRingLayout(288)
        : null
    : resolveLayout(coreCountInput, selectedTemplateSpec)
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
        const startAngle = ring.startAngleRad ?? -Math.PI / 2
        const angle = startAngle + (Math.PI * 2 * i) / ring.slotCount
        const centerX = CANVAS_CENTER_X + ring.radius * Math.cos(angle)
        const centerY = CANVAS_CENTER_Y + ring.radius * Math.sin(angle)
        if (isEmptySlot(ring, i + 1)) {
          makeEmptyTube(fabricCanvas, layout, centerX, centerY)
        } else {
          const hasCaseTubeData = caseTubeIndices?.has(tubeSlotIndex) ?? true
          if (hasCaseTubeData) {
            makeTube(
              fabricCanvas,
              layout,
              actualTubeIndex,
              tubeSlotIndex,
              globalCoreStartIndex,
              centerX,
              centerY,
              useCustomCoreColorMap,
              resolvedCoreColorMap,
            )
          } else {
            makeEmptyTube(fabricCanvas, layout, centerX, centerY)
          }
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
        console.log(
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
        const customCoreColor =
          target.fiberMeta.coreIndex !== undefined
            ? resolvedCoreColorMap.get(`${target.fiberMeta.tubeIndex}-${target.fiberMeta.coreIndex}`)
            : null
        const finalCoreColor = customCoreColor ?? coreColor
        console.log(
          target.fiberMeta.tubeSlotIndex && target.fiberMeta.tubeSlotIndex !== target.fiberMeta.tubeIndex
            ? `管束序号：${target.fiberMeta.tubeIndex}，管位序号：${target.fiberMeta.tubeSlotIndex}，束管色谱：${tubeColor.name}，管束内纤芯序号：${target.fiberMeta.coreIndex}，纤芯色谱：${finalCoreColor.name}，全局纤芯序号：${target.fiberMeta.globalCoreIndex}`
            : `管束序号：${target.fiberMeta.tubeIndex}，束管色谱：${tubeColor.name}，管束内纤芯序号：${target.fiberMeta.coreIndex}，纤芯色谱：${finalCoreColor.name}，全局纤芯序号：${target.fiberMeta.globalCoreIndex}`,
        )
      }
    })

    fabricCanvas.renderAll()
    return () => {
      fabricCanvas.dispose()
    }
  }, [
    coresPerTube,
    layout,
    resolvedCoreColorMap,
    useCustomCoreColorMap,
  ])

  if (!layout) return null

  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <canvas ref={canvasElementRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
    </div>
  )
}

export default FiberCrossSection
