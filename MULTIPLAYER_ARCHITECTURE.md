# Playroomkit Multiplayer Architecture — Host-Authoritative Pattern

> **Purpose**: This document fully describes how we used [Playroomkit](https://playroomkit.io) to implement a real-time multiplayer card game (Briscola) with a **host-authoritative** model using **React / Next.js**. It contains every pattern, API usage, and architectural decision needed to replicate this exact setup for any turn-based or real-time multiplayer game.

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Core Concepts](#2-core-concepts)
3. [Installation & Setup](#3-installation--setup)
4. [Connection Flow](#4-connection-flow)
5. [Shared Multiplayer State](#5-shared-multiplayer-state)
6. [Per-Player State](#6-per-player-state)
7. [RPC System (Remote Procedure Calls)](#7-rpc-system-remote-procedure-calls)
8. [Host-Authoritative Game Logic](#8-host-authoritative-game-logic)
9. [Player Lifecycle Events](#9-player-lifecycle-events)
10. [Room Management](#10-room-management)
11. [Complete Data Flow](#11-complete-data-flow)
12. [Full API Reference (Used)](#12-full-api-reference-used)
13. [Patterns & Best Practices](#13-patterns--best-practices)
14. [Gotchas & Pitfalls](#14-gotchas--pitfalls)
15. [Skeleton Template](#15-skeleton-template)

---

## 1. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (React) | 14.x |
| Multiplayer | playroomkit | ^0.0.87 |
| Styling | styled-components | ^6.x |
| Language | TypeScript | ^5.x |

**Playroomkit** handles all networking (WebRTC peer-to-peer with fallback relay), room creation, matchmaking, state synchronization, and player management. There is **no custom backend server** — everything runs client-side with Playroomkit's infrastructure.

---

## 2. Core Concepts

### Host-Authoritative Model

One player is designated the **host**. The host:
- Runs all game logic (validation, state transitions)
- Is the single source of truth for the game state
- Receives action requests from other players via RPC
- Broadcasts the resulting state to all players via shared multiplayer state

Non-host players:
- Send action **requests** to the host (never mutate game state directly)
- React to state changes pushed by the host
- Can read all shared state and per-player state

### Three Communication Channels

| Channel | API | Direction | Use Case |
|---------|-----|-----------|----------|
| **Shared State** | `useMultiplayerState()` | Any player → All players | Game state, settings, chat |
| **Per-Player State** | `player.setState()` / `player.getState()` | Per player → All can read | Username, avatar, team |
| **RPC** | `RPC.register()` / `RPC.call()` | Any player → Host (or all) | Action requests (play card, swap, etc.) |

---

## 3. Installation & Setup

```bash
npm install playroomkit
```

No API keys, no server configuration, no environment variables. Playroomkit works out of the box.

### Required Import

```typescript
import {
  insertCoin,
  useMultiplayerState,
  myPlayer,
  usePlayersList,
  isHost,
  onPlayerJoin,
  RPC,
  getRoomCode,
} from "playroomkit";
```

### Next.js Requirement

All Playroomkit code must be in **client components** (not server components):

```typescript
"use client";
```

---

## 4. Connection Flow

### Step 1: Create or Join a Room

```typescript
await insertCoin({
  skipLobby: true,                    // Skip Playroomkit's built-in lobby UI
  ...(roomCode ? { roomCode } : {}),  // Join existing room (omit to create new)
  ...(!roomCode ? { maxPlayersPerRoom: 4 } : {}),  // Only set when CREATING
});
```

**Critical Rules:**
- `skipLobby: true` — We use our own lobby UI, not Playroomkit's.
- `maxPlayersPerRoom` — Only pass this when **creating** a room (no roomCode). Passing it when **joining** can cause `ROOM_LIMIT_EXCEEDED` errors if the value doesn't match the room's setting.
- `roomCode` — Alphanumeric code (e.g. `"ABCD"`) to join an existing room. Omit entirely to create a new room.
- The first player to create a room automatically becomes the **host**.

### Step 2: Handle Errors

```typescript
try {
  await insertCoin({ skipLobby: true, ... });
  setPhase('connected');
} catch (error: any) {
  if (error?.message === 'ROOM_LIMIT_EXCEEDED') {
    // Room is full
  } else {
    // Generic connection failure
  }
}
```

### Step 3: Temporary Storage Workaround

```typescript
// Before insertCoin — prevents Playroomkit from using persistent localStorage
if (typeof window !== 'undefined') {
  (window as any)._USETEMPSTORAGE = true;
}
```

This avoids stale session data causing reconnection issues.

---

## 5. Shared Multiplayer State

### The Primary Sync Mechanism

`useMultiplayerState` is a React hook that works like `useState` but **syncs across all connected players in real-time**.

```typescript
const [gameState, setGameState] = useMultiplayerState<GameState | null>("game", null);
const [hostId, setHostId] = useMultiplayerState<string | null>("hostId", null);
const [sharedMode, setSharedMode] = useMultiplayerState<string | null>("gameMode", null);
const [quickChat, setQuickChat] = useMultiplayerState<ChatMsg | null>("quickChat", null);
```

**Parameters:**
- First argument: **key** (string) — unique identifier for this piece of state
- Second argument: **default value** — used before any player sets it

**Setting state (broadcasting to all):**

```typescript
setGameState(newState, true);  // Second arg `true` = reliable sync
```

The `true` flag ensures reliable delivery. Always use it for game-critical state.

### What We Store in Shared State

| Key | Type | Set By | Purpose |
|-----|------|--------|---------|
| `"game"` | `GameState \| null` | Host only | Entire game state (hands, deck, scores, phase) |
| `"hostId"` | `string \| null` | Host only | Host's player ID so all clients know who's host |
| `"gameMode"` | `string \| null` | Host only | Selected game mode (joiners read this) |
| `"quickChat"` | `object \| null` | Any player | Quick chat messages between players |

### Ref Pattern for State in Callbacks

**Problem**: RPC handlers and `setTimeout` callbacks capture stale closures. They read the state value from when they were created, not the current value.

**Solution**: Mirror state into a ref that always points to the latest value:

```typescript
const gameStateRef = useRef<GameState | null>(null);
const setGameStateRef = useRef(setGameState);

// Keep refs in sync
useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
useEffect(() => { setGameStateRef.current = setGameState; }, [setGameState]);

// Inside RPC handlers / timeouts, use refs:
RPC.register('playCard', async (data, caller) => {
  const currentState = gameStateRef.current;  // Always fresh
  // ...
  setGameStateRef.current(newState, true);    // Always fresh setter
});
```

This is **essential**. Without it, RPC handlers will operate on stale state.

---

## 6. Per-Player State

Each player has their own key-value store that all other players can read.

### Setting (on your own player):

```typescript
const currentPlayer = myPlayer();
currentPlayer.setState('displayName', 'Alice', true);   // reliable
currentPlayer.setState('avatarEmoji', '😎', true);
currentPlayer.setState('team', '1', true);               // for team selection
```

### Reading (any player):

```typescript
const name = player.getState('displayName');
const emoji = player.getState('avatarEmoji');
const team = player.getState('team');
```

### Use Cases

- **Username & Avatar**: Set once on connection, read by all players for display.
- **Team Selection**: In 2v2 mode, each player sets their own team in the lobby. The host reads all team assignments when starting the game.
- **Ready Status**: Could be used for lobby ready-up indicators.

---

## 7. RPC System (Remote Procedure Calls)

### How It Works

RPCs let any player send a request to the **host** (or to all players). The host processes the request and updates shared state.

### Host Registers Handlers (once, on mount):

```typescript
useEffect(() => {
  RPC.register('playCard', async (data: { cardId: string }, caller: any) => {
    if (!isHost()) return;  // Safety: only host processes

    const currentState = gameStateRef.current;
    if (!currentState) return;

    // Run game logic
    gameLogic.loadState(currentState);
    const newState = gameLogic.playCard(caller.id, data.cardId);
    if (!newState) return;  // Invalid move — ignore

    // Broadcast result
    setGameStateRef.current(newState, true);
    return "ok";
  });

  RPC.register('swapTrump', async (data: { cardId: string }, caller: any) => {
    if (!isHost()) return;
    // ... validate and apply swap logic
  });

  RPC.register('playAgain', async () => {
    if (!isHost()) return;
    // ... reinitialize game
  });
}, []);  // Empty deps — register once
```

**Key Points:**
- `caller` is the PlayerState of whoever called the RPC. Use `caller.id` to identify them.
- Always check `if (!isHost()) return;` at the top for safety.
- Use **refs** (not state) inside handlers to avoid stale closures.
- Return a value (e.g. `"ok"`) to acknowledge the call.

### Any Player Calls RPCs:

```typescript
// Send to host only
RPC.call('playCard', { cardId: card.id }, RPC.Mode.HOST);

// Send to host only
RPC.call('swapTrump', { cardId: card.id }, RPC.Mode.HOST);

// Send to host only
RPC.call('playAgain', {}, RPC.Mode.HOST);
```

**`RPC.Mode.HOST`** — routes the call exclusively to the host player. This is the mode you want for host-authoritative games.

### Client-Side Validation (Optional, for UX)

Before sending an RPC, clients can do lightweight validation to show immediate feedback:

```typescript
const handleCardPlay = useCallback((card: Card) => {
  if (!currentPlayer || !gameState) return;

  // Client-side check: is it my turn?
  if (gameState.phase !== 'playing') {
    showNotification("Wait for the round to resolve", "WARNING");
    return;
  }
  const playerIndex = players.findIndex(p => p.id === currentPlayer.id);
  if (playerIndex !== gameState.currentTurnPlayerIndex) {
    showNotification("It's not your turn!", "WARNING");
    return;
  }

  // Send to host for authoritative validation
  RPC.call('playCard', { cardId: card.id }, RPC.Mode.HOST);
}, [currentPlayer, gameState, players]);
```

The host re-validates everything anyway, so this is purely for snappy UX.

---

## 8. Host-Authoritative Game Logic

### Architecture

Game logic lives in pure TypeScript classes that **only the host instantiates**:

```
BaseGameLogic (abstract)
├── OneVOneGameLogic
├── ThreeForAllGameLogic
└── TwoVTwoGameLogic
```

### Base Class Contract

```typescript
abstract class BaseGameLogic {
  protected players: PlayerState[];
  protected state: GameState;

  // Load state from multiplayer sync (host re-syncs before each operation)
  loadState(state: GameState): void;

  // Initialize a fresh game — shuffle, deal, return initial state
  initializeGame(): GameState;

  // Process a player's card play — validate, apply, return new state (or null)
  abstract playCard(playerId: string, cardId: string): GameState | null;

  // Resolve a completed round — determine winner, draw cards, advance
  abstract resolveRound(): GameState;

  // Swap a card with the trump card
  swapWithTrump(playerId: string, cardId: string): GameState | null;
}
```

### Host Workflow

```
1. Player clicks card → Client calls RPC.call('playCard', {cardId}, RPC.Mode.HOST)
2. Host's RPC handler fires
3. Host loads latest state: gameLogic.loadState(gameStateRef.current)
4. Host validates & applies: const newState = gameLogic.playCard(caller.id, cardId)
5. If valid (not null), host broadcasts: setGameState(newState, true)
6. All clients re-render with new state
```

### State Phases

The game state has a `phase` field that drives the entire UI and logic:

```typescript
type GamePhase =
  | 'waiting'           // Before game starts
  | 'revealing_hands'   // 2v2 only: teammates see each other's cards
  | 'playing'           // Active gameplay, accepting card plays
  | 'round_complete'    // Cards on table, showing winner highlight
  | 'game_over';        // Final scores displayed
```

### Timed Transitions (Host-Driven)

Some phase transitions happen on a timer. **Only the host runs timers**:

```typescript
// After a round completes, wait 1.6s then resolve
if (newState.phase === 'round_complete') {
  resolveTimerRef.current = setTimeout(() => {
    const latestState = gameStateRef.current;
    if (!latestState || latestState.phase !== 'round_complete') return;
    gameLogic.loadState(latestState);
    const resolvedState = gameLogic.resolveRound();
    setGameStateRef.current(resolvedState, true);
  }, 1600);
}

// 2v2 hand reveal phase: auto-advance after 5 seconds
if (gameState.phase === 'revealing_hands') {
  setTimeout(() => {
    setGameState({ ...latestState, phase: 'playing' }, true);
  }, 5000);
}
```

---

## 9. Player Lifecycle Events

### Detecting Joins and Quits

```typescript
useEffect(() => {
  const unsubscribe = onPlayerJoin((playerState: any) => {
    // Fires when a new player connects

    playerState.onQuit(() => {
      // Fires when this specific player disconnects
      showNotification("Player left the game!", "ERROR");
    });
  });

  return unsubscribe;  // Clean up on unmount
}, []);
```

### Player List (Reactive)

```typescript
const players = usePlayersList(true);  // true = include self
```

This is a **React hook** — the component re-renders whenever players join or leave. The array contains `PlayerState` objects.

### Identifying Players

```typescript
const currentPlayer = myPlayer();     // Your own PlayerState
const amHost = isHost();              // Boolean: am I the host?
const playerId = currentPlayer.id;    // Unique string ID
```

---

## 10. Room Management

### Getting the Room Code

```typescript
const roomCode = getRoomCode();  // e.g. "ABCD"
```

Room codes may not be immediately available after `insertCoin`. Poll for it:

```typescript
useEffect(() => {
  const code = getRoomCode();
  if (code) setRoomCode(code);

  const timer = setInterval(() => {
    const c = getRoomCode();
    if (c) { setRoomCode(c); clearInterval(timer); }
  }, 500);

  return () => clearInterval(timer);
}, []);
```

### Sharing the Room

Players share via:
1. **Room code** — Copy `"ABCD"` directly
2. **Invite URL** — `https://yourdomain.com?refcode=ABCD`
3. **QR code** — Encode the invite URL

On the joining side, parse the URL:

```typescript
const params = new URLSearchParams(window.location.search);
const refcode = params.get('refcode');
if (refcode) {
  connect(savedName, savedEmoji, refcode);  // Auto-join
}
```

---

## 11. Complete Data Flow

### Game Creation

```
Hero Screen → User clicks "Create Game"
  → insertCoin({ skipLobby: true, maxPlayersPerRoom: N })
  → Playroomkit creates room, assigns this player as HOST
  → Host sets shared state:
      setHostId(myPlayer().id, true)
      setSharedMode(gameMode, true)
  → Host displays room code in Lobby UI
  → Other players join via insertCoin({ roomCode: "ABCD" })
  → Host verifies player count, clicks "Start Game"
  → Host creates GameLogic, calls initializeGame()
  → Host broadcasts: setGameState(initialState, true)
  → All clients render game UI
```

### Turn Cycle

```
[CLIENT] Player taps card
  → Client validates (is it my turn? correct phase?)
  → RPC.call('playCard', { cardId }, RPC.Mode.HOST)

[HOST] RPC handler fires
  → isHost() check ✓
  → gameLogic.loadState(gameStateRef.current)
  → gameLogic.playCard(caller.id, cardId)
  → If invalid: return (ignore)
  → If valid: setGameState(newState, true)

[ALL CLIENTS] useMultiplayerState re-renders
  → UI shows new card on table
  → If all players played → phase becomes 'round_complete'
  → Host starts 1.6s timer → resolveRound() → next round or game_over
```

### Non-Game Communication (Quick Chat)

```
[ANY PLAYER] clicks a quick chat message
  → setQuickChat({ senderId: myId, message: "Nice!", ts: Date.now() }, true)

[ALL CLIENTS] useMultiplayerState picks up new quickChat value
  → Show animated bubble with sender's name/avatar and message
  → Auto-dismiss after 3 seconds
```

This demonstrates that `useMultiplayerState` isn't limited to host-only writes. Any player can write to shared state for features that don't need host validation.

---

## 12. Full API Reference (Used)

| API | Type | Purpose |
|-----|------|---------|
| `insertCoin(options)` | Async function | Connect to / create a room |
| `useMultiplayerState(key, default)` | React hook | Shared state synced across all players |
| `myPlayer()` | Function | Get your own PlayerState object |
| `usePlayersList(includeSelf)` | React hook | Reactive array of all connected players |
| `isHost()` | Function | Check if current client is the host |
| `onPlayerJoin(callback)` | Function | Register join listener (returns unsubscribe fn) |
| `playerState.onQuit(callback)` | Method | Register disconnect listener for a specific player |
| `playerState.setState(key, value, reliable)` | Method | Set per-player state |
| `playerState.getState(key)` | Method | Read per-player state |
| `playerState.getProfile()` | Method | Get Playroomkit profile (name, photo) |
| `playerState.id` | Property | Unique player identifier string |
| `RPC.register(name, handler)` | Function | Register an RPC handler (host-side) |
| `RPC.call(name, data, mode)` | Function | Call a registered RPC |
| `RPC.Mode.HOST` | Constant | Route RPC to host only |
| `getRoomCode()` | Function | Get the current room's alphanumeric code |

---

## 13. Patterns & Best Practices

### Pattern 1: Ref-Mirroring for Async Handlers

Always mirror `useMultiplayerState` values into refs when they're accessed inside RPC handlers, setTimeout, or any closure that outlives a render:

```typescript
const [state, setState] = useMultiplayerState("game", null);
const stateRef = useRef(state);
const setStateRef = useRef(setState);
useEffect(() => { stateRef.current = state; }, [state]);
useEffect(() => { setStateRef.current = setState; }, [setState]);
```

### Pattern 2: Host-Only Logic Guard

Every RPC handler and every timed transition must check `isHost()`:

```typescript
RPC.register('action', async (data, caller) => {
  if (!isHost()) return;
  // ...
});
```

### Pattern 3: Game Logic as Pure Class

Keep game logic in a separate class (not in React components). The class:
- Takes `PlayerState[]` in the constructor
- Has `loadState(state)` / `getState()` for serialization
- Returns new state snapshots (immutable pattern)
- Never accesses Playroomkit APIs directly

This separation means the same logic works for testing, replay, and AI bots.

### Pattern 4: State-Driven UI

The entire UI is driven by a single `gameState` object. Components never have their own game-related state — they read from the shared state and dispatch actions via RPC.

```typescript
// UI reads state:
const isMyTurn = gameState.currentTurnPlayerIndex === myIndex;
const myHand = gameState.playerHands[myId];
const phase = gameState.phase;

// UI dispatches action:
const onCardClick = (card) => RPC.call('playCard', { cardId: card.id }, RPC.Mode.HOST);
```

### Pattern 5: Client-Side Pre-Validation

For snappy UX, validate on the client before sending the RPC. Show immediate feedback for obviously invalid actions (wrong turn, wrong phase). The host re-validates regardless.

### Pattern 6: Host Broadcasts Identity

The host writes its own ID to shared state so all clients know who the host is:

```typescript
if (amHost && currentPlayer) {
  setHostId(currentPlayer.id, true);
}
```

This lets the UI show "Host" badges, disable/enable buttons based on host status, etc.

---

## 14. Gotchas & Pitfalls

### 1. `maxPlayersPerRoom` on Join

**Never** pass `maxPlayersPerRoom` when joining an existing room. It must only be set by the room creator. Passing a different value causes `ROOM_LIMIT_EXCEEDED`.

```typescript
await insertCoin({
  skipLobby: true,
  ...(roomCode ? { roomCode } : {}),
  ...(!roomCode ? { maxPlayersPerRoom: maxPlayers } : {}),  // Only when creating
});
```

### 2. `getRoomCode()` Timing

`getRoomCode()` may return `null` immediately after `insertCoin` resolves. Poll with a short interval.

### 3. Stale Closures in RPC Handlers

RPC handlers registered in a `useEffect(, [])` capture the initial render's values. **Always** use refs to access current state inside handlers.

### 4. Host Determination Is Automatic

You don't choose who's host. Playroomkit assigns the first player who creates the room. If the host disconnects, Playroomkit can auto-migrate to another player (depending on configuration).

### 5. `useMultiplayerState` Triggers Re-renders

Every call to `setX(value, true)` triggers a re-render on **all connected clients**. Keep the game state object reasonably sized. Don't store derived data — compute it on render.

### 6. Per-Player State vs Shared State

Use **per-player state** for data that belongs to one player (name, avatar, team choice). Use **shared state** for data that represents the game or room as a whole. Don't put per-player data in shared state or vice versa.

### 7. TypeScript Types

Playroomkit's `PlayerState` type comes from `"playroomkit"`. The `caller` parameter in RPC handlers is typed as `any` — you can rely on `caller.id` being a string.

---

## 15. Skeleton Template

Here's a minimal template to bootstrap any host-authoritative multiplayer game with Playroomkit:

```typescript
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  insertCoin,
  useMultiplayerState,
  myPlayer,
  usePlayersList,
  isHost,
  onPlayerJoin,
  RPC,
  getRoomCode,
} from "playroomkit";

// ===== YOUR GAME STATE TYPE =====
interface GameState {
  phase: 'waiting' | 'playing' | 'game_over';
  currentTurnPlayerIndex: number;
  // ... your game-specific fields
}

// ===== YOUR GAME LOGIC CLASS =====
class GameLogic {
  private players: any[];
  private state: GameState;

  constructor(players: any[]) {
    this.players = players;
    this.state = { phase: 'waiting', currentTurnPlayerIndex: 0 };
  }

  loadState(state: GameState) { this.state = JSON.parse(JSON.stringify(state)); }
  getState(): GameState { return JSON.parse(JSON.stringify(this.state)); }
  initializeGame(): GameState { /* shuffle, deal, etc. */ return this.getState(); }
  performAction(playerId: string, data: any): GameState | null {
    // Validate and apply the action. Return null if invalid.
    return this.getState();
  }
}

// ===== MAIN COMPONENT =====
export default function Game() {
  const [phase, setPhase] = useState<'menu' | 'connecting' | 'connected'>('menu');

  const connect = useCallback(async (roomCode?: string) => {
    setPhase('connecting');
    try {
      await insertCoin({
        skipLobby: true,
        ...(roomCode ? { roomCode } : {}),
        ...(!roomCode ? { maxPlayersPerRoom: 4 } : {}),
      });
      setPhase('connected');
    } catch (err) {
      setPhase('menu');
    }
  }, []);

  if (phase === 'menu') {
    return (
      <div>
        <button onClick={() => connect()}>Create Game</button>
        <button onClick={() => connect("ABCD")}>Join Game</button>
      </div>
    );
  }

  if (phase === 'connecting') return <div>Connecting...</div>;

  return <ConnectedGame />;
}

function ConnectedGame() {
  // ===== PLAYROOMKIT HOOKS =====
  const players = usePlayersList(true);
  const [gameState, setGameState] = useMultiplayerState<GameState | null>("game", null);
  const currentPlayer = myPlayer();
  const amHost = isHost();

  // ===== REFS (for async handlers) =====
  const gameLogicRef = useRef<GameLogic | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const setGameStateRef = useRef(setGameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { setGameStateRef.current = setGameState; }, [setGameState]);

  // ===== SET PLAYER PROFILE =====
  useEffect(() => {
    if (currentPlayer) {
      currentPlayer.setState('displayName', 'Player', true);
    }
  }, [currentPlayer]);

  // ===== REGISTER RPC HANDLERS (host-side) =====
  useEffect(() => {
    RPC.register('action', async (data: any, caller: any) => {
      if (!isHost()) return;
      const logic = gameLogicRef.current;
      const state = gameStateRef.current;
      if (!logic || !state) return;

      logic.loadState(state);
      const newState = logic.performAction(caller.id, data);
      if (!newState) return; // Invalid action

      setGameStateRef.current(newState, true); // Broadcast to all
      return "ok";
    });
  }, []);

  // ===== PLAYER JOIN / QUIT =====
  useEffect(() => {
    const unsub = onPlayerJoin((player: any) => {
      player.onQuit(() => {
        console.log("Player left");
      });
    });
    return unsub;
  }, []);

  // ===== HOST STARTS GAME =====
  const startGame = useCallback(() => {
    if (!amHost) return;
    const logic = new GameLogic(players);
    gameLogicRef.current = logic;
    const initialState = logic.initializeGame();
    setGameState(initialState, true);
  }, [amHost, players, setGameState]);

  // ===== CLIENT SENDS ACTION =====
  const sendAction = useCallback((data: any) => {
    RPC.call('action', data, RPC.Mode.HOST);
  }, []);

  // ===== RENDER =====
  if (!gameState) {
    // LOBBY
    return (
      <div>
        <p>Room Code: {getRoomCode()}</p>
        <p>Players: {players.length}</p>
        {amHost && <button onClick={startGame}>Start Game</button>}
      </div>
    );
  }

  // GAME
  return (
    <div>
      <p>Phase: {gameState.phase}</p>
      <button onClick={() => sendAction({ type: 'myAction' })}>
        Do Action
      </button>
    </div>
  );
}
```

---

## Summary

The entire multiplayer system rests on three pillars:

1. **`useMultiplayerState`** — Reactive shared state for game data. Host writes, all read.
2. **`RPC.register` / `RPC.call`** — Request-response channel. Clients request, host processes.
3. **`PlayerState.setState` / `getState`** — Per-player metadata (name, avatar, team).

The host runs all game logic as a pure TypeScript class, validates every action, and broadcasts the resulting state. Clients are thin renderers that dispatch actions and react to state changes. This pattern scales to any turn-based or real-time game — chess, poker, trivia, board games — with zero backend infrastructure.
