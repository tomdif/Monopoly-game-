// game-engine.js - Core Monopoly game logic

const { BOARD_SPACES, CHANCE_CARDS, COMMUNITY_CHEST_CARDS, TOKEN_EMOJIS, TOKEN_NAMES } = require('./board-data');

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rollDice() {
  return [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)];
}

function createGame(gameId) {
  return {
    id: gameId,
    phase: 'lobby',
    players: [],
    currentPlayerIndex: 0,
    properties: {},
    chanceCards: shuffle(CHANCE_CARDS),
    communityChestCards: shuffle(COMMUNITY_CHEST_CARDS),
    chanceIndex: 0,
    communityChestIndex: 0,
    freeParkingPot: 0,
    log: [],
    turnPhase: 'roll',
    lastDice: null,
    doublesCount: 0,
    pendingAction: null,
    trades: [],
    auction: null,
  };
}

function createPlayer(id, name, tokenIndex) {
  return {
    id,
    name,
    token: TOKEN_EMOJIS[tokenIndex],
    tokenName: TOKEN_NAMES[tokenIndex],
    money: 1500,
    position: 0,
    inJail: false,
    jailTurns: 0,
    jailFreeCards: 0,
    bankrupt: false,
    consecutiveDoubles: 0,
  };
}

function addLog(game, msg) {
  game.log.unshift({ msg, time: Date.now() });
  if (game.log.length > 50) game.log.pop();
}

function getGroupProperties(group) {
  return BOARD_SPACES.filter(s => s.group === group);
}

function ownsAllInGroup(game, playerId, group) {
  const groupProps = getGroupProperties(group);
  return groupProps.every(p => game.properties[p.id]?.ownerId === playerId);
}

function getRailroadsOwned(game, playerId) {
  return BOARD_SPACES.filter(s => s.type === 'railroad' && game.properties[s.id]?.ownerId === playerId).length;
}

function getUtilitiesOwned(game, playerId) {
  return BOARD_SPACES.filter(s => s.type === 'utility' && game.properties[s.id]?.ownerId === playerId).length;
}

function calculateRent(game, space, diceTotal) {
  const prop = game.properties[space.id];
  if (!prop || prop.mortgaged) return 0;
  const owner = prop.ownerId;

  if (space.type === 'railroad') {
    const count = getRailroadsOwned(game, owner);
    return [25, 50, 100, 200][count - 1];
  }

  if (space.type === 'utility') {
    const count = getUtilitiesOwned(game, owner);
    return diceTotal * (count === 1 ? 4 : 10);
  }

  if (space.type === 'property') {
    const houses = prop.houses || 0;
    if (houses === 0 && ownsAllInGroup(game, owner, space.group)) {
      return space.rent[0] * 2;
    }
    return space.rent[houses] || space.rent[0];
  }

  return 0;
}

function movePlayer(game, playerId, steps) {
  const player = game.players.find(p => p.id === playerId);
  const oldPos = player.position;
  player.position = (player.position + steps) % 40;
  if (player.position < oldPos && steps > 0) {
    player.money += 200;
    addLog(game, `${player.name} passed GO and collected $200!`);
  }
  return player.position;
}

function advanceTo(game, playerId, targetPos) {
  const player = game.players.find(p => p.id === playerId);
  const oldPos = player.position;
  player.position = targetPos;
  if (targetPos <= oldPos && targetPos !== 0) {
    player.money += 200;
    addLog(game, `${player.name} passed GO and collected $200!`);
  } else if (targetPos === 0) {
    player.money += 200;
    addLog(game, `${player.name} advanced to GO and collected $200!`);
  }
}

function sendToJail(game, playerId) {
  const player = game.players.find(p => p.id === playerId);
  player.position = 10;
  player.inJail = true;
  player.jailTurns = 0;
  player.consecutiveDoubles = 0;
  addLog(game, `🚔 ${player.name} was sent to Jail!`);
}

function drawChanceCard(game, playerId, diceTotal) {
  const card = game.chanceCards[game.chanceIndex % game.chanceCards.length];
  game.chanceIndex++;
  const player = game.players.find(p => p.id === playerId);
  addLog(game, `🃏 ${player.name} drew Chance: "${card.text}"`);
  return processCard(game, playerId, card, diceTotal);
}

