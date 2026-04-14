/** Small lexer-based highlighter for file preview (no external deps). */

const SQL_KEYWORDS = new Set([
  'all',
  'alter',
  'and',
  'as',
  'asc',
  'between',
  'by',
  'case',
  'cast',
  'constraint',
  'create',
  'default',
  'delete',
  'desc',
  'distinct',
  'drop',
  'else',
  'end',
  'exists',
  'false',
  'foreign',
  'from',
  'grant',
  'group',
  'having',
  'ilike',
  'in',
  'index',
  'inner',
  'insert',
  'into',
  'join',
  'key',
  'left',
  'like',
  'limit',
  'not',
  'null',
  'offset',
  'on',
  'or',
  'order',
  'outer',
  'primary',
  'references',
  'returning',
  'revoke',
  'right',
  'select',
  'set',
  'table',
  'then',
  'true',
  'union',
  'unique',
  'update',
  'values',
  'when',
  'where',
  'with',
])

const C_KEYWORDS = new Set([
  'abstract',
  'as',
  'asserts',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'declare',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'get',
  'global',
  'if',
  'implements',
  'import',
  'in',
  'infer',
  'instanceof',
  'interface',
  'is',
  'keyof',
  'let',
  'module',
  'namespace',
  'new',
  'null',
  'of',
  'package',
  'private',
  'protected',
  'public',
  'readonly',
  'return',
  'satisfies',
  'set',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'type',
  'typeof',
  'undefined',
  'unique',
  'unknown',
  'using',
  'var',
  'void',
  'while',
  'with',
  'yield',
])

const CSS_AT = new Set([
  'charset',
  'counter-style',
  'font-face',
  'import',
  'keyframes',
  'layer',
  'media',
  'namespace',
  'page',
  'property',
  'supports',
  'viewport',
])

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function span(cls: string, text: string): string {
  return `<span class="${cls}">${escapeHtml(text)}</span>`
}

type LineComment = '//' | '--'

function highlightWithStrings(
  src: string,
  opts: {
    lineComment: LineComment | null
    allowTemplate: boolean
    sqlSingleQuoteDouble?: boolean
    keywords?: Set<string>
  },
): string {
  const { lineComment, allowTemplate, sqlSingleQuoteDouble, keywords } = opts
  const kwSet = keywords ?? C_KEYWORDS
  let i = 0
  let out = ''

  const pushPlain = (a: number, b: number) => {
    if (a < b) out += escapeHtml(src.slice(a, b))
  }

  while (i < src.length) {
    const c = src[i]!

    if (c === '\r' || c === '\n' || c === '\t' || c === ' ') {
      let j = i + 1
      while (j < src.length) {
        const x = src[j]!
        if (x !== '\r' && x !== '\n' && x !== '\t' && x !== ' ') break
        j++
      }
      pushPlain(i, j)
      i = j
      continue
    }

    if (lineComment && c === lineComment[0] && src[i + 1] === lineComment[1]) {
      let j = i + 2
      while (j < src.length && src[j] !== '\n') j++
      out += span('syn-cmt', src.slice(i, j))
      i = j
      continue
    }

    if (c === '/' && src[i + 1] === '*') {
      let j = i + 2
      while (j < src.length - 1) {
        if (src[j] === '*' && src[j + 1] === '/') {
          j += 2
          break
        }
        j++
      }
      if (j > src.length) j = src.length
      out += span('syn-cmt', src.slice(i, j))
      i = j
      continue
    }

    if (c === "'" || c === '"') {
      const q = c
      let j = i + 1
      while (j < src.length) {
        const x = src[j]!
        if (sqlSingleQuoteDouble && q === "'" && x === "'" && src[j + 1] === "'") {
          j += 2
          continue
        }
        if (x === '\\') {
          j += 2
          continue
        }
        if (x === q) {
          j++
          break
        }
        j++
      }
      out += span('syn-str', src.slice(i, j))
      i = j
      continue
    }

    if (allowTemplate && c === '`') {
      let j = i + 1
      while (j < src.length) {
        const x = src[j]!
        if (x === '\\') {
          j += 2
          continue
        }
        if (x === '`') {
          j++
          break
        }
        j++
      }
      out += span('syn-str', src.slice(i, j))
      i = j
      continue
    }

    if (c === '/' && src[i + 1] === '/') {
      let j = i + 2
      while (j < src.length && src[j] !== '\n') j++
      out += span('syn-cmt', src.slice(i, j))
      i = j
      continue
    }

    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let j = i + (c === '.' ? 1 : 0)
      if (c === '0' && (src[i + 1] === 'x' || src[i + 1] === 'X')) {
        j = i + 2
        while (j < src.length && /[0-9a-fA-F_]/.test(src[j]!)) j++
      } else if (c === '0' && (src[i + 1] === 'b' || src[i + 1] === 'B')) {
        j = i + 2
        while (j < src.length && /[01_]/.test(src[j]!)) j++
      } else {
        j = i
        while (j < src.length && /[0-9_]/.test(src[j]!)) j++
        if (src[j] === '.' && /[0-9]/.test(src[j + 1] ?? '')) {
          j++
          while (j < src.length && /[0-9_]/.test(src[j]!)) j++
        }
        if (src[j] === 'e' || src[j] === 'E') {
          j++
          if (src[j] === '+' || src[j] === '-') j++
          while (j < src.length && /[0-9_]/.test(src[j]!)) j++
        }
      }
      out += span('syn-num', src.slice(i, j))
      i = j
      continue
    }

    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1
      while (j < src.length && /[\w$]/.test(src[j]!)) j++
      const w = src.slice(i, j)
      if (kwSet.has(w.toLowerCase())) out += span('syn-kw', w)
      else if (/^[A-Z][\w$]*$/.test(w)) out += span('syn-type', w)
      else out += escapeHtml(w)
      i = j
      continue
    }

    out += escapeHtml(c)
    i++
  }

  return out
}

