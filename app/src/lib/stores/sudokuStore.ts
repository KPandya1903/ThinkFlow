import { create } from 'zustand';

export interface CellData {
  value: number; // 0 = empty
  given: boolean;
  notes: Set<number>;
  isError: boolean;
}

interface SudokuState {
  grid: CellData[][];
  selectedCell: { row: number; col: number } | null;
  notesMode: boolean;
  timer: number;
  isPaused: boolean;
  isComplete: boolean;
  hintsRemaining: number;
  mistakes: number;
  maxMistakes: number;
  history: { row: number; col: number; prevValue: number; prevNotes: Set<number> }[];
  totalEmpty: number;
  filledCount: number;

  // Actions
  initGrid: (initialGrid: number[][]) => void;
  selectCell: (row: number, col: number) => void;
  placeNumber: (num: number) => void;
  eraseCell: () => void;
  toggleNotes: () => void;
  undo: () => void;
  useHint: () => void;
  tick: () => void;
  togglePause: () => void;
  restart: () => void;
  getDigitCount: (num: number) => number;
}

/**
 * Check if placing `num` at (row, col) violates Sudoku constraints.
 * Returns true if the placement is valid (no duplicate in row, column, or 3x3 box).
 */
function isValidPlacement(grid: CellData[][], row: number, col: number, num: number): boolean {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (c !== col && grid[row][c].value === num) return false;
  }
  // Check column
  for (let r = 0; r < 9; r++) {
    if (r !== row && grid[r][col].value === num) return false;
  }
  // Check 3x3 box
  const boxR = Math.floor(row / 3) * 3;
  const boxC = Math.floor(col / 3) * 3;
  for (let r = boxR; r < boxR + 3; r++) {
    for (let c = boxC; c < boxC + 3; c++) {
      if (r !== row && c !== col && grid[r][c].value === num) return false;
    }
  }
  return true;
}

/**
 * Check if the entire grid is filled and all constraints are satisfied.
 */
function checkCompletion(grid: CellData[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c].value === 0) return false;
      if (!isValidPlacement(grid, r, c, grid[r][c].value)) return false;
    }
  }
  return true;
}

