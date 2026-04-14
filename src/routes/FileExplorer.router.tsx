import { Alert, Button, Card, Empty, Space, Spin, Tree, Typography } from 'antd'
import type { TreeProps } from 'antd'
import type { DataNode } from 'antd/es/tree'
import { useCallback, useEffect, useMemo, useRef, useState, type Key } from 'react'
import type { RouteObject } from 'react-router-dom'
import { highlightFileContent } from '../utils/simpleCodeHighlight'

type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'text'; text: string; fileName: string }
  | { status: 'image'; url: string; fileName: string }
  | { status: 'binary'; fileName: string; size: number }
  | { status: 'error'; message: string }

function hasFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window && 'showOpenFilePicker' in window
}

function looksBinary(bytes: Uint8Array): boolean {
  const n = Math.min(bytes.length, 4096)
  for (let i = 0; i < n; i++) {
    if (bytes[i] === 0) return true
  }
  return false
}

async function scanDirectory(
  dir: FileSystemDirectoryHandle,
  basePath: string,
  handles: Map<string, FileSystemFileHandle>,
): Promise<DataNode[]> {
  const entries: { name: string; handle: FileSystemHandle }[] = []
  for await (const [name, handle] of dir.entries()) {
    entries.push({ name, handle })
  }
  entries.sort((a, b) => {
    const aDir = a.handle.kind === 'directory'
    const bDir = b.handle.kind === 'directory'
    if (aDir !== bDir) return aDir ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })

  const nodes: DataNode[] = []
  for (const { name, handle } of entries) {
    const path = `${basePath}/${name}`
    if (handle.kind === 'file') {
      const fh = handle as FileSystemFileHandle
      handles.set(path, fh)
      nodes.push({ title: name, key: path, isLeaf: true })
    } else {
      const dh = handle as FileSystemDirectoryHandle
      const children = await scanDirectory(dh, path, handles)
      nodes.push({ title: name, key: path, isLeaf: false, children })
    }
  }
  return nodes
}

async function loadPreview(handle: FileSystemFileHandle): Promise<PreviewState> {
  const file = await handle.getFile()
  const name = file.name

  if (file.type.startsWith('image/')) {
    return { status: 'image', url: URL.createObjectURL(file), fileName: name }
  }

  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  if (looksBinary(bytes)) {
    return { status: 'binary', fileName: name, size: file.size }
  }

  try {
    const text = new TextDecoder('utf-8').decode(buf)
    return { status: 'text', text, fileName: name }
  } catch {
    return { status: 'error', message: 'Could not decode file as UTF-8 text.' }
  }
}

function revokePreview(p: PreviewState) {
  if (p.status === 'image') URL.revokeObjectURL(p.url)
}

