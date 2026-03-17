'use client';

import { useState, useCallback } from 'react';
import { Send, RotateCcw, ArrowRight, Minus, Plus } from 'lucide-react';

// ─── ARC Color Map ──────────────────────────────────────────────────────────
// 0=black, 1=blue, 2=red, 3=green, 4=yellow, 5=gray, 6=magenta,
// 7=orange, 8=cyan, 9=brown

const ARC_COLORS: Record<number, string> = {
  0: '#000000',
  1: '#1E93FF',
  2: '#F93943',
  3: '#4CAF50',
  4: '#FFEB3B',
  5: '#8D8D8D',
  6: '#E040FB',
  7: '#FF9800',
  8: '#00BCD4',
  9: '#795548',
};

const ARC_COLOR_NAMES: Record<number, string> = {
  0: 'Black',
  1: 'Blue',
  2: 'Red',
  3: 'Green',
  4: 'Yellow',
  5: 'Gray',
  6: 'Magenta',
  7: 'Orange',
  8: 'Cyan',
  9: 'Brown',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface TrainingPair {
  input: number[][];
  output: number[][];
}

interface ArcGameProps {
  trainPairs: TrainingPair[];
  testInput: number[][];
  solutionGrid: number[][];
  onSubmit?: (userGrid: number[][], isCorrect: boolean) => void;
}

// ─── Grid Renderer ──────────────────────────────────────────────────────────

function ArcGridDisplay({
  grid,
  label,
  cellSize = 28,
}: {
  grid: readonly (readonly number[])[];
  label: string;
  cellSize?: number;
}) {
  if (grid.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-medium text-txt-secondary uppercase tracking-wider">
        {label}
      </span>
      <div
        className="inline-grid border border-[#3a3a58] rounded-md overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${grid[0]?.length ?? 1}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${grid.length}, ${cellSize}px)`,
        }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className="border border-[#1e1e30]/50"
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: ARC_COLORS[cell] ?? ARC_COLORS[0],
              }}
              title={`(${r},${c}) = ${cell}`}
            />
          )),
        )}
      </div>
    </div>
  );
}

// ─── Interactive Grid ───────────────────────────────────────────────────────

function ArcGridEditor({
  grid,
  selectedColor,
  onCellClick,
  cellSize = 28,
}: {
  grid: number[][];
  selectedColor: number;
  onCellClick: (row: number, col: number) => void;
  cellSize?: number;
}) {
  if (grid.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-medium text-txt-secondary uppercase tracking-wider">
        Your Output
      </span>
      <div
        className="inline-grid border-2 border-primary-light/50 rounded-md overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${grid[0]?.length ?? 1}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${grid.length}, ${cellSize}px)`,
        }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              className="border border-[#1e1e30]/50 transition-transform hover:scale-110 hover:z-10 relative cursor-pointer"
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: ARC_COLORS[cell] ?? ARC_COLORS[0],
              }}
              title={`(${r},${c}) = ${cell} — click to paint color ${selectedColor}`}
              onClick={() => onCellClick(r, c)}
            />
          )),
        )}
      </div>
    </div>
  );
}

// ─── Color Palette ──────────────────────────────────────────────────────────

