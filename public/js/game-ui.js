// game-ui.js - UI rendering for the game

const TOKEN_EMOJIS = ["🎩", "🚂", "🐶", "🚗", "👢", "⛵", "🎯", "🐱"];
const TOKEN_NAMES = ["Top Hat", "Train", "Dog", "Car", "Boot", "Ship", "Iron", "Cat"];

const SPACE_NAMES = window.BOARD_DATA ? window.BOARD_DATA.map(s => s.name) : [];

function renderPlayers(players, currentPlayerIndex, myPlayerId) {
  const list = document.getElementById('players-list');
  if (!list) return;
  list.innerHTML = '';
  players.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'player-item' + (i === currentPlayerIndex ? ' active-turn' : '') + (p.bankrupt ? ' bankrupt' : '');
    div.innerHTML = `
      <div class="p-token">${p.token}</div>
      <div class="p-info">
        <div class="p-name">${p.name}${p.id === myPlayerId ? ' (you)' : ''}${p.isHost ? ' 👑' : ''}</div>
        <div class="p-money">$${p.money.toLocaleString()}</div>
        <div class="p-pos">${getSpaceName(p.position)}${p.inJail ? ' <span class="in-jail-badge">IN JAIL</span>' : ''}</div>
      </div>
    `;
    list.appendChild(div);
  });
}

function getSpaceName(pos) {
  return (window.BOARD_DATA && window.BOARD_DATA[pos]) ? window.BOARD_DATA[pos].name : `Space ${pos}`;
}

function renderMyInfo(player) {
  const panel = document.getElementById('my-info-panel');
  if (!panel || !player) return;
  panel.innerHTML = `
    <div class="my-token">${player.token}</div>
    <div class="my-name">${player.name}</div>
    <div class="my-money">$${player.money.toLocaleString()}</div>
    <div class="my-pos">${getSpaceName(player.position)}${player.inJail ? ' 🚔 IN JAIL' : ''}</div>
    ${player.jailFreeCards > 0 ? `<div style="font-size:12px;color:#4caf50;margin-top:4px;">🃏 ${player.jailFreeCards}x Get Out of Jail Free</div>` : ''}
  `;
}

function renderActionButtons(gameState, myPlayerId) {
  const panel = document.getElementById('action-btns');
  if (!panel) return;
  panel.innerHTML = '';

  const myPlayer = gameState.players.find(p => p.id === myPlayerId);
  if (!myPlayer || myPlayer.bankrupt) return;

  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === myPlayerId;
  const phase = gameState.turnPhase;

  if (!isMyTurn) {
    const msg = document.createElement('div');
    msg.style.cssText = 'font-size:13px;color:var(--text2);text-align:center;padding:10px;';
    const cp = gameState.players[gameState.currentPlayerIndex];
    msg.textContent = cp ? `${cp.token} ${cp.name}'s turn...` : 'Waiting...';
    panel.appendChild(msg);
    return;
  }

  // Jail options
  if (myPlayer.inJail && phase === 'roll') {
    addBtn(panel, '🎲 Roll (try doubles)', 'btn-blue', () => window.gameActions.rollDice());
    if (myPlayer.money >= 50) addBtn(panel, '💵 Pay $50 Fine', 'btn-gray', () => window.gameActions.payJail());
    if (myPlayer.jailFreeCards > 0) addBtn(panel, '🃏 Use Jail Free Card', 'btn-gold', () => window.gameActions.useJailCard());
    return;
  }

  if (phase === 'roll') {
    addBtn(panel, '🎲 Roll Dice', 'btn-green', () => window.gameActions.rollDice());
  }

  if (phase === 'buy') {
    const space = window.BOARD_DATA?.[myPlayer.position];
    if (space) {
      addBtn(panel, `💰 Buy ${space.name} ($${space.price})`, 'btn-gold', () => window.gameActions.buyProperty());
      addBtn(panel, '🔨 Auction Instead', 'btn-gray', () => window.gameActions.declineBuy());
    }
  }

  if (phase === 'end') {
    addBtn(panel, '✅ End Turn', 'btn-green', () => window.gameActions.endTurn());
  }

  // Always available: trade button
  if (gameState.players.filter(p => !p.bankrupt && p.id !== myPlayerId).length > 0) {
    addBtn(panel, '🤝 Trade', 'btn-gray btn-sm', () => window.openTradeModal(gameState, myPlayerId));
  }
}