function highlightCss(src: string): string {
  let i = 0
  let out = ''

  const pushPlain = (a: number, b: number) => {
    if (a < b) out += escapeHtml(src.slice(a, b))
  }

  while (i < src.length) {
    const c = src[i]!

    if (c === '\r' || c === '\n' || c === '\t' || c === ' ') {
      let j = i + 1
      while (j < src.length) {
        const x = src[j]!
        if (x !== '\r' && x !== '\n' && x !== '\t' && x !== ' ') break
        j++
      }
      pushPlain(i, j)
      i = j
      continue
    }

    if (c === '/' && src[i + 1] === '*') {
      let j = i + 2
      while (j < src.length - 1) {
        if (src[j] === '*' && src[j + 1] === '/') {
          j += 2
          break
        }
        j++
      }
      if (j > src.length) j = src.length
      out += span('syn-cmt', src.slice(i, j))
      i = j
      continue
    }

    if (c === "'" || c === '"') {
      const q = c
      let j = i + 1
      while (j < src.length) {
        const x = src[j]!
        if (x === '\\') {
          j += 2
          continue
        }
        if (x === q) {
          j++
          break
        }
        j++
      }
      out += span('syn-str', src.slice(i, j))
      i = j
      continue
    }

    if (c === '@') {
      let j = i + 1
      while (j < src.length && /[-\w]/.test(src[j]!)) j++
      const raw = src.slice(i, j)
      const name = raw.slice(1).split(/\s/)[0] ?? ''
      const base = name.includes('-') ? name.split('-')[0] : name
      if (CSS_AT.has(base) || CSS_AT.has(name)) out += span('syn-at', raw)
      else out += escapeHtml(raw)
      i = j
      continue
    }

    if (c === '#') {
      let j = i + 1
      while (j < src.length && /[a-fA-F0-9]/.test(src[j]!)) j++
      const hexLen = j - i - 1
      if (hexLen === 3 || hexLen === 4 || hexLen === 6 || hexLen === 8) {
        out += span('syn-num', src.slice(i, j))
        i = j
      } else {
        out += escapeHtml(c)
        i++
      }
      continue
    }

    out += escapeHtml(c)
    i++
  }

  return out
}

function guessMode(fileName: string): 'clike' | 'css' | 'sql' | 'plain' {
  const dot = fileName.lastIndexOf('.')
  const ext = dot >= 0 ? fileName.slice(dot).toLowerCase() : ''
  if (ext === '.css' || ext === '.scss' || ext === '.less') return 'css'
  if (ext === '.sql') return 'sql'
  if (
    ext === '.ts' ||
    ext === '.tsx' ||
    ext === '.js' ||
    ext === '.jsx' ||
    ext === '.mjs' ||
    ext === '.cjs' ||
    ext === '.cts' ||
    ext === '.mts' ||
    ext === '.vue' ||
    ext === '.svelte' ||
    ext === '.astro' ||
    ext === '.json' ||
    ext === '.rs' ||
    ext === '.java' ||
    ext === '.kt' ||
    ext === '.kts' ||
    ext === '.go' ||
    ext === '.py' ||
    ext === '.rb' ||
    ext === '.php' ||
    ext === '.cs' ||
    ext === '.cpp' ||
    ext === '.cc' ||
    ext === '.cxx' ||
    ext === '.c' ||
    ext === '.h' ||
    ext === '.hpp' ||
    ext === '.swift' ||
    ext === '.zig' ||
    ext === '.sh' ||
    ext === '.bash' ||
    ext === '.zsh'
  ) {
    return 'clike'
  }
  return 'plain'
}

export function highlightFileContent(code: string, fileName: string): string {
  const mode = guessMode(fileName)
  if (mode === 'plain') return escapeHtml(code)
  if (mode === 'css') return highlightCss(code)
  if (mode === 'sql')
    return highlightWithStrings(code, {
      lineComment: '--',
      allowTemplate: false,
      sqlSingleQuoteDouble: true,
      keywords: SQL_KEYWORDS,
    })
  return highlightWithStrings(code, { lineComment: '//', allowTemplate: true })
}
