# Honor of Knight - System Architecture

## Table of Contents
- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Design Patterns](#design-patterns)
- [Network Protocol](#network-protocol)
- [Key Design Decisions](#key-design-decisions)

## System Overview

Honor of Knight is a real-time multiplayer 2D action game built with Phaser.js, featuring both single-player and multiplayer modes. The game implements wave-based combat with collectible power-ups, character upgrades, and WebSocket-based multiplayer synchronization.

### Core Components
- **Client**: Phaser.js-based game client with scene management
- **Server**: Node.js WebSocket server handling game state and multiplayer logic
- **Shared**: TypeScript types and configuration shared between client and server

## High-Level Architecture

```
┌─────────────────┐    WebSocket   ┌─────────────────┐
│                 │◄──────────────►│                 │
│   Game Client   │   (msgpack)    │   Game Server   │
│   (Phaser.js)   │                │   (Node.js)     │
│                 │                │                 │
├─────────────────┤                ├─────────────────┤
│ • Scene System  │                │ • GameRoom      │
│ • Entity System │                │ • WebSocket     │
│ • UI Components │                │ • State Sync    │
│ • Audio System  │                │ • Physics       │
└─────────────────┘                └─────────────────┘
         │                                   │
         ▼                                   ▼
┌─────────────────┐                ┌─────────────────┐
│   Game Assets   │                │   Game State    │
│ • Sprites       │                │ • Players       │
│ • Audio         │                │ • Enemies       │
│ • Animations    │                │ • Collectibles  │
└─────────────────┘                └─────────────────┘
```

### Client Architecture

```
Game Client (Phaser.js)
├── Scenes/
│   ├── MainMenuScene    # Game menu and settings
│   ├── GameScene        # Main gameplay (single/multiplayer)
│   ├── UpgradeScene     # Character upgrade selection
│   ├── GameOverScene    # Game end screen
│   └── PreloadScene     # Asset loading
├── Entities/
│   ├── Player           # Local player character
│   ├── RemotePlayer     # Other players in multiplayer
│   ├── Enemy            # Enemy base class + Slime/Goblin
│   └── Collectible      # Power-up items
├── Systems/
│   ├── SpawnManager     # Enemy spawning and wave management
│   ├── ObjectPool       # Performance optimization
│   └── NetworkManager   # WebSocket communication
└── UI/
    └── VolumeControls   # Audio settings
```

### Server Architecture

```
Game Server (Node.js)
├── GameRoom             # Main game logic and state
│   ├── Player Management
│   ├── Enemy AI & Spawning
│   ├── Collectible System
│   ├── Physics & Collision
│   └── Wave Progression
├── WebSocketServer      # Connection handling
└── State Synchronization
```

## Design Patterns

### 1. **Component Pattern (Phaser.js Scene System)**
**Usage**: Each game screen (Menu, Game, Upgrade, etc.) is a separate Phaser Scene
**Why**: Allows modular screen management, easy transitions, and isolated logic per screen

### 2. **Object Pool Pattern**
**Implementation**: `ObjectPool<T>` class for reusable game objects
**Why**: Prevents garbage collection spikes in Phaser.js, maintains consistent performance during intense gameplay

### 3. **Factory Pattern**
**Usage**: `Enemy.createEnemy()` static method for enemy instantiation
**Why**: Centralizes enemy creation logic, makes it easy to add new enemy types, and handles configuration loading

### 4. **Observer Pattern (Phaser.js Events)**
**Usage**: Phaser's event system for collision detection and UI interactions
**Why**: Decouples event producers from consumers, allows flexible event handling

### 5. **Strategy Pattern (Game Modes)**
**Usage**: Single-player vs multiplayer modes with different update logic
**Why**: Allows different gameplay behaviors without complex conditional logic

### 6. **Singleton Pattern (NetworkManager)**
**Usage**: Single NetworkManager instance per client
**Why**: Ensures consistent WebSocket connection management and prevents multiple connections

### 7. **State Pattern (Player States)**
**Usage**: Player state management (idle, walking, attacking, dead)
**Why**: Clear state transitions and behavior changes based on current state

## Network Protocol

### Message Types

All messages use MessagePack serialization for efficient binary transmission.

#### Client → Server Messages
```typescript
enum MessageType {
  JOIN_GAME    = 'JOIN_GAME',     // Player joining game
  LEAVE_GAME   = 'LEAVE_GAME',    // Player disconnecting
  PLAYER_INPUT = 'PLAYER_INPUT'   // Movement and action input
}
```

#### Server → Client Messages
```typescript
enum MessageType {
  YOU_JOINED         = 'YOU_JOINED',          // Player successfully joined
  PLAYER_JOINED      = 'PLAYER_JOINED',       // Other player joined
  PLAYER_LEFT        = 'PLAYER_LEFT',         // Player disconnected
  GAME_STATE_UPDATE  = 'GAME_STATE_UPDATE',   // Full game state sync
  GAME_START         = 'GAME_START',          // Game beginning
  GAME_END           = 'GAME_END'             // Game finished
}
```

### Message Payloads

#### Player Input (High Frequency)
```typescript
interface PlayerInputPayload {
  direction: { x: number; y: number };  // Movement vector (-1 to 1)
  action?: 'attack';                    // Optional action trigger
}
```

#### Game State (20Hz)
```typescript
interface GameStateData {
  players: PlayerData[];        // All player states
  enemies: EnemyData[];         // All enemy states
  collectibles: CollectibleData[]; // All collectible states
  state: GameState;             // Current game state
  wave: number;                 // Current wave number
  gameTime: number;             // Elapsed game time
}
```

### State Synchronization Approach

#### **Server Authoritative Model**
- **Server manages all game physics and logic**
- **Client sends input, server computes state**
- **Server broadcasts authoritative state at 20Hz**

#### **Client-Side Interpolation**
```typescript
// NetworkManager.ts
getInterpolatedState() {
  // Linear interpolation between previous and current state
  const LERP_FACTOR = 0.3;
  return Phaser.Math.Linear(previousPos, currentPos, LERP_FACTOR);
}
```

#### **Delta Compression**
- Only changed state is sent (full state sync)
- MessagePack provides efficient binary serialization
- WebSocket maintains persistent connection

#### **Input Prediction**
- Client immediately applies local input for responsiveness
- Server corrections override when received
- Minimal latency compensation needed due to fast-paced gameplay

## Key Design Decisions

### 1. **Phaser.js Framework Choice**
**Decision**: Used Phaser.js over alternatives like Pixi.js or custom Canvas
**Rationale**:
- Mature 2D game framework with comprehensive features
- Excellent TypeScript support
- Large community and extensive documentation
- Built-in physics, animation, and scene management

### 2. **WebSocket + Server Authoritative Architecture**
**Decision**: Real-time WebSocket communication with server authority
**Rationale**:
- Prevents cheating and ensures fair gameplay
- Handles network inconsistencies gracefully
- Allows complex server-side game logic
- Scales better than peer-to-peer for game state

### 3. **Object Pooling for Performance**
**Decision**: Implemented ObjectPool for enemies and collectibles
**Rationale**:
- Phaser.js garbage collection can cause frame drops
- Object creation/destruction is expensive
- Maintains consistent 60fps during combat
- Memory usage remains bounded

### 4. **Shared Type Definitions**
**Decision**: Single source of truth for types in `/shared` directory
**Rationale**:
- Prevents client-server type mismatches
- Enables type-safe network communication
- Simplifies refactoring and maintenance
- TypeScript compilation catches errors early

### 5. **Scene-Based UI Architecture**
**Decision**: Each screen as separate Phaser Scene
**Rationale**:
- Clean separation of concerns
- Easy navigation between screens
- Isolated asset loading per scene
- Memory management through scene lifecycle

### 6. **MessagePack Serialization**
**Decision**: Binary serialization over JSON
**Rationale**:
- Significantly smaller message sizes (up to 50% reduction)
- Faster encoding/decoding
- Better real-time performance
- Maintained human readability for debugging

### 7. **Entity Component Design**
**Decision**: Separate classes for Player, Enemy, Collectible, RemotePlayer
**Rationale**:
- Clear responsibility separation
- Easy to extend with new entity types
- Modular update and render logic
- Simplified collision detection

### 8. **Configuration-Driven Enemy System**
**Decision**: JSON-based enemy configuration
**Rationale**:
- Easy to balance and modify enemy stats
- No code changes needed for tweaking
- Supports modding and content updates
- Type-safe configuration loading

### 9. **Responsive UI with Scaling**
**Decision**: Dynamic font sizes and positioning based on viewport
**Rationale**:
- Works across different screen sizes
- Maintains readability on mobile devices
- Professional presentation
- Future-proof for different platforms

### 10. **Audio Settings Persistence**
**Decision**: localStorage for volume preferences
**Rationale**:
- User preferences persist across sessions
- No server dependency for client settings
- Fast loading and immediate application
- Standard web storage API

## Performance Optimizations

### **Rendering**
- Object pooling prevents GC pauses
- Efficient sprite batching via Phaser.js
- Minimal DOM manipulation

### **Network**
- 20Hz state sync (balanced responsiveness vs bandwidth)
- MessagePack compression
- WebSocket connection reuse

### **Memory**
- Object pools for frequent object types
- Scene-based asset unloading
- Efficient collision detection

### **Code**
- TypeScript for compile-time error catching
- Modular architecture for maintainability
- JSDoc documentation for developer experience

This architecture provides a solid foundation for a scalable, maintainable multiplayer game with excellent performance and user experience.