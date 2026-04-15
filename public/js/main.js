// main.js - Client entry point

const socket = io();
let myPlayerId = null;
let myGameId = null;
let isHost = false;
let selectedToken = 0;
let _gameState = null;

// ---- LOBBY ----

// Build token grid
const tokenGrid = document.getElementById('token-grid');
TOKEN_EMOJIS.forEach((emoji, i) => {
  const btn = document.createElement('button');
  btn.className = 'token-btn' + (i === 0 ? ' selected' : '');
  btn.textContent = emoji;
  btn.title = TOKEN_NAMES[i];
  btn.onclick = () => {
    document.querySelectorAll('.token-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedToken = i;
  };
  tokenGrid.appendChild(btn);
});

document.getElementById('btn-create').onclick = () => {
  const name = document.getElementById('player-name').value.trim() || 'Player 1';
  socket.emit('create_game', { playerName: name, tokenIndex: selectedToken });
};

document.getElementById('btn-join').onclick = () => {
  const name = document.getElementById('player-name').value.trim() || 'Player';
  const code = document.getElementById('game-code').value.trim().toUpperCase();
  if (!code) { alert('Enter a game code!'); return; }
  socket.emit('join_game', { gameId: code, playerName: name, tokenIndex: selectedToken });
};

document.getElementById('btn-start').onclick = () => {
  socket.emit('start_game');
};

document.getElementById('btn-copy-code').onclick = () => {
  const code = document.getElementById('room-code-text').textContent;
  navigator.clipboard.writeText(code).then(() => {
    document.getElementById('btn-copy-code').textContent = '✅ Copied!';
    setTimeout(() => document.getElementById('btn-copy-code').textContent = '📋 Copy', 2000);
  });
};

// ---- SOCKET EVENTS ----

socket.on('joined_game', ({ gameId, playerId, isHost: host }) => {
  myPlayerId = playerId;
  myGameId = gameId;
  isHost = host;

  // Save for reconnect
  sessionStorage.setItem('monopoly_game', gameId);
  sessionStorage.setItem('monopoly_player', playerId);

  document.getElementById('join-form').classList.add('hidden');
  document.getElementById('waiting-room').classList.remove('hidden');
  document.getElementById('room-code-text').textContent = gameId;

  if (host) {
    document.getElementById('btn-start').classList.remove('hidden');
    document.getElementById('waiting-msg').style.display = 'none';
  }
});

socket.on('game_state', (state) => {
  _gameState = state;
  window._lastGameState = state;

  if (state.phase === 'ended' && state.winner) {
    showScreen('winner');
    document.getElementById('winner-name').textContent = `${state.winner.token} ${state.winner.name}`;
    return;
  }

  if (state.phase === 'playing') {
    showScreen('game');

    // Build board once
    if (!window._boardBuilt) {
      buildBoard();
      window._boardBuilt = true;
    }

    const myPlayer = state.players.find(p => p.id === myPlayerId);
    renderPlayers(state.players, state.currentPlayerIndex, myPlayerId);
    renderMyInfo(myPlayer);
    renderActionButtons(state, myPlayerId);
    renderMyProperties(state.properties, myPlayerId, state);
    renderLog(state.log);
    renderDice(state.lastDice);
    renderAuction(state.auction, myPlayerId);
    renderTradePending(state.trades, myPlayerId);
    updateBoardProperties(state.properties, state.players);
    updateTokenPositions(state.players);

    // Turn indicator
    const cp = state.players[state.currentPlayerIndex];
    const turnEl = document.getElementById('turn-indicator');
    if (turnEl && cp) {
      turnEl.textContent = cp.id === myPlayerId ? "Your turn!" : `${cp.token} ${cp.name}'s turn`;
    }

    // Free parking pot
    const fpEl = document.getElementById('free-parking-pot');
    if (fpEl && state.freeParkingPot > 0) {
      fpEl.textContent = `🅿️ $${state.freeParkingPot.toLocaleString()}`;
    } else if (fpEl) {
      fpEl.textContent = '';
    }

    return;
  }

  // Lobby phase
  if (state.phase === 'lobby') {
    const lobbyList = document.getElementById('player-list-lobby');
    if (lobbyList) {
      lobbyList.innerHTML = '';
      state.players.forEach(p => {
        const div = document.createElement('div');
        div.className = 'lobby-player';
        div.innerHTML = `<span class="token">${p.token}</span><span class="pname">${p.name}${p.id === myPlayerId ? ' (you)' : ''}</span>${p.isHost ? '<span class="host-badge">HOST</span>' : ''}`;
        lobbyList.appendChild(div);
      });
    }
    if (isHost && state.players.length >= 2) {
      document.getElementById('btn-start').classList.remove('hidden');
    }
  }
});

socket.on('error', (msg) => {
  // Show brief toast
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#c0392b;color:white;padding:10px 20px;border-radius:8px;z-index:9999;font-size:14px;font-weight:600;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
});

// ---- GAME ACTIONS ----

window.gameActions = {
  rollDice: () => socket.emit('roll_dice'),
  buyProperty: () => socket.emit('buy_property'),
  declineBuy: () => socket.emit('decline_buy'),
  endTurn: () => socket.emit('end_turn'),
  buildHouse: (spaceId) => socket.emit('build_house', { spaceId }),
  sellHouse: (spaceId) => socket.emit('sell_house', { spaceId }),
  mortgage: (spaceId) => socket.emit('mortgage', { spaceId }),
  unmortgage: (spaceId) => socket.emit('unmortgage', { spaceId }),
  payJail: () => socket.emit('pay_jail'),
  useJailCard: () => socket.emit('use_jail_card'),
  placeBid: () => {
    const amount = parseInt(document.getElementById('bid-amount')?.value);
    if (!amount || amount <= 0) return;
    socket.emit('place_bid', { amount });
  },
  endAuction: () => socket.emit('end_auction'),
  offerTrade: (targetPlayerId, offer) => socket.emit('offer_trade', { targetPlayerId, offer }),
  acceptTrade: (tradeId) => socket.emit('accept_trade', { tradeId }),
  rejectTrade: (tradeId) => socket.emit('reject_trade', { tradeId }),
};

window.onCellClick = function(spaceId) {
  if (!_gameState) return;
  const prop = _gameState.properties[spaceId];
  const space = window.BOARD_DATA?.[spaceId];
  if (!space) return;

  if (prop) {
    const isOwner = prop.ownerId === myPlayerId;
    const isMyTurn = _gameState.players[_gameState.currentPlayerIndex]?.id === myPlayerId;
    window.openPropertyModal(space, prop, myPlayerId, _gameState, isMyTurn && isOwner);
  } else if (['property','railroad','utility'].includes(space.type)) {
    showModal(space.name, `<strong>${space.name}</strong><br>Price: $${space.price || '?'}<br>Unowned — available for purchase.`, [
      { text: 'Close', cls: 'btn-gray' }
    ]);
  }
};

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(`screen-${name}`).classList.remove('hidden');
}

// Reconnect logic
window.addEventListener('load', () => {
  const savedGame = sessionStorage.getItem('monopoly_game');
  const savedPlayer = sessionStorage.getItem('monopoly_player');
  if (savedGame && savedPlayer) {
    socket.emit('rejoin_game', { gameId: savedGame, playerId: savedPlayer });
  }
});
