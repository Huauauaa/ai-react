/* eslint-disable react-refresh/only-export-components -- 导出布局工具与演示常量 */
import Konva from 'konva'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'

/** 六格布局：左整列 | 中上 | 中下 | 中上 | 中下 | 右整列（四列等宽，中间两列各上下两半） */
export function computeTiledPhotoLayouts(
  width: number,
  height: number,
  gap = 2,
): { x: number; y: number; w: number; h: number }[] {
  const cols = 4
  const cellW = (width - gap * (cols - 1)) / cols
  const rowH = (height - gap) / 2
  const step = cellW + gap

  return [
    { x: 0, y: 0, w: cellW, h: height },
    { x: step, y: 0, w: cellW, h: rowH },
    { x: step, y: rowH + gap, w: cellW, h: rowH },
    { x: 2 * step, y: 0, w: cellW, h: rowH },
    { x: 2 * step, y: rowH + gap, w: cellW, h: rowH },
    { x: 3 * step, y: 0, w: cellW, h: height },
  ]
}

function coverImageRect(
  img: HTMLImageElement,
  cw: number,
  ch: number,
): { x: number; y: number; width: number; height: number } {
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (!iw || !ih) return { x: 0, y: 0, width: cw, height: ch }
  const scale = Math.max(cw / iw, ch / ih)
  const w = iw * scale
  const h = ih * scale
  return { x: (cw - w) / 2, y: (ch - h) / 2, width: w, height: h }
}

