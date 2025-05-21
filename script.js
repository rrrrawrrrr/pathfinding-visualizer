let gridSize = 10;
let mode = 'wall';
let start = null;
let end = null;
let grid = [];
let speed = 30;

document.addEventListener('DOMContentLoaded', () => {
  createGrid(gridSize);

  document.getElementById('algorithm').addEventListener('change', resetPathOnly);
  document.getElementById('gridSize').addEventListener('change', () => {
    const newSize = parseInt(document.getElementById('gridSize').value);
    if (newSize >= 10 && newSize <= 30) {
      gridSize = newSize;
      createGrid(gridSize);
    }
  });
  document.getElementById('speedControl').addEventListener('change', () => {
    const val = document.getElementById('speedControl').value;
    speed = val === 'slow' ? 100 : val === 'medium' ? 50 : 10;
  });
  document.getElementById('saveGrid').addEventListener('click', saveGrid);
  document.getElementById('loadGrid').addEventListener('click', loadGrid);
  document.getElementById('generateMaze').addEventListener('click', generateMaze);
});

function createGrid(size) {
  const gridEl = document.getElementById('grid');
  gridEl.innerHTML = '';
  grid = [];
  start = null;
  end = null;

  const cellSize = Math.floor(400 / size);
  gridEl.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
  gridEl.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;

  for (let row = 0; row < size; row++) {
    const rowArr = [];
    for (let col = 0; col < size; col++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.style.width = `${cellSize}px`;
      cell.style.height = `${cellSize}px`;
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.addEventListener('click', () => onCellClick(cell));
      gridEl.appendChild(cell);
      rowArr.push({ el: cell, type: 'empty', row, col, dist: Infinity, visited: false, prev: null, f: Infinity, weight: 1 });
    }
    grid.push(rowArr);
  }
}

function setMode(newMode) {
  mode = newMode;
}

function onCellClick(cell) {
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);
  const node = grid[row][col];

  if (mode === 'start') {
    if (start) start.el.classList.remove('start');
    start = node;
    node.type = 'start';
    cell.classList.add('start');
  } else if (mode === 'end') {
    if (end) end.el.classList.remove('end');
    end = node;
    node.type = 'end';
    cell.classList.add('end');
  } else if (mode === 'wall') {
    node.type = 'wall';
    cell.classList.add('wall');
  } else if (mode === 'weight') {
    node.weight = 5;
    cell.classList.add('weight');
  }
}

function heuristic(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function resetPathOnly() {
  for (let row of grid)
    for (let node of row) {
      node.visited = false;
      node.dist = Infinity;
      node.prev = null;
      node.f = Infinity;
      node.el.classList.remove('visited', 'path');
    }
}

function clearGrid() {
  for (let row of grid)
    for (let node of row) {
      node.el.className = 'cell';
      Object.assign(node, {
        type: 'empty',
        dist: Infinity,
        visited: false,
        prev: null,
        f: Infinity,
        weight: 1
      });
    }
  start = null;
  end = null;
}

function getNeighbors(node) {
  const { row, col } = node;
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  if (document.getElementById('allowDiagonal')?.checked) {
    dirs.push([1, 1], [-1, -1], [1, -1], [-1, 1]);
  }

  const neighbors = [];
  for (const [dr, dc] of dirs) {
    const r = row + dr, c = col + dc;
    if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
      neighbors.push(grid[r][c]);
    }
  }
  return neighbors;
}

async function findPath() {
  if (!start || !end) return alert("Set start and end points!");
  const algo = document.getElementById('algorithm').value;

  resetPathOnly();

  const openSet = [start];
  start.dist = 0;
  start.f = heuristic(start, end);

  while (openSet.length > 0) {
    openSet.sort((a, b) => (algo === "astar" ? a.f : a.dist) - (algo === "astar" ? b.f : b.dist));
    const current = openSet.shift();
    if (current.visited) continue;
    current.visited = true;

    if (current !== start && current !== end) {
      current.el.classList.add('visited');
      setTimeout(() => {
        current.el.classList.remove('visited');
      }, speed * 1.5);
    }

    if (current === end) break;

    for (const neighbor of getNeighbors(current)) {
      if (neighbor.type === 'wall' || neighbor.visited) continue;
      const tentativeG = current.dist + neighbor.weight;
      if (tentativeG < neighbor.dist) {
        neighbor.dist = tentativeG;
        neighbor.prev = current;
        neighbor.f = tentativeG + heuristic(neighbor, end);
        openSet.push(neighbor);
      }
    }

    await new Promise(r => setTimeout(r, speed));
  }

  let current = end;
  const path = [];
  while (current && current !== start) {
    path.push(current);
    current = current.prev;
  }

  for (const cell of path.reverse()) {
    if (cell !== end) cell.el.classList.add('path');
    await new Promise(r => setTimeout(r, speed / 2));
  }
}

function saveGrid() {
  const saved = grid.map(row => row.map(node => ({
    type: node.type,
    weight: node.weight
  })));
  localStorage.setItem('pathGrid', JSON.stringify({ gridSize, saved }));
  alert("Grid saved!");
}

function loadGrid() {
  const data = JSON.parse(localStorage.getItem('pathGrid'));
  if (!data) return alert("No saved grid found!");

  gridSize = data.gridSize;
  document.getElementById('gridSize').value = gridSize;
  createGrid(gridSize);

  data.saved.forEach((row, r) => {
    row.forEach((node, c) => {
      const cell = grid[r][c];
      if (node.type === 'start') {
        setMode('start');
        onCellClick(cell.el);
      } else if (node.type === 'end') {
        setMode('end');
        onCellClick(cell.el);
      } else if (node.type === 'wall') {
        setMode('wall');
        onCellClick(cell.el);
      }
      if (node.weight > 1) {
        cell.weight = node.weight;
        cell.el.classList.add('weight');
      }
    });
  });

  setMode('wall');
}

function generateMaze() {
  clearGrid();
  for (let row of grid) {
    for (let node of row) {
      if (Math.random() < 0.3 && node !== start && node !== end) {
        node.type = 'wall';
        node.el.classList.add('wall');
      }
    }
  }
}
