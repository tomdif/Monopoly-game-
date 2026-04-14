:root {
  --green: #1a7a3f;
  --green-light: #2da05a;
  --red: #c0392b;
  --blue: #2980b9;
  --yellow: #f1c40f;
  --bg: #0f2218;
  --card: #1a3a28;
  --card2: #142d1f;
  --text: #e8f5e9;
  --text2: #a8c8b0;
  --border: #2a5a3a;
  --gold: #d4af37;
  --shadow: 0 4px 24px rgba(0,0,0,0.5);

  --brown: #8B4513;
  --lightblue: #87CEEB;
  --pink: #FF69B4;
  --orange: #FF8C00;
  --purple: #800080; /* Not used but kept for completeness */
  --yellow-prop: #FFD700;
  --red-prop: #DC143C;
  --green-prop: #228B22;
  --darkblue: #00008B;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; overflow: hidden; font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); }

/* SCREENS */
.screen { position: fixed; inset: 0; }
.screen.hidden { display: none !important; }
.screen.active { display: flex; }

/* LOBBY */
#screen-lobby { align-items: center; justify-content: center; flex-direction: column; }
.lobby-bg {
  position: absolute; inset: 0; z-index: 0;
  background: radial-gradient(ellipse at 50% 0%, #1a7a3f22 0%, transparent 70%),
              radial-gradient(ellipse at 80% 80%, #d4af3711 0%, transparent 60%),
              linear-gradient(135deg, #0a1a10 0%, #0f2218 50%, #0a1510 100%);
}
.lobby-bg::before {
  content: '';
  position: absolute; inset: 0;
  background-image: repeating-linear-gradient(0deg, transparent, transparent 39px, #1a7a3f0a 40px),
                    repeating-linear-gradient(90deg, transparent, transparent 39px, #1a7a3f0a 40px);
}
.lobby-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 20px; }

.logo { text-align: center; }
.logo-top {
  font-family: 'Playfair Display', serif;
  font-size: clamp(48px, 10vw, 80px);
  font-weight: 900;
  color: var(--gold);
  text-shadow: 0 0 40px #d4af3755, 2px 2px 0 #8B6914, 4px 4px 0 #6B4E0E;
  letter-spacing: 6px;
  line-height: 1;
}
.logo-sub { font-size: 18px; letter-spacing: 12px; color: var(--text2); margin-top: 4px; }

.lobby-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px;
  width: 100%;
  max-width: 440px;
  box-shadow: var(--shadow), inset 0 1px 0 rgba(255,255,255,0.05);
}
.lobby-card h2 { font-family: 'Playfair Display', serif; margin-bottom: 16px; color: var(--gold); }

input[type=text] {
  width: 100%; padding: 12px 16px; font-size: 16px;
  background: #0f2218; border: 1px solid var(--border); border-radius: 8px;
  color: var(--text); outline: none; transition: border-color 0.2s;
}
input[type=text]:focus { border-color: var(--green-light); }

.token-select { margin: 20px 0; }
.token-select p { color: var(--text2); font-size: 13px; margin-bottom: 10px; }
.tokens { display: flex; flex-wrap: wrap; gap: 8px; }
.token-btn {
  width: 48px; height: 48px; font-size: 24px; background: #0f2218;
  border: 2px solid var(--border); border-radius: 10px; cursor: pointer;
  transition: all 0.15s; display: flex; align-items: center; justify-content: center;
}
.token-btn:hover { border-color: var(--green-light); transform: scale(1.1); }
.token-btn.selected { border-color: var(--gold); background: #1a3a28; box-shadow: 0 0 12px #d4af3766; }

.lobby-btns { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
.or-divider { text-align: center; color: var(--text2); font-size: 13px; }
.join-row { display: flex; gap: 8px; }
.join-row input { flex: 1; font-size: 18px; font-weight: 600; letter-spacing: 4px; text-align: center; }

.btn {
  padding: 12px 24px; font-size: 15px; font-weight: 600;
  border: none; border-radius: 10px; cursor: pointer;
  transition: all 0.15s; width: 100%;
}
.btn:active { transform: scale(0.97); }
.btn-green { background: var(--green); color: white; }
.btn-green:hover { background: var(--green-light); }
.btn-blue { background: var(--blue); color: white; flex: 0 0 auto; width: auto; }
.btn-blue:hover { background: #3498db; }
.btn-red { background: var(--red); color: white; }
.btn-red:hover { background: #e74c3c; }
.btn-gold { background: var(--gold); color: #1a1a00; }
.btn-gold:hover { background: #e8c24d; }
.btn-gray { background: #3a5a4a; color: var(--text); }
.btn-gray:hover { background: #4a6a5a; }
.btn-sm { padding: 6px 14px; font-size: 13px; width: auto; border-radius: 7px; }

.room-code-display {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  background: #0f2218; border-radius: 10px; padding: 14px 18px;
  margin-bottom: 12px;
}
.room-code-display span { color: var(--text2); font-size: 14px; }
.room-code-display strong { font-size: 28px; font-weight: 900; letter-spacing: 6px; color: var(--gold); font-family: 'Playfair Display', serif; }
.btn-copy { background: none; border: 1px solid var(--border); color: var(--text2); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-left: auto; }
.btn-copy:hover { background: var(--border); }
.share-hint { font-size: 13px; color: var(--text2); margin-bottom: 16px; }
.waiting-msg { text-align: center; color: var(--text2); font-size: 14px; margin-top: 12px; }

#player-list-lobby { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
.lobby-player { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #0f2218; border-radius: 8px; }
.lobby-player .token { font-size: 22px; }
.lobby-player .pname { font-weight: 600; }
.lobby-player .host-badge { font-size: 11px; background: var(--gold); color: #1a1a00; border-radius: 4px; padding: 2px 6px; margin-left: auto; }

/* GAME LAYOUT */
#screen-game { display: flex; align-items: stretch; }
#game-layout { display: flex; width: 100%; height: 100vh; overflow: hidden; }

/* PANELS */
#panel-left, #panel-right {
  width: 220px; flex-shrink: 0; background: var(--card2);
  border-right: 1px solid var(--border); display: flex; flex-direction: column;
  overflow-y: auto; padding: 12px;
}
#panel-right { border-right: none; border-left: 1px solid var(--border); }

#panel-left h3, #panel-right h3 {
  font-family: 'Playfair Display', serif; font-size: 14px; color: var(--gold);
  margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border);
}

/* BOARD CONTAINER */
#board-container {
  flex: 1; display: flex; align-items: center; justify-content: center;
  overflow: hidden; padding: 8px; background: var(--bg);
}

/* MONOPOLY BOARD */
#monopoly-board {
  position: relative;
  display: grid;
  grid-template-columns: 80px repeat(9, 1fr) 80px;
  grid-template-rows: 80px repeat(9, 1fr) 80px;
  width: min(calc(100vh - 20px), calc(100vw - 460px));
  height: min(calc(100vh - 20px), calc(100vw - 460px));
  background: #d4e8d0;
  border: 3px solid #1a3a28;
  border-radius: 4px;
  box-shadow: 0 0 40px rgba(0,0,0,0.6);
}

#board-center {
  grid-column: 2 / 11;
  grid-row: 2 / 11;
  display: flex; align-items: center; justify-content: center;
  background: #c8e0c8;
  border: 1px solid #8aaa8a;
}

.center-logo {
  font-family: 'Playfair Display', serif;
  font-size: clamp(18px, 3vw, 36px);
  font-weight: 900;
  color: #1a5a30;
  letter-spacing: 3px;
  text-align: center;
}
#center-info { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
#free-parking-pot { font-size: 13px; color: #2a5a3a; font-weight: 600; }
#dice-display { display: flex; gap: 8px; justify-content: center; }
.die {
  width: 40px; height: 40px; background: white; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 900; color: #1a1a1a;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  border: 2px solid #ccc;
}
#turn-indicator { font-size: 12px; color: #2a5a3a; font-weight: 600; max-width: 120px; text-align: center; }

/* BOARD CELLS */
.board-cell {
  background: #d4e8d0;
  border: 1px solid #8aaa8a;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  overflow: hidden; position: relative; cursor: pointer;
  transition: filter 0.15s;
}
.board-cell:hover { filter: brightness(0.95); }
.board-cell.corner { background: #c0d8c0; }

.cell-color-bar { width: 100%; flex-shrink: 0; }
.cell-bottom { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; padding: 2px; width: 100%; }
.cell-name { font-size: clamp(5px, 0.9vw, 8px); font-weight: 600; color: #1a3a1a; text-align: center; line-height: 1.2; word-break: break-word; }
.cell-price { font-size: clamp(4px, 0.8vw, 7px); color: #2a5a2a; }

/* Cell rotations for sides */
.cell-bottom-side { writing-mode: vertical-rl; text-orientation: mixed; }
.cell-rotate-left { transform: rotate(180deg); }

.color-brown { background: #8B4513; }
.color-lightblue { background: #87CEEB; }
.color-pink { background: #FF69B4; }
.color-orange { background: #FF8C00; }
.color-red { background: #DC143C; }
.color-yellow { background: #FFD700; }
.color-green { background: #228B22; }
.color-darkblue { background: #00008B; }

/* Tokens on board */
.board-token {
  position: absolute;
  font-size: clamp(8px, 1.5vw, 14px);
  z-index: 10;
  pointer-events: none;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));
  transition: all 0.4s ease;
}

/* House/hotel indicators */
.house-indicator {
  width: 6px; height: 6px; background: #228B22; border-radius: 1px;
  display: inline-block; margin: 0 1px;
}
.hotel-indicator {
  width: 8px; height: 8px; background: #DC143C; border-radius: 1px;
  display: inline-block; margin: 0 1px;
}
.cell-houses { display: flex; flex-wrap: wrap; justify-content: center; padding: 1px; }

.mortgaged-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  font-size: 8px; color: white; font-weight: 700;
  pointer-events: none; z-index: 5;
}

/* Cell ownership dot */
.owner-dot {
  width: 6px; height: 6px; border-radius: 50%;
  position: absolute; top: 2px; right: 2px; z-index: 6;
  border: 1px solid rgba(0,0,0,0.3);
}

/* PLAYERS LIST */
.player-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 8px; margin-bottom: 6px;
  background: #0f2218; border: 1px solid var(--border);
  transition: all 0.2s;
}
.player-item.active-turn { border-color: var(--gold); background: #1a3010; box-shadow: 0 0 8px #d4af3744; }
.player-item.bankrupt { opacity: 0.4; }
.player-item .p-token { font-size: 20px; }
.player-item .p-info { flex: 1; min-width: 0; }
.player-item .p-name { font-size: 13px; font-weight: 600; truncate: true; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.player-item .p-money { font-size: 12px; color: #4caf50; font-weight: 600; }
.player-item .p-pos { font-size: 11px; color: var(--text2); }
.in-jail-badge { font-size: 10px; background: #c0392b; color: white; border-radius: 3px; padding: 1px 4px; }

/* MY INFO PANEL */
#my-info-panel {
  background: #0f2218; border-radius: 10px; padding: 12px;
  margin-bottom: 12px; border: 1px solid var(--border);
}
.my-token { font-size: 32px; margin-bottom: 4px; }
.my-name { font-weight: 700; font-size: 15px; }
.my-money { font-size: 22px; font-weight: 800; color: #4caf50; font-family: 'Playfair Display', serif; }
.my-pos { font-size: 12px; color: var(--text2); }

/* ACTION BUTTONS */
#action-btns { display: flex; flex-direction: column; gap: 8px; }
#action-btns .btn { padding: 10px; font-size: 14px; }

/* PROPERTIES PANEL */
#my-properties-list { display: flex; flex-direction: column; gap: 4px; }
.prop-item {
  padding: 6px 8px; border-radius: 6px; font-size: 11px;
  border: 1px solid var(--border); background: #0f2218;
  cursor: pointer; transition: background 0.15s;
  display: flex; align-items: center; gap: 6px;
}
.prop-item:hover { background: #1a3a28; }
.prop-color-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.prop-name { flex: 1; }
.prop-houses-str { font-size: 10px; color: var(--text2); }
.prop-mortgaged-str { font-size: 10px; color: #e74c3c; }

/* LOG */
#game-log { display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto; }
.log-item { font-size: 11px; color: var(--text2); padding: 4px 6px; border-radius: 4px; background: #0f1e14; line-height: 1.4; }
.log-item:first-child { color: var(--text); background: #1a3a28; }

/* MODAL */
#modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
#modal-overlay.hidden { display: none; }
#modal-box {
  background: var(--card); border: 1px solid var(--border); border-radius: 16px;
  padding: 28px; max-width: 380px; width: 90%; box-shadow: var(--shadow);
}
#modal-title { font-family: 'Playfair Display', serif; font-size: 20px; color: var(--gold); margin-bottom: 12px; }
#modal-body { font-size: 14px; color: var(--text2); margin-bottom: 20px; line-height: 1.6; }
#modal-body strong { color: var(--text); }
#modal-btns { display: flex; gap: 10px; flex-wrap: wrap; }
#modal-btns .btn { flex: 1; min-width: 80px; }

/* WINNER */
#screen-winner {
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(ellipse at center, #1a5a20 0%, #0a1a0a 100%);
}
.winner-content { text-align: center; }
.winner-trophy { font-size: 100px; animation: bounce 1s infinite; }
@keyframes bounce { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-20px); } }
#winner-name { font-family: 'Playfair Display', serif; font-size: 48px; color: var(--gold); margin: 16px 0 8px; }
.winner-content p { font-size: 24px; color: var(--text2); margin-bottom: 32px; }

/* DICE ROLL ANIMATION */
@keyframes diceRoll {
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(15deg) scale(1.2); }
  50% { transform: rotate(-15deg) scale(0.9); }
  75% { transform: rotate(10deg) scale(1.1); }
  100% { transform: rotate(0deg) scale(1); }
}
.die.rolling { animation: diceRoll 0.5s ease; }

/* AUCTION PANEL */
#auction-panel {
  background: #1a2a10; border: 2px solid var(--gold);
  border-radius: 10px; padding: 12px; margin-bottom: 12px;
}
#auction-panel h4 { color: var(--gold); font-size: 13px; margin-bottom: 8px; }
.auction-bid-row { display: flex; gap: 6px; }
.auction-bid-row input { flex: 1; padding: 7px 10px; font-size: 14px; background: #0f1e14; border: 1px solid var(--border); border-radius: 6px; color: var(--text); }

/* TRADE PANEL */
#trade-panel { margin-top: 12px; }
.trade-offer-item {
  background: #0f1e14; border: 1px solid var(--border); border-radius: 8px;
  padding: 10px; margin-bottom: 8px; font-size: 12px;
}
.trade-offer-item .trade-btns { display: flex; gap: 6px; margin-top: 8px; }

/* SCROLLBAR */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

/* MOBILE ADJUSTMENTS */
@media (max-width: 900px) {
  #game-layout { flex-direction: column; }
  #panel-left { display: none; }
  #panel-right { width: 100%; border-left: none; border-top: 1px solid var(--border); height: 220px; flex-direction: row; overflow-x: auto; overflow-y: hidden; }
  #board-container { flex: 1; padding: 4px; }
  #monopoly-board {
    width: min(calc(100vw - 8px), calc(100vh - 240px));
    height: min(calc(100vw - 8px), calc(100vh - 240px));
    grid-template-columns: 64px repeat(9, 1fr) 64px;
    grid-template-rows: 64px repeat(9, 1fr) 64px;
  }
}
