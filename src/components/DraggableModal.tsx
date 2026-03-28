import { ConfigProvider, Modal, type ModalProps } from 'antd'
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

export type DraggableModalProps = ModalProps & {
  /** 为 true 时可通过标题栏拖拽移动弹窗 */
  draggable?: boolean
}

function mergeDraggableModalStyles(userStyles: ModalProps['styles']): ModalProps['styles'] {
  const headerPatch: CSSProperties = {
    cursor: 'grab',
    userSelect: 'none',
  }

  if (userStyles === undefined) {
    return { header: headerPatch }
  }

  if (typeof userStyles === 'function') {
    return (info) => {
      const resolved = userStyles(info)
      return {
        ...resolved,
        header: {
          ...headerPatch,
          ...resolved.header,
        },
      }
    }
  }

  return {
    ...userStyles,
    header: {
      ...headerPatch,
      ...userStyles.header,
    },
  }
}

type ModalDragLayerProps = {
  modalPrefixCls: string
  children: ReactNode
}

function ModalDragLayer({ modalPrefixCls, children }: ModalDragLayerProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const bodyCursorRef = useRef<string | undefined>(undefined)

  useEffect(
    () => () => {
      if (bodyCursorRef.current !== undefined) {
        document.body.style.cursor = bodyCursorRef.current
        bodyCursorRef.current = undefined
      }
    },
    [],
  )

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (!target.closest(`.${modalPrefixCls}-header`)) return
    if (target.closest(`.${modalPrefixCls}-close`)) return

    e.preventDefault()
    bodyCursorRef.current = document.body.style.cursor
    document.body.style.cursor = 'grabbing'

    const startX = e.clientX
    const startY = e.clientY
    const originX = offset.x
    const originY = offset.y

    const onMove = (ev: PointerEvent) => {
      setOffset({
        x: originX + ev.clientX - startX,
        y: originY + ev.clientY - startY,
      })
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (bodyCursorRef.current !== undefined) {
        document.body.style.cursor = bodyCursorRef.current
        bodyCursorRef.current = undefined
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      onPointerDown={onPointerDown}
    >
      {children}
    </div>
  )
}

export function DraggableModal({
  draggable = false,
  modalRender: userModalRender,
  prefixCls: prefixClsProp,
  open,
  styles: userStyles,
  ...rest
}: DraggableModalProps) {
  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext)
  const modalPrefixCls = prefixClsProp ?? getPrefixCls('modal')

  const mergedStyles = draggable ? mergeDraggableModalStyles(userStyles) : userStyles

  const mergedModalRender = useCallback(
    (node: ReactNode) => (
      <ModalDragLayer
        key={open ? 'shown' : 'hidden'}
        modalPrefixCls={modalPrefixCls}
      >
        {userModalRender ? userModalRender(node) : node}
      </ModalDragLayer>
    ),
    [open, userModalRender, modalPrefixCls],
  )

  return (
    <Modal
      {...rest}
      open={open}
      prefixCls={prefixClsProp}
      styles={mergedStyles}
      modalRender={draggable ? mergedModalRender : userModalRender}
    />
  )
}