function addBtn(parent, text, cls, onClick) {
  const btn = document.createElement('button');
  btn.className = `btn ${cls}`;
  btn.innerHTML = text;
  btn.onclick = onClick;
  parent.appendChild(btn);
}

function renderMyProperties(properties, myPlayerId, gameState) {
  const list = document.getElementById('my-properties-list');
  if (!list) return;
  list.innerHTML = '';

  const myProps = Object.entries(properties)
    .filter(([, prop]) => prop.ownerId === myPlayerId)
    .map(([id]) => window.BOARD_DATA?.[parseInt(id)])
    .filter(Boolean);

  if (myProps.length === 0) {
    list.innerHTML = '<div style="font-size:12px;color:var(--text2)">No properties yet.</div>';
    return;
  }

  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === myPlayerId;

  myProps.forEach(space => {
    const prop = properties[space.id];
    const div = document.createElement('div');
    div.className = 'prop-item';
    const colorMap = { brown:'#8B4513', lightblue:'#87CEEB', pink:'#FF69B4', orange:'#FF8C00', red:'#DC143C', yellow:'#FFD700', green:'#228B22', darkblue:'#00008B' };
    const dotColor = colorMap[space.color] || (space.type === 'railroad' ? '#555' : '#68a');
    let houseStr = '';
    if (prop.houses === 5) houseStr = '🏨 Hotel';
    else if (prop.houses > 0) houseStr = '🏠'.repeat(prop.houses);

    div.innerHTML = `
      <div class="prop-color-dot" style="background:${dotColor}"></div>
      <span class="prop-name">${space.name}</span>
      ${houseStr ? `<span class="prop-houses-str">${houseStr}</span>` : ''}
      ${prop.mortgaged ? '<span class="prop-mortgaged-str">MORTGAGED</span>' : ''}
    `;
    div.onclick = () => window.openPropertyModal(space, prop, myPlayerId, gameState, isMyTurn);
    list.appendChild(div);
  });
}

function renderLog(log) {
  const el = document.getElementById('game-log');
  if (!el) return;
  el.innerHTML = '';
  log.slice(0, 15).forEach(entry => {
    const div = document.createElement('div');
    div.className = 'log-item';
    div.textContent = entry.msg;
    el.appendChild(div);
  });
}

function renderDice(dice) {
  const d1 = document.getElementById('dice1');
  const d2 = document.getElementById('dice2');
  if (!d1 || !d2 || !dice) return;
  const faces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  d1.textContent = faces[dice[0]] || dice[0];
  d2.textContent = faces[dice[1]] || dice[1];
  d1.classList.add('rolling');
  d2.classList.add('rolling');
  setTimeout(() => { d1.classList.remove('rolling'); d2.classList.remove('rolling'); }, 600);
}

function renderAuction(auction, myPlayerId) {
  let panel = document.getElementById('auction-panel');
  if (!auction) {
    if (panel) panel.remove();
    return;
  }

  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'auction-panel';
    document.getElementById('action-btns').before(panel);
  }

  const isCurrentPlayer = window._lastGameState?.players?.[window._lastGameState.currentPlayerIndex]?.id === myPlayerId;

  panel.innerHTML = `
    <h4>🔨 AUCTION: ${auction.spaceName}</h4>
    <div style="font-size:12px;color:var(--text2);margin-bottom:6px;">
      Current bid: <strong style="color:var(--gold)">$${auction.currentBid}</strong>
      ${auction.currentBidder ? `by ${window._lastGameState?.players?.find(p=>p.id===auction.currentBidder)?.name || '?'}` : '(none)'}
    </div>
    <div class="auction-bid-row">
      <input type="number" id="bid-amount" placeholder="Your bid" min="${auction.currentBid + 1}" />
      <button class="btn btn-gold btn-sm" onclick="window.gameActions.placeBid()">Bid</button>
    </div>
    ${isCurrentPlayer ? `<button class="btn btn-red btn-sm" style="margin-top:8px;width:100%;" onclick="window.gameActions.endAuction()">🔨 End Auction</button>` : ''}
  `;
}

