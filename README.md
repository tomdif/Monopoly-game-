// server.js - Monopoly multiplayer server

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const engine = require('./src/game-engine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// In-memory game store
const games = {}; // gameId -> game
const playerGameMap = {}; // socketId -> gameId
const playerIdMap = {}; // socketId -> playerId

function getPublicGame(game) {
  return {
    id: game.id,
    phase: game.phase,
    players: game.players,
    currentPlayerIndex: game.currentPlayerIndex,
    properties: game.properties,
    log: game.log.slice(0, 20),
    turnPhase: game.turnPhase,
    lastDice: game.lastDice,
    doublesCount: game.doublesCount,
    freeParkingPot: game.freeParkingPot,
    pendingAction: game.pendingAction,
    auction: game.auction,
    winner: game.winner || null,
  };
}

function emitGameState(gameId) {
  const game = games[gameId];
  if (!game) return;
  io.to(gameId).emit('game_state', getPublicGame(game));
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Create a new game room
  socket.on('create_game', ({ playerName, tokenIndex }) => {
    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const playerId = uuidv4();
    const game = engine.createGame(gameId);
    const player = engine.createPlayer(playerId, playerName || 'Player 1', tokenIndex || 0);
    player.isHost = true;
    game.players.push(player);
    games[gameId] = game;
    playerGameMap[socket.id] = gameId;
    playerIdMap[socket.id] = playerId;
    socket.join(gameId);
    socket.emit('joined_game', { gameId, playerId, isHost: true });
    emitGameState(gameId);
    engine.addLog(game, `${player.name} created the game.`);
  });

  // Join existing game
  socket.on('join_game', ({ gameId, playerName, tokenIndex }) => {
    const game = games[gameId];
    if (!game) { socket.emit('error', 'Game not found.'); return; }
    if (game.phase !== 'lobby') { socket.emit('error', 'Game already started.'); return; }
    if (game.players.length >= 8) { socket.emit('error', 'Game is full.'); return; }

    const usedTokens = game.players.map(p => p.token);
    let ti = tokenIndex;
    while (usedTokens.includes(engine.TOKEN_EMOJIS[ti])) {
      ti = (ti + 1) % engine.TOKEN_EMOJIS.length;
    }

    const playerId = uuidv4();
    const player = engine.createPlayer(playerId, playerName || `Player ${game.players.length + 1}`, ti);
    game.players.push(player);
    playerGameMap[socket.id] = gameId;
    playerIdMap[socket.id] = playerId;
    socket.join(gameId);
    socket.emit('joined_game', { gameId, playerId, isHost: false });
    engine.addLog(game, `${player.name} joined the game.`);
    emitGameState(gameId);
  });

  // Rejoin game (on reconnect)
  socket.on('rejoin_game', ({ gameId, playerId }) => {
    const game = games[gameId];
    if (!game) { socket.emit('error', 'Game not found.'); return; }
    const player = game.players.find(p => p.id === playerId);
    if (!player) { socket.emit('error', 'Player not found.'); return; }
    playerGameMap[socket.id] = gameId;
    playerIdMap[socket.id] = playerId;
    socket.join(gameId);
    socket.emit('joined_game', { gameId, playerId, isHost: player.isHost });
    emitGameState(gameId);
  });

  // Start game (host only)
  socket.on('start_game', () => {
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    const game = games[gameId];
    if (!game) return;
    const player = game.players.find(p => p.id === playerId);
    if (!player?.isHost) { socket.emit('error', 'Only host can start.'); return; }
    if (game.players.length < 2) { socket.emit('error', 'Need at least 2 players.'); return; }
    game.phase = 'playing';
    game.turnPhase = 'roll';
    engine.addLog(game, `🎲 Game started with ${game.players.length} players!`);
    emitGameState(gameId);
  });

  // Roll dice
  socket.on('roll_dice', () => {
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    const game = games[gameId];
    if (!game || game.phase !== 'playing') return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) { socket.emit('error', 'Not your turn.'); return; }
    if (game.turnPhase !== 'roll') { socket.emit('error', 'Cannot roll now.'); return; }

    const [d1, d2] = engine.rollDice();
    const total = d1 + d2;
    const isDoubles = d1 === d2;
    game.lastDice = [d1, d2];
    engine.addLog(game, `${currentPlayer.name} rolled ${d1}+${d2}=${total}${isDoubles ? ' (doubles!)' : ''}`);

    // Jail handling
    if (currentPlayer.inJail) {
      currentPlayer.jailTurns++;
      if (isDoubles) {
        currentPlayer.inJail = false;
        currentPlayer.jailTurns = 0;
        engine.addLog(game, `${currentPlayer.name} rolled doubles and got out of Jail!`);
        engine.movePlayer(game, playerId, total);
      } else if (currentPlayer.jailTurns >= 3) {
        if (currentPlayer.money >= 50) {
          currentPlayer.money -= 50;
          game.freeParkingPot += 50;
          currentPlayer.inJail = false;
          currentPlayer.jailTurns = 0;
          engine.addLog(game, `${currentPlayer.name} paid $50 fine after 3 turns in Jail.`);
          engine.movePlayer(game, playerId, total);
        } else {
          engine.declareBankruptcy(game, playerId);
          emitGameState(gameId);
          return;
        }
      } else {
        engine.addLog(game, `${currentPlayer.name} is stuck in Jail (turn ${currentPlayer.jailTurns}/3).`);
        game.turnPhase = 'end';
        emitGameState(gameId);
        return;
      }
    } else {
      // Check for 3 doubles = jail
      if (isDoubles) {
        game.doublesCount++;
        if (game.doublesCount >= 3) {
          engine.sendToJail(game, playerId);
          game.turnPhase = 'end';
          emitGameState(gameId);
          return;
        }
      } else {
        game.doublesCount = 0;
      }
      engine.movePlayer(game, playerId, total);
    }

    // Process landing
    const landResult = engine.processLanding(game, playerId, total);

    // Handle card redirects
    if (landResult.cardResult?.needsLanding) {
      const newLand = engine.processLanding(game, playerId, total, landResult.cardResult.rentMultiplier);
      if (newLand.action === 'can_buy') {
        game.turnPhase = 'buy';
        game.pendingAction = { type: 'buy', spaceId: currentPlayer.position };
      } else {
        game.turnPhase = isDoubles && !currentPlayer.inJail ? 'roll' : 'end';
      }
    } else if (landResult.action === 'can_buy') {
      game.turnPhase = 'buy';
      game.pendingAction = { type: 'buy', spaceId: currentPlayer.position };
    } else if (landResult.action === 'jail') {
      game.turnPhase = 'end';
    } else {
      game.turnPhase = isDoubles && !currentPlayer.inJail ? 'roll' : 'end';
    }

    emitGameState(gameId);
  });

  // Buy property
  socket.on('buy_property', () => {
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    const game = games[gameId];
    if (!game || game.turnPhase !== 'buy') return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    const spaceId = currentPlayer.position;
    const ok = engine.buyProperty(game, playerId, spaceId);
    if (ok) {
      const isDoubles = game.lastDice && game.lastDice[0] === game.lastDice[1];
      game.turnPhase = isDoubles && !currentPlayer.inJail ? 'roll' : 'end';
      game.pendingAction = null;
    }
    emitGameState(gameId);
  });

  // Decline to buy (start auction)
  socket.on('decline_buy', () => {
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    const game = games[gameId];
    if (!game || game.turnPhase !== 'buy') return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    const spaceId = currentPlayer.position;
    const space = engine.BOARD_SPACES[spaceId];
    // Start auction
    game.auction = {
      spaceId,
      spaceName: space.name,
      price: space.price,
      currentBid: 0,
      currentBidder: null,
      bids: {},
      phase: 'bidding',
    };
    engine.addLog(game, `🔨 Auction started for ${space.name}! Starting bid: $1`);
    const isDoubles = game.lastDice && game.lastDice[0] === game.lastDice[1];
    game.turnPhase = isDoubles && !currentPlayer.inJail ? 'roll' : 'end';
    game.pendingAction = null;
    emitGameState(gameId);
  });

  // Place bid in auction
  socket.on('place_bid', ({ amount }) => {
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    const game = games[gameId];
    if (!game || !game.auction) return;
    const player = game.players.find(p => p.id === playerId);
    if (!player || player.bankrupt) return;
    if (amount <= game.auction.currentBid) { socket.emit('error', 'Bid must be higher.'); return; }
    if (amount > player.money) { socket.emit('error', 'Not enough money.'); return; }

    game.auction.currentBid = amount;
    game.auction.currentBidder = playerId;
    game.auction.bids[playerId] = amount;
    engine.addLog(game, `${player.name} bids $${amount} for ${game.auction.spaceName}`);
    emitGameState(gameId);
  });

  // End auction
  socket.on('end_auction', () => {
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    const game = games[gameId];
    if (!game || !game.auction) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) { socket.emit('error', 'Only current player ends auction.'); return; }

    const auction = game.auction;
    if (auction.currentBidder && auction.currentBid > 0) {
      const winner = game.players.find(p => p.id === auction.currentBidder);
      winner.money -= auction.currentBid;
      game.properties[auction.spaceId] = { ownerId: auction.currentBidder, houses: 0, mortgaged: false };
      engine.addLog(game, `🔨 ${winner.name} won the auction for ${auction.spaceName} at $${auction.currentBid}!`);
    } else {
      engine.addLog(game, `No bids placed — ${auction.spaceName} stays with the bank.`);
    }
    game.auction = null;
    emitGameState(gameId);
  });

  // End turn
  socket.on('end_turn', () => {
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    const game = games[gameId];
    if (!game) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;
    if (game.turnPhase !== 'end') return;
    engine.nextTurn(game);
    const next = game.players[game.currentPlayerIndex];
    engine.addLog(game, `▶ It's ${next.name}'s turn.`);
    emitGameState(gameId);
  });

  // Build house
  socket.on('build_house', ({ spaceId }) => {
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    const game = games[gameId];
    if (!game) return;
    const result = engine.buildHouse(game, playerId, spaceId);
    if (!result.ok) socket.emit('error', result.msg);
    emitGameState(gameId);
  });

  // Sell house
  socket.on('sell_house', ({ spaceId }) => {
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    const game = games[gameId];
    if (!game) return;
    const result = engine.sellHouse(game, playerId, spaceId);
    if (!result.ok) socket.emit('error', result.msg);
    emitGameState(gameId);
  });

  // Mortgage
  socket.on('mortgage', ({ spaceId }) => {
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    const game = games[gameId];
    if (!game) return;
    const result = engine.mortgageProperty(game, playerId, spaceId);
    if (!result.ok) socket.emit('error', result.msg);
    emitGameState(gameId);
  });

  // Unmortgage
  socket.on('unmortgage', ({ spaceId }) => {
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    const game = games[gameId];
    if (!game) return;
    const result = engine.unmortgageProperty(game, playerId, spaceId);
    if (!result.ok) socket.emit('error', result.msg);
    emitGameState(gameId);
  });

  // Pay jail fine
  socket.on('pay_jail', () => {
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    const game = games[gameId];
    if (!game) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;
    const ok = engine.payJailFine(game, playerId);
    if (!ok) socket.emit('error', 'Cannot pay jail fine right now.');
    emitGameState(gameId);
  });

  // Use jail free card
  socket.on('use_jail_card', () => {
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    const game = games[gameId];
    if (!game) return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;
    const ok = engine.useJailCard(game, playerId);
    if (!ok) socket.emit('error', 'No jail free card available.');
    emitGameState(gameId);
  });

  // Offer trade
  socket.on('offer_trade', ({ targetPlayerId, offer }) => {
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    const game = games[gameId];
    if (!game) return;
    const tradeId = uuidv4();
    game.trades = game.trades || [];
    game.trades.push({ id: tradeId, from: playerId, to: targetPlayerId, offer, status: 'pending' });
    io.to(gameId).emit('trade_offer', { tradeId, from: playerId, to: targetPlayerId, offer });
    engine.addLog(game, `${game.players.find(p=>p.id===playerId)?.name} offered a trade.`);
    emitGameState(gameId);
  });

  // Accept trade
  socket.on('accept_trade', ({ tradeId }) => {
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    const game = games[gameId];
    if (!game) return;
    const trade = game.trades?.find(t => t.id === tradeId);
    if (!trade || trade.to !== playerId) return;

    const fromPlayer = game.players.find(p => p.id === trade.from);
    const toPlayer = game.players.find(p => p.id === trade.to);
    const { offer } = trade;

    // Transfer money
    if (offer.fromMoney) { fromPlayer.money -= offer.fromMoney; toPlayer.money += offer.fromMoney; }
    if (offer.toMoney) { toPlayer.money -= offer.toMoney; fromPlayer.money += offer.toMoney; }

    // Transfer properties
    if (offer.fromProperties) {
      offer.fromProperties.forEach(sid => {
        if (game.properties[sid]?.ownerId === trade.from) {
          game.properties[sid].ownerId = trade.to;
        }
      });
    }
    if (offer.toProperties) {
      offer.toProperties.forEach(sid => {
        if (game.properties[sid]?.ownerId === trade.to) {
          game.properties[sid].ownerId = trade.from;
        }
      });
    }

    trade.status = 'accepted';
    engine.addLog(game, `🤝 Trade accepted between ${fromPlayer.name} and ${toPlayer.name}.`);
    emitGameState(gameId);
  });

  // Reject trade
  socket.on('reject_trade', ({ tradeId }) => {
    const gameId = playerGameMap[socket.id];
    const game = games[gameId];
    if (!game) return;
    const trade = game.trades?.find(t => t.id === tradeId);
    if (trade) trade.status = 'rejected';
    io.to(gameId).emit('trade_rejected', { tradeId });
    emitGameState(gameId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const gameId = playerGameMap[socket.id];
    const playerId = playerIdMap[socket.id];
    if (gameId && playerId) {
      const game = games[gameId];
      if (game) {
        const player = game.players.find(p => p.id === playerId);
        if (player) engine.addLog(game, `${player.name} disconnected.`);
        emitGameState(gameId);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Monopoly server running on port ${PORT}`));
