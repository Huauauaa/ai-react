/** Minimal typings for File System Access API not yet in all TS DOM libs. */
interface DirectoryPickerOptions {
  id?: string
  mode?: 'read' | 'readwrite'
  startIn?: unknown
}

interface OpenFilePickerOptions extends DirectoryPickerOptions {
  excludeAcceptAllOption?: boolean
  multiple?: boolean
  types?: Array<{ description?: string; accept: Record<string, string[]> }>
}

interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
}

interface Window {
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
  showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>
}