function renderTradePending(trades, myPlayerId) {
  const panel = document.getElementById('trade-panel');
  const content = document.getElementById('trade-content');
  if (!panel || !content) return;

  const pending = (trades || []).filter(t => t.to === myPlayerId && t.status === 'pending');
  if (pending.length === 0) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');
  content.innerHTML = '';
  pending.forEach(trade => {
    const div = document.createElement('div');
    div.className = 'trade-offer-item';
    const fromName = window._lastGameState?.players?.find(p=>p.id===trade.from)?.name || '?';
    const o = trade.offer;
    let desc = `From ${fromName}:`;
    if (o.fromMoney) desc += ` They give $${o.fromMoney}`;
    if (o.toMoney) desc += ` You give $${o.toMoney}`;
    if (o.fromProperties?.length) desc += ` + ${o.fromProperties.length} prop(s)`;
    if (o.toProperties?.length) desc += ` for ${o.toProperties.length} prop(s)`;
    div.innerHTML = `<div style="font-size:12px;margin-bottom:6px;">${desc}</div>
      <div class="trade-btns">
        <button class="btn btn-green btn-sm" onclick="window.gameActions.acceptTrade('${trade.id}')">Accept</button>
        <button class="btn btn-red btn-sm" onclick="window.gameActions.rejectTrade('${trade.id}')">Reject</button>
      </div>`;
    content.appendChild(div);
  });
}

function showModal(title, body, buttons) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  const btnsEl = document.getElementById('modal-btns');
  btnsEl.innerHTML = '';
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.className = `btn ${b.cls || 'btn-gray'}`;
    btn.textContent = b.text;
    btn.onclick = () => { hideModal(); b.action?.(); };
    btnsEl.appendChild(btn);
  });
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

window.openPropertyModal = function(space, prop, myPlayerId, gameState, isMyTurn) {
  const houseCosts = { brown:50, lightblue:50, pink:100, orange:100, red:150, yellow:150, green:200, darkblue:200 };
  const rentTable = {
    1: [2,10,30,90,160,250], 2: [6,30,90,270,400,550], 3: [10,50,150,450,625,750],
    4: [14,70,200,550,750,950], 5: [18,90,250,700,875,1050], 6: [22,110,330,800,975,1150],
    7: [26,130,390,900,1100,1275], 8: [35,175,500,1100,1300,1500]
  };

  const rents = space.group ? rentTable[space.group] : null;
  const currentHouses = prop.houses || 0;
  const houseLabel = currentHouses === 5 ? '🏨 Hotel' : currentHouses > 0 ? `🏠×${currentHouses}` : 'No buildings';

  let body = `<strong>${space.name}</strong><br>`;
  body += `<span style="color:var(--text2)">Status: ${prop.mortgaged ? '⚠️ MORTGAGED' : '✅ Active'}</span><br>`;
  body += `<span style="color:var(--text2)">Buildings: ${houseLabel}</span><br>`;

  if (rents) {
    body += `<br><strong>Rent Table:</strong><br>`;
    const labels = ['Unimproved','1 House','2 Houses','3 Houses','4 Houses','Hotel'];
    rents.forEach((r, i) => {
      body += `<span style="font-size:12px;color:${i===currentHouses?'#4caf50':'var(--text2)'}">${labels[i]}: $${r}</span><br>`;
    });
  }

  const btns = [{ text: 'Close', cls: 'btn-gray' }];

  if (isMyTurn && !prop.mortgaged && space.color && currentHouses < 5) {
    btns.unshift({ text: `🏠 Build (+$${houseCosts[space.color] || 100})`, cls: 'btn-green', action: () => window.gameActions.buildHouse(space.id) });
  }
  if (isMyTurn && currentHouses > 0) {
    btns.push({ text: `🔨 Sell House (+$${Math.floor((houseCosts[space.color]||100)/2)})`, cls: 'btn-gold', action: () => window.gameActions.sellHouse(space.id) });
  }
  if (!prop.mortgaged && currentHouses === 0) {
    btns.push({ text: '📉 Mortgage', cls: 'btn-red', action: () => window.gameActions.mortgage(space.id) });
  }
  if (prop.mortgaged) {
    btns.push({ text: '📈 Unmortgage', cls: 'btn-gold', action: () => window.gameActions.unmortgage(space.id) });
  }

  showModal(space.name, body, btns);
};