function drawCommunityChestCard(game, playerId, diceTotal) {
  const card = game.communityChestCards[game.communityChestIndex % game.communityChestCards.length];
  game.communityChestIndex++;
  const player = game.players.find(p => p.id === playerId);
  addLog(game, `📦 ${player.name} drew Community Chest: "${card.text}"`);
  return processCard(game, playerId, card, diceTotal);
}

function findNearestRailroad(pos) {
  const railroads = [5, 15, 25, 35];
  for (const r of railroads) {
    if (r > pos) return r;
  }
  return railroads[0];
}

function findNearestUtility(pos) {
  if (pos < 12 || pos >= 28) return pos < 12 ? 12 : 12;
  return 28;
}

function processCard(game, playerId, card, diceTotal) {
  const player = game.players.find(p => p.id === playerId);
  const result = { card, needsBuy: false, needsRent: false };

  switch (card.action) {
    case 'advance_to':
      advanceTo(game, playerId, card.target);
      result.newPosition = card.target;
      result.needsLanding = true;
      break;
    case 'collect':
      player.money += card.amount;
      break;
    case 'pay':
      player.money -= card.amount;
      game.freeParkingPot += card.amount;
      break;
    case 'go_to_jail':
      sendToJail(game, playerId);
      break;
    case 'jail_free':
      player.jailFreeCards++;
      break;
    case 'move_back':
      player.position = (player.position - card.amount + 40) % 40;
      result.newPosition = player.position;
      result.needsLanding = true;
      break;
    case 'nearest_railroad': {
      const rr = findNearestRailroad(player.position);
      advanceTo(game, playerId, rr);
      result.newPosition = rr;
      result.needsLanding = true;
      result.rentMultiplier = 2;
      break;
    }
    case 'nearest_utility': {
      const ut = findNearestUtility(player.position);
      advanceTo(game, playerId, ut);
      result.newPosition = ut;
      result.needsLanding = true;
      result.rentMultiplier = 10;
      break;
    }
    case 'repairs': {
      let total = 0;
      Object.entries(game.properties).forEach(([spaceId, prop]) => {
        if (prop.ownerId === playerId && !prop.mortgaged) {
          const houses = prop.houses || 0;
          if (houses === 5) total += card.hotel;
          else total += houses * card.house;
        }
      });
      player.money -= total;
      game.freeParkingPot += total;
      addLog(game, `${player.name} paid $${total} in repairs.`);
      break;
    }
    case 'pay_each':
      game.players.filter(p => p.id !== playerId && !p.bankrupt).forEach(other => {
        player.money -= card.amount;
        other.money += card.amount;
      });
      break;
    case 'collect_from_each':
      game.players.filter(p => p.id !== playerId && !p.bankrupt).forEach(other => {
        const pay = Math.min(card.amount, other.money);
        other.money -= pay;
        player.money += pay;
      });
      break;
  }

  return result;
}

function processLanding(game, playerId, diceTotal, rentMultiplier) {
  const player = game.players.find(p => p.id === playerId);
  const space = BOARD_SPACES[player.position];
  const result = { space, action: null, amount: 0, cardResult: null };

  switch (space.type) {
    case 'go':
      break;
    case 'tax':
      player.money -= space.amount;
      game.freeParkingPot += space.amount;
      result.action = 'tax';
      result.amount = space.amount;
      addLog(game, `${player.name} paid $${space.amount} in taxes.`);
      break;
    case 'go_to_jail':
      sendToJail(game, playerId);
      result.action = 'jail';
      break;
    case 'free_parking':
      if (game.freeParkingPot > 0) {
        player.money += game.freeParkingPot;
        addLog(game, `${player.name} collected $${game.freeParkingPot} from Free Parking!`);
        result.action = 'free_parking';
        result.amount = game.freeParkingPot;
        game.freeParkingPot = 0;
      }
      break;
    case 'chance':
      result.cardResult = drawChanceCard(game, playerId, diceTotal);
      result.action = 'chance';
      break;
    case 'community_chest':
      result.cardResult = drawCommunityChestCard(game, playerId, diceTotal);
      result.action = 'community_chest';
      break;
    case 'property':
    case 'railroad':
    case 'utility': {
      const prop = game.properties[space.id];
      if (!prop) {
        result.action = 'can_buy';
      } else if (prop.ownerId === playerId || prop.mortgaged) {
        result.action = 'owned_self';
      } else {
        const multiplier = rentMultiplier || 1;
        let rent = calculateRent(game, space, diceTotal);
        if (space.type === 'utility' && multiplier === 10) {
          rent = diceTotal * 10;
        } else {
          rent *= multiplier > 1 ? multiplier : 1;
        }
        const owner = game.players.find(p => p.id === prop.ownerId);
        const actualRent = Math.min(rent, player.money);
        player.money -= actualRent;
        owner.money += actualRent;
        result.action = 'rent';
        result.amount = actualRent;
        result.ownerName = owner.name;
        addLog(game, `${player.name} paid $${actualRent} rent to ${owner.name} for ${space.name}.`);
        checkBankruptcy(game, playerId);
      }
      break;
    }
  }

  return result;
}