function useLoadedImages(urls: readonly string[]) {
  const key = urls.join('\0')
  const [images, setImages] = useState<(HTMLImageElement | null)[]>(() =>
    Array.from({ length: urls.length }, () => null),
  )

  useEffect(() => {
    let cancelled = false
    // 切换 URL 列表时先清空，避免旧图与新 key 短暂错位
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 与异步 load 成对使用
    setImages(Array.from({ length: urls.length }, () => null))

    void Promise.all(
      urls.map(
        (src) =>
          new Promise<HTMLImageElement | null>((resolve) => {
            const img = new window.Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = () => resolve(null)
            img.src = src
          }),
      ),
    ).then((loaded) => {
      if (!cancelled) setImages(loaded)
    })

    return () => {
      cancelled = true
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- key = urls.join('\0')

  return images
}

export type KonvaTiledPhotoGridProps = {
  width: number
  height: number
  /**
   * 6 张图 URL，顺序：左整列 → 中左列上 → 中左列下 → 中右列上 → 中右列下 → 右整列
   */
  imageSources: readonly string[] | string[]
  /** 列间距（像素），默认 2 */
  gap?: number
  /** 受控：当前选中的格子索引，null 表示无选中 */
  activeIndex?: number | null
  /** 非受控初始选中 */
  defaultActiveIndex?: number | null
  onActiveChange?: (index: number | null) => void
  onCellClick?: (index: number) => void
  className?: string
  style?: CSSProperties
}

const COLORS = {
  border: '#1e3a5f',
  hoverBorder: '#38bdf8',
  activeBorder: '#f59e0b',
  hoverTint: 'rgba(255,255,255,0.14)',
  activeGlow: 'rgba(245, 158, 11, 0.35)',
} as const

type Layout = { x: number; y: number; w: number; h: number }

type CellNodes = {
  layout: Layout
  root: Konva.Group
  kImage: Konva.Image
  placeholder: Konva.Rect
  overlay: Konva.Rect
  border: Konva.Rect
  /** 整格透明命中层：子节点均 listening:false 时 Group 无法命中，hover 不会触发 */
  hitArea: Konva.Rect
}

function applyCellVisual(cell: CellNodes, hovered: boolean, active: boolean) {
  const strokeWidth = active ? 3 : hovered ? 2.5 : 1.5
  const stroke = active ? COLORS.activeBorder : hovered ? COLORS.hoverBorder : COLORS.border

  cell.border.setAttrs({
    stroke,
    strokeWidth,
    shadowBlur: active ? 14 : hovered ? 8 : 0,
    shadowColor: active ? COLORS.activeBorder : COLORS.hoverBorder,
    shadowOpacity: active ? 0.5 : hovered ? 0.28 : 0,
  })

  if (hovered || active) {
    cell.overlay.visible(true)
    cell.overlay.fill(active ? COLORS.activeGlow : COLORS.hoverTint)
  } else {
    cell.overlay.visible(false)
  }
}

function syncCellImage(cell: CellNodes, img: HTMLImageElement | null) {
  const l = cell.layout
  if (img) {
    const cover = coverImageRect(img, l.w, l.h)
    cell.kImage.setAttrs({
      image: img,
      ...cover,
      visible: true,
    })
    cell.placeholder.visible(false)
  } else {
    cell.kImage.visible(false)
    cell.placeholder.visible(true)
  }
}

export function KonvaTiledPhotoGrid({
  width,
  height,
  imageSources,
  gap = 2,
  activeIndex: activeIndexProp,
  defaultActiveIndex = null,
  onActiveChange,
  onCellClick,
  className,
  style,
}: KonvaTiledPhotoGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cellsRef = useRef<CellNodes[] | null>(null)
  const layerRef = useRef<Konva.Layer | null>(null)

  const activeIndexRef = useRef<number | null>(null)
  const hoverIndexRef = useRef<number | null>(null)
  const interactionRef = useRef<{
    isControlled: boolean
    onActiveChange?: (index: number | null) => void
    setUncontrolled: (n: number | null) => void
  }>({
    isControlled: false,
    setUncontrolled: () => {},
  })
  const onCellClickRef = useRef(onCellClick)

  const normalizedSources = useMemo(() => {
    const list = [...imageSources]
    while (list.length < 6) list.push('')
    return list.slice(0, 6) as string[]
  }, [imageSources])

  const images = useLoadedImages(normalizedSources)

  const imagesRef = useRef<(HTMLImageElement | null)[]>(images)

  const [uncontrolledActive, setUncontrolledActive] = useState<number | null>(defaultActiveIndex)
  const isControlled = activeIndexProp !== undefined
  const activeIndex: number | null = isControlled ? (activeIndexProp ?? null) : uncontrolledActive

  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  useLayoutEffect(() => {
    activeIndexRef.current = activeIndex
    hoverIndexRef.current = hoverIndex
    imagesRef.current = images
    onCellClickRef.current = onCellClick
    interactionRef.current = {
      isControlled,
      onActiveChange,
      setUncontrolled: setUncontrolledActive,
    }
  }, [
    activeIndex,
    hoverIndex,
    images,
    onCellClick,
    isControlled,
    onActiveChange,
  ])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const cellLayouts = computeTiledPhotoLayouts(width, height, gap)
    const imageStub = document.createElement('canvas')
    imageStub.width = 1
    imageStub.height = 1

    const stage = new Konva.Stage({
      container: el,
      width,
      height,
    })
    const layer = new Konva.Layer()
    stage.add(layer)
    layerRef.current = layer

    const cells: CellNodes[] = []

    cellLayouts.forEach((l, i) => {
      const root = new Konva.Group({ x: l.x, y: l.y })

      const clipGroup = new Konva.Group({
        clipFunc(ctx) {
          ctx.beginPath()
          ctx.rect(0, 0, l.w, l.h)
        },
      })

      const placeholder = new Konva.Rect({
        x: 0,
        y: 0,
        width: l.w,
        height: l.h,
        fill: '#3b82c4',
        listening: false,
      })

      const kImage = new Konva.Image({
        image: imageStub,
        listening: false,
        visible: false,
      })

      const overlay = new Konva.Rect({
        x: 0,
        y: 0,
        width: l.w,
        height: l.h,
        listening: false,
        visible: false,
      })

      const border = new Konva.Rect({
        x: 0,
        y: 0,
        width: l.w,
        height: l.h,
        stroke: COLORS.border,
        strokeWidth: 1.5,
        fillEnabled: false,
        listening: false,
      })

      const hitArea = new Konva.Rect({
        x: 0,
        y: 0,
        width: l.w,
        height: l.h,
        fill: 'rgba(0,0,0,0.001)',
        listening: true,
      })

      clipGroup.add(placeholder)
      clipGroup.add(kImage)
      clipGroup.add(overlay)
      root.add(clipGroup)
      root.add(border)
      root.add(hitArea)

      const cellIndex = i
      hitArea.on('mouseenter', () => setHoverIndex(cellIndex))
      hitArea.on('mouseleave', () => {
        setHoverIndex((h) => (h === cellIndex ? null : h))
      })
      hitArea.on('click tap', (e) => {
        e.cancelBubble = true
        const cur = activeIndexRef.current
        const next = cur === cellIndex ? null : cellIndex
        const ctx = interactionRef.current
        if (!ctx.isControlled) ctx.setUncontrolled(next)
        ctx.onActiveChange?.(next)
        onCellClickRef.current?.(cellIndex)
      })

      layer.add(root)
      cells.push({ layout: l, root, kImage, placeholder, overlay, border, hitArea })
    })

    cellsRef.current = cells

    cells.forEach((cell, i) =>
      applyCellVisual(
        cell,
        hoverIndexRef.current === i,
        activeIndexRef.current === i,
      ),
    )
    imagesRef.current.forEach((img, i) => {
      const c = cells[i]
      if (c) syncCellImage(c, img ?? null)
    })
    layer.batchDraw()

    return () => {
      layerRef.current = null
      cellsRef.current = null
      stage.destroy()
    }
  }, [width, height, gap])

  useEffect(() => {
    const cells = cellsRef.current
    if (!cells) return
    cells.forEach((cell, i) => syncCellImage(cell, images[i] ?? null))
    layerRef.current?.batchDraw()
  }, [images])

  useEffect(() => {
    const cells = cellsRef.current
    if (!cells) return
    cells.forEach((cell, i) =>
      applyCellVisual(cell, hoverIndex === i, activeIndex === i),
    )
    layerRef.current?.batchDraw()
  }, [hoverIndex, activeIndex])

  const cursor = hoverIndex !== null ? 'pointer' : 'default'

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width, height, cursor, ...style }}
    />
  )
}

/** 演示用占位图（picsum 固定 seed） */
export const DEMO_TILED_PHOTO_URLS: readonly string[] = [
  'https://picsum.photos/seed/tile-a/480/720',
  'https://picsum.photos/seed/tile-b/480/360',
  'https://picsum.photos/seed/tile-c/480/360',
  'https://picsum.photos/seed/tile-d/480/360',
  'https://picsum.photos/seed/tile-e/480/360',
  'https://picsum.photos/seed/tile-f/480/720',
]