window.openTradeModal = function(gameState, myPlayerId) {
  const others = gameState.players.filter(p => !p.bankrupt && p.id !== myPlayerId);
  if (others.length === 0) return;

  const myProps = Object.entries(gameState.properties)
    .filter(([, prop]) => prop.ownerId === myPlayerId)
    .map(([id]) => window.BOARD_DATA?.[parseInt(id)])
    .filter(Boolean);

  function getTargetProps(targetId) {
    return Object.entries(gameState.properties)
      .filter(([, prop]) => prop.ownerId === targetId)
      .map(([id]) => window.BOARD_DATA?.[parseInt(id)])
      .filter(Boolean);
  }

  function renderTargetProps(targetId) {
    const container = document.getElementById('trade-to-props');
    if (!container) return;
    const targetProps = getTargetProps(targetId);
    if (targetProps.length === 0) {
      container.innerHTML = '<span style="font-size:12px;color:var(--text2);">No properties owned.</span>';
    } else {
      container.innerHTML = targetProps.map(s =>
        `<label style="display:block;font-size:12px;padding:2px 0;"><input type="checkbox" value="${s.id}"> ${s.name}</label>`
      ).join('');
    }
  }

  const firstTarget = others[0].id;

  let body = `<div style="font-size:13px;">
    <label>Trade with:</label>
    <select id="trade-target" style="width:100%;margin:8px 0;padding:8px;background:#0f1e14;border:1px solid var(--border);border-radius:6px;color:var(--text);">
      ${others.map(p => `<option value="${p.id}">${p.token} ${p.name}</option>`).join('')}
    </select>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <div style="flex:1;min-width:120px;">
        <label>You give: $<input type="number" id="trade-from-money" value="0" min="0" style="width:70px;padding:4px;background:#0f1e14;border:1px solid var(--border);border-radius:4px;color:var(--text);" /></label>
      </div>
      <div style="flex:1;min-width:120px;">
        <label>You get: $<input type="number" id="trade-to-money" value="0" min="0" style="width:70px;padding:4px;background:#0f1e14;border:1px solid var(--border);border-radius:4px;color:var(--text);" /></label>
      </div>
    </div>
    ${myProps.length > 0 ? `<label style="display:block;margin-top:10px;font-weight:600;color:var(--text);">Your properties to give:</label>
    <div id="trade-from-props" style="max-height:100px;overflow-y:auto;padding:4px 0;">${myProps.map(s => `<label style="display:block;font-size:12px;padding:2px 0;"><input type="checkbox" value="${s.id}"> ${s.name}</label>`).join('')}</div>` : ''}
    <label style="display:block;margin-top:10px;font-weight:600;color:var(--text);">Properties you want:</label>
    <div id="trade-to-props" style="max-height:100px;overflow-y:auto;padding:4px 0;"></div>
  </div>`;

  showModal('🤝 Propose Trade', body, [
    { text: 'Send Offer', cls: 'btn-green', action: () => {
      const targetId = document.getElementById('trade-target').value;
      const fromMoney = parseInt(document.getElementById('trade-from-money').value) || 0;
      const toMoney = parseInt(document.getElementById('trade-to-money').value) || 0;
      const fromProperties = [...(document.getElementById('trade-from-props')?.querySelectorAll('input:checked') || [])].map(i => parseInt(i.value));
      const toProperties = [...(document.getElementById('trade-to-props')?.querySelectorAll('input:checked') || [])].map(i => parseInt(i.value));
      window.gameActions.offerTrade(targetId, { fromMoney, toMoney, fromProperties, toProperties });
    }},
    { text: 'Cancel', cls: 'btn-gray' }
  ]);

  // Render initial target props and listen for changes
  renderTargetProps(firstTarget);
  document.getElementById('trade-target').addEventListener('change', (e) => {
    renderTargetProps(e.target.value);
  });
};

window.showModal = showModal;
window.hideModal = hideModal;
window.renderPlayers = renderPlayers;
window.renderMyInfo = renderMyInfo;
window.renderActionButtons = renderActionButtons;
window.renderMyProperties = renderMyProperties;
window.renderLog = renderLog;
window.renderDice = renderDice;
window.renderAuction = renderAuction;
window.renderTradePending = renderTradePending;