function ColorPalette({
  selectedColor,
  onSelectColor,
}: {
  selectedColor: number;
  onSelectColor: (color: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {Array.from({ length: 10 }, (_, i) => (
        <button
          key={i}
          className={`w-8 h-8 rounded-md border-2 transition-all ${
            selectedColor === i
              ? 'border-white scale-110 shadow-lg'
              : 'border-[#3a3a58] hover:border-primary-light/60'
          }`}
          style={{ backgroundColor: ARC_COLORS[i] }}
          title={`${ARC_COLOR_NAMES[i]} (${i})`}
          onClick={() => onSelectColor(i)}
        />
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ArcGame({
  trainPairs,
  testInput,
  solutionGrid,
  onSubmit,
}: ArcGameProps) {
  // Initialize user grid to match solution dimensions, filled with 0 (black)
  const initialRows = solutionGrid.length;
  const initialCols = solutionGrid[0]?.length ?? 1;

  const [userGrid, setUserGrid] = useState<number[][]>(() =>
    Array.from({ length: initialRows }, () =>
      Array.from({ length: initialCols }, () => 0),
    ),
  );
  const [selectedColor, setSelectedColor] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Cell size adapts to grid dimensions
  const maxGridDim = Math.max(
    ...trainPairs.flatMap((p) => [
      p.input.length,
      p.input[0]?.length ?? 0,
      p.output.length,
      p.output[0]?.length ?? 0,
    ]),
    testInput.length,
    testInput[0]?.length ?? 0,
    userGrid.length,
    userGrid[0]?.length ?? 0,
  );
  const cellSize = maxGridDim > 15 ? 18 : maxGridDim > 10 ? 22 : 28;

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (submitted) return;
      setUserGrid((prev) => {
        const next = prev.map((r) => [...r]);
        // Cycle to next color if already painted with selected, otherwise paint
        if (next[row]![col] === selectedColor) {
          next[row]![col] = (selectedColor + 1) % 10;
        } else {
          next[row]![col] = selectedColor;
        }
        return next;
      });
    },
    [selectedColor, submitted],
  );

  const handleClear = useCallback(() => {
    if (submitted) return;
    const rows = userGrid.length;
    const cols = userGrid[0]?.length ?? 1;
    setUserGrid(
      Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => 0),
      ),
    );
  }, [userGrid, submitted]);

  const handleResize = useCallback(
    (dRows: number, dCols: number) => {
      if (submitted) return;
      setUserGrid((prev) => {
        const newRows = Math.max(1, Math.min(30, prev.length + dRows));
        const newCols = Math.max(1, Math.min(30, (prev[0]?.length ?? 1) + dCols));
        const next = Array.from({ length: newRows }, (_, r) =>
          Array.from({ length: newCols }, (_, c) => prev[r]?.[c] ?? 0),
        );
        return next;
      });
    },
    [submitted],
  );

  const handleSubmit = useCallback(() => {
    if (submitted) return;

    // Check correctness
    let correct = true;
    if (
      userGrid.length !== solutionGrid.length ||
      (userGrid[0]?.length ?? 0) !== (solutionGrid[0]?.length ?? 0)
    ) {
      correct = false;
    } else {
      for (let r = 0; r < solutionGrid.length && correct; r++) {
        for (let c = 0; c < (solutionGrid[r]?.length ?? 0); c++) {
          if (userGrid[r]![c] !== solutionGrid[r]![c]) {
            correct = false;
            break;
          }
        }
      }
    }

    setSubmitted(true);
    setIsCorrect(correct);
    onSubmit?.(userGrid, correct);
  }, [userGrid, solutionGrid, submitted, onSubmit]);

  return (
    <div className="flex flex-col gap-8">
      {/* Training Examples */}
      <section>
        <h3 className="text-sm font-semibold text-txt-secondary uppercase tracking-wider mb-4">
          Training Examples
        </h3>
        <div className="flex flex-col gap-6">
          {trainPairs.map((pair, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center justify-center gap-4 p-4 rounded-xl bg-background/50 border border-[#1e1e30]"
            >
              <ArcGridDisplay
                grid={pair.input}
                label={`Example ${i + 1} Input`}
                cellSize={cellSize}
              />
              <ArrowRight className="w-5 h-5 text-primary-light shrink-0" />
              <ArcGridDisplay
                grid={pair.output}
                label={`Example ${i + 1} Output`}
                cellSize={cellSize}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Test Puzzle */}
      <section>
        <h3 className="text-sm font-semibold text-txt-secondary uppercase tracking-wider mb-4">
          Test Puzzle
        </h3>
        <div className="flex flex-wrap items-start justify-center gap-6 p-4 rounded-xl bg-background/50 border border-[#1e1e30]">
          {/* Test input */}
          <ArcGridDisplay
            grid={testInput}
            label="Test Input"
            cellSize={cellSize}
          />

          <ArrowRight className="w-5 h-5 text-primary-light mt-8 shrink-0" />

          {/* User's editable output */}
          <ArcGridEditor
            grid={userGrid}
            selectedColor={selectedColor}
            onCellClick={handleCellClick}
            cellSize={cellSize}
          />
        </div>
      </section>

      {/* Controls */}
      {!submitted && (
        <div className="flex flex-col items-center gap-4">
          {/* Color palette */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-txt-secondary">
              Selected: <strong style={{ color: ARC_COLORS[selectedColor] }}>{ARC_COLOR_NAMES[selectedColor]}</strong>
            </span>
            <ColorPalette
              selectedColor={selectedColor}
              onSelectColor={setSelectedColor}
            />
          </div>

          {/* Grid resize controls */}
          <div className="flex items-center gap-3 text-xs text-txt-secondary">
            <span>Grid size: {userGrid.length} x {userGrid[0]?.length ?? 0}</span>
            <div className="flex items-center gap-1">
              <span>Rows:</span>
              <button
                onClick={() => handleResize(-1, 0)}
                className="w-6 h-6 rounded bg-background border border-[#3a3a58] flex items-center justify-center hover:border-primary-light transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleResize(1, 0)}
                className="w-6 h-6 rounded bg-background border border-[#3a3a58] flex items-center justify-center hover:border-primary-light transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span>Cols:</span>
              <button
                onClick={() => handleResize(0, -1)}
                className="w-6 h-6 rounded bg-background border border-[#3a3a58] flex items-center justify-center hover:border-primary-light transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleResize(0, 1)}
                className="w-6 h-6 rounded bg-background border border-[#3a3a58] flex items-center justify-center hover:border-primary-light transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#3a3a58] text-txt-secondary hover:border-primary-light hover:text-txt transition-colors text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </button>
            <button
              onClick={handleSubmit}
              className="btn-gradient flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
            >
              <Send className="w-4 h-4" />
              Submit Answer
            </button>
          </div>
        </div>
      )}

      {/* Result feedback */}
      {submitted && (
        <div
          className={`text-center p-6 rounded-xl border ${
            isCorrect
              ? 'border-green-500/50 bg-green-500/10'
              : 'border-red-500/50 bg-red-500/10'
          }`}
        >
          <p className={`text-lg font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {isCorrect ? 'Correct! You identified the pattern.' : 'Not quite right. Compare your output with the expected solution.'}
          </p>
          {!isCorrect && (
            <div className="mt-4 flex justify-center">
              <ArcGridDisplay
                grid={solutionGrid}
                label="Expected Output"
                cellSize={cellSize}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
