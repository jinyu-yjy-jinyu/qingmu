/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { useWhiteboardManager, MAX_BOARDS } from './useWhiteboardManager'

function setup(onSwitch = vi.fn()) {
  const manager = useWhiteboardManager({ onSwitch })
  return { manager, onSwitch }
}

describe('useWhiteboardManager', () => {
  it('ensureInitialBoard creates the first board 白板A and makes it current', () => {
    const { manager } = setup()
    manager.ensureInitialBoard()
    expect(manager.boards.value).toHaveLength(1)
    expect(manager.boards.value[0].name).toBe('白板A')
    expect(manager.boards.value[0].letter).toBe('A')
    expect(manager.current.value?.id).toBe(manager.boards.value[0].id)
    expect(manager.current.value?.viewport).toEqual({ offsetX: 0, offsetY: 0, zoom: 1 })
  })

  it('ensureInitialBoard is a no-op once boards exist', () => {
    const { manager } = setup()
    manager.ensureInitialBoard()
    manager.ensureInitialBoard()
    expect(manager.boards.value).toHaveLength(1)
  })

  it('createBoard names boards A, B, C in order and appends at the end', () => {
    const { manager } = setup()
    manager.ensureInitialBoard()
    expect(manager.createBoard()).toBe(true)
    expect(manager.createBoard()).toBe(true)
    expect(manager.boards.value.map((b) => b.name)).toEqual(['白板A', '白板B', '白板C'])
    expect(manager.boards.value[2].letter).toBe('C')
    expect(manager.current.value?.letter).toBe('C')
  })

  it('createBoard fails after 26 boards exist', () => {
    const { manager } = setup()
    manager.ensureInitialBoard()
    for (let i = 1; i < MAX_BOARDS; i++) {
      expect(manager.createBoard()).toBe(true)
    }
    expect(manager.boards.value).toHaveLength(MAX_BOARDS)
    expect(manager.createBoard()).toBe(false)
  })

  it('selectBoard switches current and notifies onSwitch', () => {
    const { manager, onSwitch } = setup()
    manager.ensureInitialBoard()
    manager.createBoard()
    const a = manager.boards.value[0]
    manager.selectBoard(a.id)
    expect(manager.current.value?.id).toBe(a.id)
    expect(onSwitch).toHaveBeenCalledWith(expect.objectContaining({ id: a.id }))
  })

  it('deleteBoard prefers the right neighbour for current board', () => {
    const { manager } = setup()
    manager.ensureInitialBoard()
    manager.createBoard()
    manager.createBoard()
    // current = C
    const a = manager.boards.value[0]
    manager.selectBoard(a.id)
    manager.deleteBoard(a.id)
    expect(manager.boards.value.map((b) => b.letter)).toEqual(['B', 'C'])
    expect(manager.current.value?.letter).toBe('B')
  })

  it('deleteBoard falls back to the left neighbour when deleting the last board', () => {
    const { manager } = setup()
    manager.ensureInitialBoard()
    manager.createBoard()
    manager.createBoard()
    const c = manager.boards.value[2]
    manager.deleteBoard(c.id)
    expect(manager.current.value?.letter).toBe('B')
  })

  it('deleting the last board auto-creates the next sequential-letter board', () => {
    const { manager } = setup()
    manager.ensureInitialBoard()
    const a = manager.boards.value[0]
    manager.deleteBoard(a.id)
    expect(manager.boards.value).toHaveLength(1)
    expect(manager.boards.value[0].letter).toBe('B')
    expect(manager.current.value?.letter).toBe('B')
  })

  it('renameBoard trims whitespace, rejects empty names, truncates to 50 chars', () => {
    const { manager } = setup()
    manager.ensureInitialBoard()
    const id = manager.boards.value[0].id

    manager.renameBoard(id, '  会议记录  ')
    expect(manager.boards.value[0].name).toBe('会议记录')

    manager.renameBoard(id, '   ')
    expect(manager.boards.value[0].name).toBe('会议记录')

    const long = 'x'.repeat(80)
    manager.renameBoard(id, long)
    expect(manager.boards.value[0].name).toHaveLength(50)
  })

  it('allows two boards to share the same name', () => {
    const { manager } = setup()
    manager.ensureInitialBoard()
    manager.createBoard()
    manager.renameBoard(manager.boards.value[1].id, '白板A')
    expect(manager.boards.value[1].name).toBe('白板A')
  })

  it('saveCurrent stores snapshot and viewport on the current board', () => {
    const { manager } = setup()
    manager.ensureInitialBoard()
    const snapshot = { history: [], undoStack: [], redoStack: [], laserStrokes: [] }
    manager.saveCurrent(snapshot, { offsetX: 100, offsetY: 50, zoom: 1.5 })
    expect(manager.current.value?.drawingState).toStrictEqual(snapshot)
    expect(manager.current.value?.viewport).toEqual({ offsetX: 100, offsetY: 50, zoom: 1.5 })
  })

  it('boards keep independent viewports after switching', () => {
    const { manager } = setup()
    manager.ensureInitialBoard()
    const a = manager.boards.value[0]
    manager.createBoard()
    manager.saveCurrent(manager.emptyDrawingState(), { offsetX: 10, offsetY: 20, zoom: 2 })
    const b = manager.current.value!
    manager.selectBoard(a.id)
    expect(manager.current.value?.viewport).toEqual({ offsetX: 0, offsetY: 0, zoom: 1 })
    manager.selectBoard(b.id)
    expect(manager.current.value?.viewport).toEqual({ offsetX: 10, offsetY: 20, zoom: 2 })
  })

  it('getBoard returns a board by id or null', () => {
    const { manager } = setup()
    manager.ensureInitialBoard()
    const id = manager.boards.value[0].id
    expect(manager.getBoard(id)?.id).toBe(id)
    expect(manager.getBoard('missing')).toBeNull()
  })
})