function checkBankruptcy(game, playerId) {
  const player = game.players.find(p => p.id === playerId);
  if (player.money < 0) {
    const canRaise = canRaiseFunds(game, playerId);
    if (!canRaise || player.money + canRaise < 0) {
      declareBankruptcy(game, playerId);
    }
  }
}

function canRaiseFunds(game, playerId) {
  let total = 0;
  Object.entries(game.properties).forEach(([spaceId, prop]) => {
    if (prop.ownerId === playerId) {
      const space = BOARD_SPACES[parseInt(spaceId)];
      if (!prop.mortgaged) {
        if (prop.houses > 0) {
          total += prop.houses * (space.houseCost / 2);
        } else {
          total += space.mortgageValue;
        }
      }
    }
  });
  return total;
}

function declareBankruptcy(game, playerId) {
  const player = game.players.find(p => p.id === playerId);
  player.bankrupt = true;
  player.money = 0;
  Object.entries(game.properties).forEach(([spaceId, prop]) => {
    if (prop.ownerId === playerId) {
      delete game.properties[parseInt(spaceId)];
    }
  });
  addLog(game, `💸 ${player.name} has gone BANKRUPT!`);
  checkWinner(game);
}

function checkWinner(game) {
  const active = game.players.filter(p => !p.bankrupt);
  if (active.length === 1) {
    game.phase = 'ended';
    game.winner = active[0];
    addLog(game, `🏆 ${active[0].name} WINS THE GAME!`);
  }
}

function buyProperty(game, playerId, spaceId) {
  const player = game.players.find(p => p.id === playerId);
  const space = BOARD_SPACES[spaceId];
  if (player.money < space.price) return false;
  player.money -= space.price;
  game.properties[spaceId] = { ownerId: playerId, houses: 0, mortgaged: false };
  addLog(game, `${player.name} bought ${space.name} for $${space.price}.`);
  return true;
}

function buildHouse(game, playerId, spaceId) {
  const player = game.players.find(p => p.id === playerId);
  const space = BOARD_SPACES[spaceId];
  const prop = game.properties[spaceId];
  if (!prop || prop.ownerId !== playerId || prop.mortgaged) return { ok: false, msg: "You don't own this property." };
  if (!ownsAllInGroup(game, playerId, space.group)) return { ok: false, msg: "You must own the entire color group." };
  if (prop.houses >= 5) return { ok: false, msg: "Already has a hotel." };
  if (player.money < space.houseCost) return { ok: false, msg: "Not enough money." };

  const groupProps = getGroupProperties(space.group);
  const minHouses = Math.min(...groupProps.map(p => game.properties[p.id]?.houses || 0));
  if (prop.houses > minHouses) return { ok: false, msg: "Must build evenly across the color group." };

  player.money -= space.houseCost;
  prop.houses++;
  const label = prop.houses === 5 ? 'hotel' : `house #${prop.houses}`;
  addLog(game, `${player.name} built a ${label} on ${space.name}.`);
  return { ok: true };
}

