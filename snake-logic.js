(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.snakeGameLogic = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DIRECTIONS = Object.freeze({
    up: "up",
    down: "down",
    left: "left",
    right: "right"
  });

  const DIRECTION_VECTORS = Object.freeze({
    up: Object.freeze({ x: 0, y: -1 }),
    down: Object.freeze({ x: 0, y: 1 }),
    left: Object.freeze({ x: -1, y: 0 }),
    right: Object.freeze({ x: 1, y: 0 })
  });

  const DIRECTION_VALUES = Object.freeze(Object.values(DIRECTIONS));
  const DEFAULT_GRID_SIZE = 16;
  const DEFAULT_DIRECTION = DIRECTIONS.right;

  function cloneCell(cell) {
    return { x: cell.x, y: cell.y };
  }

  function cellsEqual(left, right) {
    return Boolean(left && right) && left.x === right.x && left.y === right.y;
  }

  function cellKey(cell) {
    return `${cell.x},${cell.y}`;
  }

  function isDirection(value) {
    return DIRECTION_VALUES.includes(value);
  }

  function areOppositeDirections(left, right) {
    return (
      (left === DIRECTIONS.up && right === DIRECTIONS.down) ||
      (left === DIRECTIONS.down && right === DIRECTIONS.up) ||
      (left === DIRECTIONS.left && right === DIRECTIONS.right) ||
      (left === DIRECTIONS.right && right === DIRECTIONS.left)
    );
  }

  function getInitialSnake(gridSize) {
    const centerY = Math.floor(gridSize / 2);
    const headX = Math.max(2, Math.floor(gridSize / 2));

    return [
      { x: headX, y: centerY },
      { x: headX - 1, y: centerY },
      { x: headX - 2, y: centerY }
    ];
  }

  function listEmptyCells(snake, gridSize) {
    const occupied = new Set(snake.map(cellKey));
    const emptyCells = [];

    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        const cell = { x, y };
        if (!occupied.has(cellKey(cell))) {
          emptyCells.push(cell);
        }
      }
    }

    return emptyCells;
  }

  function spawnFood(snake, gridSize, rng) {
    const random = typeof rng === "function" ? rng : Math.random;
    const emptyCells = listEmptyCells(snake, gridSize);

    if (!emptyCells.length) {
      return null;
    }

    const roll = Number(random());
    const safeRoll = Number.isFinite(roll) ? roll : 0;
    const index = Math.max(0, Math.min(emptyCells.length - 1, Math.floor(safeRoll * emptyCells.length)));
    return cloneCell(emptyCells[index]);
  }

  function createInitialState(options = {}) {
    const gridSize = Number.isInteger(options.gridSize) && options.gridSize >= 6
      ? options.gridSize
      : DEFAULT_GRID_SIZE;
    const snake = getInitialSnake(gridSize);

    return {
      gridSize,
      snake,
      direction: DEFAULT_DIRECTION,
      pendingDirection: DEFAULT_DIRECTION,
      food: spawnFood(snake, gridSize, options.rng),
      score: 0,
      isGameOver: false,
      gameOverReason: null,
      tickCount: 0
    };
  }

  function requestDirection(state, nextDirection) {
    if (!state || state.isGameOver || !isDirection(nextDirection)) {
      return state;
    }

    if (state.snake.length > 1 && areOppositeDirections(state.direction, nextDirection)) {
      return state;
    }

    if (state.pendingDirection === nextDirection) {
      return state;
    }

    return {
      ...state,
      pendingDirection: nextDirection
    };
  }

  function stepGame(state, rng) {
    if (!state || state.isGameOver) {
      return state;
    }

    const nextDirection = isDirection(state.pendingDirection) ? state.pendingDirection : state.direction;
    const direction = state.snake.length > 1 && areOppositeDirections(state.direction, nextDirection)
      ? state.direction
      : nextDirection;
    const movement = DIRECTION_VECTORS[direction];
    const currentHead = state.snake[0];
    const nextHead = {
      x: currentHead.x + movement.x,
      y: currentHead.y + movement.y
    };
    const ateFood = cellsEqual(nextHead, state.food);
    const collisionBody = ateFood ? state.snake : state.snake.slice(0, -1);
    const hitWall =
      nextHead.x < 0 ||
      nextHead.y < 0 ||
      nextHead.x >= state.gridSize ||
      nextHead.y >= state.gridSize;
    const hitSelf = collisionBody.some((segment) => cellsEqual(segment, nextHead));

    if (hitWall || hitSelf) {
      return {
        ...state,
        direction,
        pendingDirection: direction,
        isGameOver: true,
        gameOverReason: hitWall ? "wall" : "self"
      };
    }

    const nextSnake = [nextHead, ...state.snake.map(cloneCell)];
    if (!ateFood) {
      nextSnake.pop();
    }

    let nextFood = state.food ? cloneCell(state.food) : null;
    let isGameOver = false;
    let gameOverReason = null;

    if (ateFood) {
      nextFood = spawnFood(nextSnake, state.gridSize, rng);
      if (!nextFood) {
        isGameOver = true;
        gameOverReason = "win";
      }
    }

    return {
      ...state,
      snake: nextSnake,
      direction,
      pendingDirection: direction,
      food: nextFood,
      score: state.score + (ateFood ? 1 : 0),
      isGameOver,
      gameOverReason,
      tickCount: state.tickCount + 1
    };
  }

  return {
    DEFAULT_GRID_SIZE,
    DIRECTIONS,
    DIRECTION_VECTORS,
    areOppositeDirections,
    cellsEqual,
    createInitialState,
    listEmptyCells,
    requestDirection,
    spawnFood,
    stepGame
  };
});
