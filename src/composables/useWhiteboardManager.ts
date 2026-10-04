import { ref, computed } from 'vue'
import { createDefaultViewport, type ViewportState } from './drawingViewport'
import type { DrawingStateSnapshot } from './useDrawing'

export interface WhiteboardEntry {
  id: string
  letter: string
  name: string
  backgroundColor: string
  drawingState: DrawingStateSnapshot | null
  viewport: ViewportState
}

export interface WhiteboardManagerOptions {
  /** Invoked when the current board changes (created / selected / deleted). */
  onSwitch?: (board: WhiteboardEntry) => void
  /** Invoked after any mutation (for diagnostics etc.). */
  onDirty?: () => void
}

export const MAX_BOARDS = 26
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const MAX_NAME_LENGTH = 50

function boardName(letter: string): string {
  return `白板${letter}`
}

function emptyDrawingState(): DrawingStateSnapshot {
  return { history: [], undoStack: [], redoStack: [], laserStrokes: [] }
}

export function useWhiteboardManager(options: WhiteboardManagerOptions = {}) {
  const boards = ref<WhiteboardEntry[]>([])
  const currentId = ref('')

  const current = computed(() => boards.value.find((b) => b.id === currentId.value) ?? null)

  function makeBoard(letter: string): WhiteboardEntry {
    return {
      id: crypto.randomUUID(),
      letter,
      name: boardName(letter),
      backgroundColor: '#FFFFFF',
      drawingState: null,
      viewport: createDefaultViewport(),
    }
  }

  function nextLetter(): string | null {
    const used = new Set(boards.value.map((b) => b.letter))
    for (const letter of LETTERS) {
      if (!used.has(letter)) return letter
    }
    return null
  }

  function nextLetterAfter(letter: string): string {
    const i = LETTERS.indexOf(letter)
    return LETTERS[(i + 1) % LETTERS.length]
  }

  function activateBoard(id: string) {
    currentId.value = id
    const board = current.value
    if (board) options.onSwitch?.(board)
  }

  function ensureInitialBoard(): void {
    if (boards.value.length > 0) return
    const board = makeBoard('A')
    boards.value.push(board)
    activateBoard(board.id)
    options.onDirty?.()
  }

  function createBoard(): boolean {
    if (boards.value.length >= MAX_BOARDS) return false
    const letter = nextLetter()
    if (!letter) return false
    const board = makeBoard(letter)
    boards.value.push(board)
    activateBoard(board.id)
    options.onDirty?.()
    return true
  }

  function selectBoard(id: string): void {
    if (id === currentId.value) return
    activateBoard(id)
  }

  function deleteBoard(id: string): void {
    const idx = boards.value.findIndex((b) => b.id === id)
    if (idx === -1) return
    const removed = boards.value[idx]
    boards.value.splice(idx, 1)

    if (boards.value.length === 0) {
      // Deleting the last board auto-creates the next sequential-letter board.
      const board = makeBoard(nextLetterAfter(removed.letter))
      boards.value.push(board)
      activateBoard(board.id)
    } else if (removed.id === currentId.value) {
      // Prefer the right neighbour, else the left neighbour.
      const nextIdx = Math.min(idx, boards.value.length - 1)
      activateBoard(boards.value[nextIdx].id)
    }
    options.onDirty?.()
  }

  function renameBoard(id: string, name: string): void {
    const board = boards.value.find((b) => b.id === id)
    if (!board) return
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    board.name = trimmed.length > MAX_NAME_LENGTH ? trimmed.slice(0, MAX_NAME_LENGTH) : trimmed
    options.onDirty?.()
  }

  function saveCurrent(snapshot: DrawingStateSnapshot, viewport: ViewportState): void {
    const board = current.value
    if (!board) return
    board.drawingState = snapshot
    board.viewport = { ...viewport }
    options.onDirty?.()
  }

  function getBoard(id: string): WhiteboardEntry | null {
    return boards.value.find((b) => b.id === id) ?? null
  }

  return {
    boards,
    currentId,
    current,
    ensureInitialBoard,
    createBoard,
    selectBoard,
    deleteBoard,
    renameBoard,
    saveCurrent,
    getBoard,
    emptyDrawingState,
  }
}

export type WhiteboardManager = ReturnType<typeof useWhiteboardManager>