export const useSudokuStore = create<SudokuState>((set, get) => ({
  grid: [],
  selectedCell: null,
  notesMode: false,
  timer: 0,
  isPaused: false,
  isComplete: false,
  hintsRemaining: 3,
  mistakes: 0,
  maxMistakes: 3,
  history: [],
  totalEmpty: 0,
  filledCount: 0,

  initGrid: (initialGrid: number[][]) => {
    let empty = 0;
    const grid: CellData[][] = initialGrid.map((row) =>
      row.map((val) => {
        if (val === 0) empty++;
        return {
          value: val,
          given: val !== 0,
          notes: new Set<number>(),
          isError: false,
        };
      })
    );
    set({
      grid,
      selectedCell: null,
      notesMode: false,
      timer: 0,
      isPaused: false,
      isComplete: false,
      hintsRemaining: 3,
      mistakes: 0,
      history: [],
      totalEmpty: empty,
      filledCount: 0,
    });
  },

  selectCell: (row, col) => {
    set({ selectedCell: { row, col } });
  },

  placeNumber: (num) => {
    const { grid, selectedCell, notesMode } = get();
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    const cell = grid[row][col];
    if (cell.given) return;

    const newGrid = grid.map((r) => r.map((c) => ({ ...c, notes: new Set(c.notes) })));
    const newHistory = [
      ...get().history,
      { row, col, prevValue: cell.value, prevNotes: new Set(cell.notes) },
    ];

    if (notesMode) {
      const notes = newGrid[row][col].notes;
      if (notes.has(num)) {
        notes.delete(num);
      } else {
        notes.add(num);
      }
      newGrid[row][col].value = 0;
    } else {
      newGrid[row][col].value = num;
      newGrid[row][col].notes = new Set();

      // Validate against Sudoku rules (no duplicate in row/col/box)
      const valid = isValidPlacement(newGrid, row, col, num);
      newGrid[row][col].isError = !valid;

      if (!valid) {
        set((s) => ({ mistakes: s.mistakes + 1 }));
      }
    }

    // Count filled
    let filled = 0;
    newGrid.forEach((r) => r.forEach((c) => { if (!c.given && c.value !== 0) filled++; }));

    // Check completion (all cells filled + valid)
    const isComplete = checkCompletion(newGrid);

    set({ grid: newGrid, history: newHistory, filledCount: filled, isComplete });
  },

  eraseCell: () => {
    const { grid, selectedCell } = get();
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    const cell = grid[row][col];
    if (cell.given) return;

    const newGrid = grid.map((r) => r.map((c) => ({ ...c, notes: new Set(c.notes) })));
    const newHistory = [
      ...get().history,
      { row, col, prevValue: cell.value, prevNotes: new Set(cell.notes) },
    ];
    newGrid[row][col].value = 0;
    newGrid[row][col].notes = new Set();
    newGrid[row][col].isError = false;

    let filled = 0;
    newGrid.forEach((r) => r.forEach((c) => { if (!c.given && c.value !== 0) filled++; }));

    set({ grid: newGrid, history: newHistory, filledCount: filled });
  },

  toggleNotes: () => set((s) => ({ notesMode: !s.notesMode })),

  undo: () => {
    const { grid, history } = get();
    if (history.length === 0) return;
    const last = history[history.length - 1];
    const newGrid = grid.map((r) => r.map((c) => ({ ...c, notes: new Set(c.notes) })));
    newGrid[last.row][last.col].value = last.prevValue;
    newGrid[last.row][last.col].notes = new Set(last.prevNotes);
    newGrid[last.row][last.col].isError = false;

    let filled = 0;
    newGrid.forEach((r) => r.forEach((c) => { if (!c.given && c.value !== 0) filled++; }));

    set({ grid: newGrid, history: history.slice(0, -1), filledCount: filled });
  },

  useHint: () => {
    const { grid, hintsRemaining } = get();
    if (hintsRemaining <= 0) return;

    // Find an empty cell and try to solve it using constraint logic
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c].value !== 0) continue;

        // Find all candidates for this cell
        const candidates: number[] = [];
        const tempGrid = grid.map((row) => row.map((cell) => ({ ...cell, notes: new Set(cell.notes) })));
        for (let num = 1; num <= 9; num++) {
          if (isValidPlacement(tempGrid, r, c, num)) {
            candidates.push(num);
          }
        }

        // If there's exactly one candidate, we can fill it (naked single)
        if (candidates.length === 1) {
          const newGrid = grid.map((row) => row.map((cell) => ({ ...cell, notes: new Set(cell.notes) })));
          newGrid[r][c].value = candidates[0];
          newGrid[r][c].notes = new Set();
          newGrid[r][c].isError = false;

          let filled = 0;
          newGrid.forEach((row) => row.forEach((cell) => { if (!cell.given && cell.value !== 0) filled++; }));

          const isComplete = checkCompletion(newGrid);

          set({
            grid: newGrid,
            hintsRemaining: hintsRemaining - 1,
            selectedCell: { row: r, col: c },
            filledCount: filled,
            isComplete,
          });
          return;
        }
      }
    }

    // If no naked single found, just reduce hint count and inform via remaining count
    set({ hintsRemaining: hintsRemaining - 1 });
  },

  tick: () => set((s) => (s.isPaused || s.isComplete ? s : { timer: s.timer + 1 })),

  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),

  restart: () => {
    const { grid } = get();
    const newGrid = grid.map((r) =>
      r.map((c) => ({
        ...c,
        value: c.given ? c.value : 0,
        notes: new Set<number>(),
        isError: false,
      }))
    );
    set({
      grid: newGrid,
      selectedCell: null,
      timer: 0,
      isPaused: false,
      isComplete: false,
      hintsRemaining: 3,
      mistakes: 0,
      history: [],
      filledCount: 0,
    });
  },

  getDigitCount: (num: number) => {
    const { grid } = get();
    let count = 0;
    grid.forEach((r) => r.forEach((c) => { if (c.value === num) count++; }));
    return count;
  },
}));