function sellHouse(game, playerId, spaceId) {
  const player = game.players.find(p => p.id === playerId);
  const space = BOARD_SPACES[spaceId];
  const prop = game.properties[spaceId];
  if (!prop || prop.ownerId !== playerId || prop.houses === 0) return { ok: false, msg: "No houses to sell." };

  const groupProps = getGroupProperties(space.group);
  const maxHouses = Math.max(...groupProps.map(p => game.properties[p.id]?.houses || 0));
  if (prop.houses < maxHouses) return { ok: false, msg: "Must sell evenly across the color group." };

  player.money += Math.floor(space.houseCost / 2);
  prop.houses--;
  addLog(game, `${player.name} sold a house on ${space.name}.`);
  return { ok: true };
}

function mortgageProperty(game, playerId, spaceId) {
  const player = game.players.find(p => p.id === playerId);
  const space = BOARD_SPACES[spaceId];
  const prop = game.properties[spaceId];
  if (!prop || prop.ownerId !== playerId || prop.mortgaged) return { ok: false, msg: "Cannot mortgage." };
  if (prop.houses > 0) return { ok: false, msg: "Must sell all houses first." };
  prop.mortgaged = true;
  player.money += space.mortgageValue;
  addLog(game, `${player.name} mortgaged ${space.name} for $${space.mortgageValue}.`);
  return { ok: true };
}

function unmortgageProperty(game, playerId, spaceId) {
  const player = game.players.find(p => p.id === playerId);
  const space = BOARD_SPACES[spaceId];
  const prop = game.properties[spaceId];
  if (!prop || prop.ownerId !== playerId || !prop.mortgaged) return { ok: false, msg: "Not mortgaged." };
  const cost = Math.floor(space.mortgageValue * 1.1);
  if (player.money < cost) return { ok: false, msg: "Not enough money." };
  player.money -= cost;
  prop.mortgaged = false;
  addLog(game, `${player.name} unmortgaged ${space.name} for $${cost}.`);
  return { ok: true };
}

function payJailFine(game, playerId) {
  const player = game.players.find(p => p.id === playerId);
  if (!player.inJail) return false;
  if (player.money < 50) return false;
  player.money -= 50;
  player.inJail = false;
  player.jailTurns = 0;
  addLog(game, `${player.name} paid $50 to get out of Jail.`);
  return true;
}

function useJailCard(game, playerId) {
  const player = game.players.find(p => p.id === playerId);
  if (!player.inJail || player.jailFreeCards === 0) return false;
  player.jailFreeCards--;
  player.inJail = false;
  player.jailTurns = 0;
  addLog(game, `${player.name} used a Get Out of Jail Free card!`);
  return true;
}

function nextTurn(game) {
  const activePlayers = game.players.filter(p => !p.bankrupt);
  if (activePlayers.length <= 1) { checkWinner(game); return; }

  let idx = game.currentPlayerIndex;
  do {
    idx = (idx + 1) % game.players.length;
  } while (game.players[idx].bankrupt);

  game.currentPlayerIndex = idx;
  game.turnPhase = 'roll';
  game.doublesCount = 0;
  game.lastDice = null;
  game.pendingAction = null;
}

function getNetWorth(game, playerId) {
  const player = game.players.find(p => p.id === playerId);
  let worth = player.money;
  Object.entries(game.properties).forEach(([spaceId, prop]) => {
    if (prop.ownerId === playerId) {
      const space = BOARD_SPACES[parseInt(spaceId)];
      if (!prop.mortgaged) {
        worth += space.price;
        worth += (prop.houses || 0) * (space.houseCost || 0);
      } else {
        worth += space.mortgageValue;
      }
    }
  });
  return worth;
}

module.exports = {
  BOARD_SPACES, TOKEN_EMOJIS, TOKEN_NAMES,
  createGame, createPlayer, rollDice,
  movePlayer, advanceTo, sendToJail,
  processLanding, buyProperty,
  buildHouse, sellHouse,
  mortgageProperty, unmortgageProperty,
  payJailFine, useJailCard,
  nextTurn, addLog, checkBankruptcy,
  ownsAllInGroup, getNetWorth,
  calculateRent, declareBankruptcy
};