export function FileExplorerDemo() {
  const supported = useMemo(() => hasFileSystemAccess(), [])
  const fileHandlesRef = useRef(new Map<string, FileSystemFileHandle>())
  const [rootLabel, setRootLabel] = useState<string | null>(null)
  const [treeData, setTreeData] = useState<DataNode[]>([])
  const [scanning, setScanning] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([])
  const [preview, setPreview] = useState<PreviewState>({ status: 'idle' })
  const previewRef = useRef<PreviewState>({ status: 'idle' })

  useEffect(() => {
    previewRef.current = preview
  }, [preview])

  useEffect(() => {
    return () => revokePreview(previewRef.current)
  }, [])

  const clearTree = useCallback(() => {
    revokePreview(previewRef.current)
    fileHandlesRef.current.clear()
    setTreeData([])
    setRootLabel(null)
    setSelectedKeys([])
    setPreview({ status: 'idle' })
  }, [])

  const openFolder = useCallback(async () => {
    if (!supported) return
    clearTree()
    setScanning(true)
    try {
      const dir = await window.showDirectoryPicker({ mode: 'read' })
      setRootLabel(dir.name)
      const nodes = await scanDirectory(dir, '', fileHandlesRef.current)
      setTreeData(nodes)
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setPreview({ status: 'error', message: (e as Error).message || 'Failed to open folder.' })
    } finally {
      setScanning(false)
    }
  }, [supported, clearTree])

  const openFile = useCallback(async () => {
    if (!supported) return
    clearTree()
    try {
      const [handle] = await window.showOpenFilePicker({ multiple: false })
      fileHandlesRef.current.set(`/${handle.name}`, handle)
      setRootLabel(handle.name)
      setTreeData([{ title: handle.name, key: `/${handle.name}`, isLeaf: true }])
      setSelectedKeys([`/${handle.name}`])
      setPreview({ status: 'loading' })
      const next = await loadPreview(handle)
      setPreview((prev) => {
        revokePreview(prev)
        return next
      })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setPreview({ status: 'error', message: (e as Error).message || 'Failed to open file.' })
    }
  }, [supported, clearTree])

  const onSelect: TreeProps['onSelect'] = useCallback(
    async (keys: Key[]) => {
      setSelectedKeys(keys)
      const key = keys[0]
      if (key === undefined || key === null) {
        setPreview((prev) => {
          revokePreview(prev)
          return { status: 'idle' }
        })
        return
      }
      const path = String(key)
      const handle = fileHandlesRef.current.get(path)
      if (!handle) {
        setPreview((prev) => {
          revokePreview(prev)
          return { status: 'idle' }
        })
        return
      }
      setPreview({ status: 'loading' })
      try {
        const next = await loadPreview(handle)
        setPreview((prev) => {
          revokePreview(prev)
          return next
        })
      } catch (e) {
        setPreview((prev) => {
          revokePreview(prev)
          return { status: 'error', message: (e as Error).message || 'Failed to read file.' }
        })
      }
    },
    [],
  )

  const titleRender: TreeProps['titleRender'] = useCallback((node: DataNode) => {
    const isDir = !node.isLeaf
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[13px]">
        <span className="text-slate-400" aria-hidden>
          {isDir ? '▸' : '·'}
        </span>
        <span className={isDir ? 'font-medium text-slate-800' : 'text-slate-700'}>{node.title as string}</span>
      </span>
    )
  }, [])

  const highlightedCodeHtml = useMemo(() => {
    if (preview.status !== 'text') return null
    return highlightFileContent(preview.text, preview.fileName)
  }, [preview])

  return (
    <Space direction="vertical" size="middle" className="w-full">
      <Card className="shadow-sm" variant="borderless">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">本地文件浏览</div>
            <div className="mt-1 text-sm text-slate-600">
              打开文件夹后左侧为目录树；点击文件在右侧查看内容。使用浏览器的文件系统权限（类似 VS Code / IDE 的本地资源管理器）。
            </div>
          </div>
          <Space wrap>
            <Button type="primary" onClick={openFolder} disabled={!supported || scanning}>
              打开文件夹
            </Button>
            <Button onClick={openFile} disabled={!supported}>
              打开文件
            </Button>
            {(treeData.length > 0 || rootLabel) && (
              <Button danger type="text" onClick={clearTree}>
                清除
              </Button>
            )}
          </Space>
        </div>
        {!supported && (
          <Alert
            className="mt-4"
            type="warning"
            showIcon
            message="当前浏览器不支持本地文件夹选择"
            description="请使用 Chrome、Edge 或其他基于 Chromium 的浏览器，并确保通过 HTTPS 或 localhost 访问。"
          />
        )}
      </Card>

      <Card className="overflow-hidden shadow-sm" variant="borderless" styles={{ body: { padding: 0 } }}>
        <div className="flex h-[min(78vh,calc(100vh-10rem))] min-h-[480px] flex-col border-t border-slate-200/80 md:flex-row">
          <aside className="flex max-h-[42vh] min-h-0 w-full shrink-0 flex-col border-b border-slate-200/80 bg-slate-50/80 md:max-h-none md:h-full md:w-[min(100%,320px)] md:border-b-0 md:border-r">
            <div className="shrink-0 border-b border-slate-200/60 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              {rootLabel ? `根：${rootLabel}` : '资源管理器'}
            </div>
            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain p-2 [scrollbar-gutter:stable]">
              {scanning ? (
                <div className="flex justify-center py-16">
                  <Spin tip="正在扫描目录…" />
                </div>
              ) : treeData.length === 0 ? (
                <Empty className="py-12" description="尚未打开文件夹或文件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Tree
                  blockNode
                  showLine={{ showLeafIcon: false }}
                  defaultExpandAll
                  treeData={treeData}
                  selectedKeys={selectedKeys}
                  onSelect={onSelect}
                  titleRender={titleRender}
                  className="min-w-max bg-transparent text-sm [&_.ant-tree-node-content-wrapper]:!rounded-md"
                />
              )}
            </div>
          </aside>
          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white md:h-full">
            <div className="shrink-0 border-b border-slate-200/60 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              预览
            </div>
            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable]">
              {preview.status === 'idle' && (
                <Empty description="在左侧选择一个文件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
              {preview.status === 'loading' && (
                <div className="flex justify-center py-20">
                  <Spin />
                </div>
              )}
              {preview.status === 'error' && <Alert type="error" message={preview.message} />}
              {preview.status === 'binary' && (
                <Typography.Paragraph className="text-slate-600">
                  无法以文本预览「{preview.fileName}」（检测到二进制内容），大小 {preview.size.toLocaleString()} 字节。
                </Typography.Paragraph>
              )}
              {preview.status === 'text' && highlightedCodeHtml !== null && (
                <pre className="file-explorer-code m-0 rounded-lg border border-slate-200 bg-[#f6f8fa] p-3 whitespace-pre-wrap break-words">
                  <code dangerouslySetInnerHTML={{ __html: highlightedCodeHtml }} />
                </pre>
              )}
              {preview.status === 'image' && (
                <div className="flex max-w-full flex-col items-start gap-2">
                  <Typography.Text type="secondary" className="text-sm">
                    {preview.fileName}
                  </Typography.Text>
                  <img
                    src={preview.url}
                    alt={preview.fileName}
                    className="max-w-full rounded-lg border border-slate-200 object-contain"
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      </Card>
    </Space>
  )
}

export const fileExplorerRoute: RouteObject = {
  path: 'explorer',
  element: <FileExplorerDemo />,
}
