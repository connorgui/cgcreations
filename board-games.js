(function () {
  const kind = document.body.dataset.boardGame;
  const message = document.getElementById('game-message');
  const intro = document.getElementById('game-intro');
  const difficulty = document.querySelector('[data-difficulty]');
  const helpTitle = document.getElementById('game-help-title');
  const helpCopy = document.getElementById('game-help-copy');
  const stats = { wins: 0, draws: 0, losses: 0 };
  let level = 'medium';
  let mode = 'ai';
  let locked = false;
  let generation = 0;

  function updateStats() {
    Object.keys(stats).forEach((key) => { document.getElementById(key).textContent = String(stats[key]); });
    window.scoreTracker?.notifyScore?.();
  }

  function finish(result, copy) {
    locked = true;
    stats[result] += 1;
    message.textContent = copy;
    updateStats();
  }

  function pick(items) { return items[Math.floor(Math.random() * items.length)]; }
  function updateModeCopy() {
    const local = mode === 'local';
    document.getElementById('wins-label').textContent = local ? 'Player 1 Wins' : 'Wins';
    document.getElementById('draws-label').textContent = 'Draws';
    document.getElementById('losses-label').textContent = local ? 'Player 2 Wins' : 'Losses';
    difficulty.hidden = local;
    if (kind === 'tic') {
      intro.textContent = local
        ? 'Take turns on this device. Player 1 is X and Player 2 is O.'
        : 'You are X. Make three in a row before the computer does.';
      helpTitle.textContent = local ? 'Pass and play' : 'How it thinks';
      helpCopy.textContent = local
        ? 'Player 1 starts each round. Pass the device after every move.'
        : 'Easy plays randomly. Medium looks for wins and blocks. Hard searches every possible ending.';
    } else {
      intro.textContent = local
        ? 'Take turns on this device. Player 1 is red and Player 2 is yellow.'
        : 'You are red. Choose a column and connect four pieces before the yellow computer.';
      helpTitle.textContent = local ? 'Pass and play' : 'How it thinks';
      helpCopy.textContent = local
        ? 'Player 1 starts each round. Pass the device after every piece is dropped.'
        : 'Easy picks open columns. Medium wins or blocks immediate threats. Hard searches ahead and values the center.';
    }
  }
  function setMode(next) {
    mode = next;
    document.querySelectorAll('[data-mode]').forEach((button) => {
      const selected = button.dataset.mode === mode;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    updateModeCopy();
    start();
  }
  function setLevel(next) {
    level = next;
    document.querySelectorAll('[data-level]').forEach((button) => button.classList.toggle('is-selected', button.dataset.level === level));
    start();
  }

  document.querySelectorAll('[data-level]').forEach((button) => button.addEventListener('click', () => setLevel(button.dataset.level)));
  document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  document.querySelector('[data-new-game]').addEventListener('click', () => start());
  window.gameScoreApi = {
    getScoreSnapshot: () => ({ ...stats }),
    applyScoreSnapshot(saved) {
      ['wins', 'draws', 'losses'].forEach((key) => { stats[key] = Math.max(stats[key], Number(saved?.[key] || 0)); });
      updateStats();
    }
  };

  let start;
  if (kind === 'tic') {
    const boardEl = document.getElementById('tic-board');
    let board = Array(9).fill('');
    let turn = 'X';
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    function result(state) {
      for (const line of lines) {
        if (state[line[0]] && state[line[0]] === state[line[1]] && state[line[1]] === state[line[2]]) return { winner: state[line[0]], line };
      }
      return state.every(Boolean) ? { winner: 'draw', line: [] } : null;
    }
    function minimax(state, maximizing, depth = 0) {
      const ended = result(state);
      if (ended) return ended.winner === 'O' ? 10 - depth : ended.winner === 'X' ? depth - 10 : 0;
      const scores = [];
      state.forEach((cell, index) => {
        if (!cell) { state[index] = maximizing ? 'O' : 'X'; scores.push(minimax(state, !maximizing, depth + 1)); state[index] = ''; }
      });
      return maximizing ? Math.max(...scores) : Math.min(...scores);
    }
    function chooseMove() {
      const open = board.map((cell, index) => cell ? -1 : index).filter((index) => index >= 0);
      if (level === 'easy') return pick(open);
      const tactical = (mark) => open.find((index) => { board[index] = mark; const wins = result(board)?.winner === mark; board[index] = ''; return wins; });
      const win = tactical('O'); if (win !== undefined) return win;
      const block = tactical('X'); if (block !== undefined) return block;
      if (level === 'medium') return board[4] ? pick(open) : 4;
      let best = -Infinity; let move = open[0];
      open.forEach((index) => { board[index] = 'O'; const score = minimax(board, false); board[index] = ''; if (score > best) { best = score; move = index; } });
      return move;
    }
    function render(winning = []) {
      boardEl.innerHTML = '';
      board.forEach((mark, index) => {
        const cell = document.createElement('button'); cell.className = `tic-cell${winning.includes(index) ? ' is-winning' : ''}`; cell.type = 'button'; cell.dataset.mark = mark; cell.textContent = mark; cell.setAttribute('aria-label', mark ? `Square ${index + 1}: ${mark}` : `Square ${index + 1}: empty`);
        cell.addEventListener('click', () => play(index)); boardEl.appendChild(cell);
      });
    }
    function checkEnd() {
      const ended = result(board); if (!ended) return false; render(ended.line);
      if (ended.winner === 'X') finish('wins', mode === 'local' ? 'Player 1 wins with three X marks in a row!' : 'You won! Three X marks in a row.');
      else if (ended.winner === 'O') finish('losses', mode === 'local' ? 'Player 2 wins with three O marks in a row!' : 'The computer won this round. Try another plan.');
      else finish('draws', 'Draw. Every square is filled.');
      return true;
    }
    function play(index) {
      if (locked || board[index]) return;
      board[index] = mode === 'local' ? turn : 'X';
      render();
      if (checkEnd()) return;
      if (mode === 'local') {
        turn = turn === 'X' ? 'O' : 'X';
        message.textContent = `${turn === 'X' ? 'Player 1 (X)' : 'Player 2 (O)'}'s turn. Choose a square.`;
        return;
      }
      locked = true; message.textContent = 'Computer is thinking...';
      const currentGeneration = generation;
      setTimeout(() => {
        if (currentGeneration !== generation || mode !== 'ai') return;
        board[chooseMove()] = 'O'; locked = false; render(); if (!checkEnd()) message.textContent = 'Your turn. Choose a square.';
      }, 280);
    }
    start = () => {
      generation += 1;
      board = Array(9).fill(''); turn = 'X'; locked = false;
      message.textContent = mode === 'local' ? "Player 1 (X)'s turn. Choose a square." : 'Your turn. Choose a square.';
      render();
    };
  } else {
    const boardEl = document.getElementById('connect-board');
    const ROWS = 6, COLS = 7;
    let board = [];
    let turn = 'R';
    function validColumns(state) { return Array.from({length: COLS}, (_, col) => col).filter((col) => !state[0][col]); }
    function drop(state, col, player) { for (let row = ROWS - 1; row >= 0; row--) if (!state[row][col]) { state[row][col] = player; return row; } return -1; }
    function winning(state, p) {
      const dirs = [[0,1],[1,0],[1,1],[1,-1]];
      for (let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) for(const [dr,dc] of dirs) {
        let ok=true; for(let i=0;i<4;i++){const rr=r+dr*i,cc=c+dc*i;if(rr<0||rr>=ROWS||cc<0||cc>=COLS||state[rr][cc]!==p){ok=false;break;}} if(ok)return true;
      } return false;
    }
    function clone(state) { return state.map((row) => [...row]); }
    function scoreWindow(values) { const y=values.filter(x=>x==='Y').length,r=values.filter(x=>x==='R').length,e=4-y-r; if(y===4)return 100000;if(r===4)return -100000;if(y===3&&e===1)return 120;if(y===2&&e===2)return 14;if(r===3&&e===1)return -145;if(r===2&&e===2)return -12;return 0; }
    function evaluate(state) {
      let score=state.reduce((sum,row)=>sum+(row[3]==='Y'?7:row[3]==='R'?-7:0),0);
      const windows=[]; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS-3;c++)windows.push(state[r].slice(c,c+4)); for(let c=0;c<COLS;c++)for(let r=0;r<ROWS-3;r++)windows.push([0,1,2,3].map(i=>state[r+i][c])); for(let r=0;r<ROWS-3;r++)for(let c=0;c<COLS-3;c++)windows.push([0,1,2,3].map(i=>state[r+i][c+i])); for(let r=0;r<ROWS-3;r++)for(let c=3;c<COLS;c++)windows.push([0,1,2,3].map(i=>state[r+i][c-i])); return score+windows.reduce((s,w)=>s+scoreWindow(w),0);
    }
    function search(state, depth, alpha, beta, maximize) {
      const open=validColumns(state); if(winning(state,'Y'))return 1000000+depth;if(winning(state,'R'))return -1000000-depth;if(!depth||!open.length)return evaluate(state);
      if(maximize){let best=-Infinity;for(const col of open){const next=clone(state);drop(next,col,'Y');best=Math.max(best,search(next,depth-1,alpha,beta,false));alpha=Math.max(alpha,best);if(alpha>=beta)break;}return best;}
      let best=Infinity;for(const col of open){const next=clone(state);drop(next,col,'R');best=Math.min(best,search(next,depth-1,alpha,beta,true));beta=Math.min(beta,best);if(alpha>=beta)break;}return best;
    }
    function chooseMove() {
      const open=validColumns(board); if(level==='easy')return pick(open);
      for(const p of ['Y','R'])for(const col of open){const next=clone(board);drop(next,col,p);if(winning(next,p))return col;}
      if(level==='medium')return pick([...open].sort((a,b)=>Math.abs(a-3)-Math.abs(b-3)).slice(0,Math.min(3,open.length)));
      let best=-Infinity,moves=[];for(const col of open){const next=clone(board);drop(next,col,'Y');const score=search(next,5,-Infinity,Infinity,false);if(score>best){best=score;moves=[col];}else if(score===best)moves.push(col);}return pick(moves);
    }
    function render(lastRow=-1,lastCol=-1) { boardEl.innerHTML=''; board.forEach((row,r)=>row.forEach((piece,c)=>{const cell=document.createElement('button');cell.type='button';cell.className=`connect-cell ${piece==='R'?'red':piece==='Y'?'yellow':''}${r===lastRow&&c===lastCol?' last':''}`;cell.setAttribute('aria-label',`Column ${c+1}${piece?`, ${piece==='R'?'red':'yellow'}`:', empty'}`);cell.addEventListener('click',()=>play(c));boardEl.appendChild(cell);})); }
    function checkEnd(player) {
      if (winning(board, player)) {
        const copy = mode === 'local'
          ? `${player === 'R' ? 'Player 1 (red)' : 'Player 2 (yellow)'} connected four!`
          : player === 'R' ? 'You connected four!' : 'The computer connected four. Try again.';
        finish(player === 'R' ? 'wins' : 'losses', copy);
        return true;
      }
      if (!validColumns(board).length) { finish('draws', 'Draw. The board is full.'); return true; }
      return false;
    }
    function play(col) {
      if (locked || !validColumns(board).includes(col)) return;
      const player = mode === 'local' ? turn : 'R';
      const row = drop(board, col, player); render(row, col); if (checkEnd(player)) return;
      if (mode === 'local') {
        turn = turn === 'R' ? 'Y' : 'R';
        message.textContent = `${turn === 'R' ? 'Player 1 (red)' : 'Player 2 (yellow)'}'s turn. Choose a column.`;
        return;
      }
      locked = true; message.textContent = 'Computer is thinking...';
      const currentGeneration = generation;
      setTimeout(() => {
        if (currentGeneration !== generation || mode !== 'ai') return;
        const aiCol = chooseMove(); const aiRow = drop(board, aiCol, 'Y'); locked = false; render(aiRow, aiCol); if (!checkEnd('Y')) message.textContent = 'Your turn. Choose a column.';
      }, 320);
    }
    start = () => {
      generation += 1;
      board = Array.from({length:ROWS},()=>Array(COLS).fill('')); turn = 'R'; locked = false;
      message.textContent = mode === 'local' ? "Player 1 (red)'s turn. Choose a column." : 'Your turn. Choose a column.';
      render();
    };
  }
  updateModeCopy();
  start();
}());
