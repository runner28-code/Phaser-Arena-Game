# Honor of Knight

A fast-paced 2D action game built with Phaser.js featuring both single-player and multiplayer modes. Battle enemies, collect power-ups, and survive increasingly difficult waves in this medieval fantasy adventure.

## 🎮 Features

- **Two Game Modes**: Single-player campaign and multiplayer PvP
- **Wave-Based Combat**: Face increasingly difficult enemy waves
- **Power-Up System**: Collect health potions, shields, damage boosts, and speed boosts
- **Upgrade System**: Level up your character between waves
- **Real-time Multiplayer**: WebSocket-based multiplayer with up to 2 players
- **Responsive Audio**: Master volume, SFX, and music controls
- **Smooth Animations**: 8-directional character animations
- **Object Pooling**: Optimized performance with reusable game objects

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/runner28-code/Phaser-Arena-Game.git
   cd phaser-fantasy-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **For multiplayer mode, start the WebSocket server in a separate terminal**
   ```bash
   npm run server
   ```

5. **Open your browser** and navigate to `http://localhost:3000`

## 🎯 How to Play

### Controls

| Action | Key |
|--------|-----|
| Move Up | W / ↑ |
| Move Down | S / ↓ |
| Move Left | A / ← |
| Move Right | D / → |
| Attack | Spacebar |

### Single Player Mode

1. **Objective**: Survive as many waves as possible while defeating enemies
2. **Waves**: Each wave brings more enemies with increased difficulty
3. **Upgrades**: Between waves, choose from damage, speed, or health upgrades
4. **Collectibles**: Pick up items dropped by defeated enemies:
   - 🧪 **Health Potion**: Restores 20 HP
   - 🛡️ **Shield**: Grants 5 seconds of invulnerability
   - ⚔️ **Damage Boost**: 150% damage for 10 seconds
   - 💨 **Speed Boost**: 150% movement speed for 10 seconds
   - 🪙 **Coins**: Increases your score

### Multiplayer Mode

1. **Setup**: Start the WebSocket server with `npm run server`
2. **Connection**: Several players can join the same game
3. **Objective**: Be the last player standing
4. **Combat**: Attack enemies
5. **Collectibles**: Same power-ups as single-player
6. **Game End**: Game ends when a player dies

## 🏗️ Project Structure

```
src/
├── client/                 # Client-side game code
│   ├── entities/          # Game entities (Player, Enemy, Collectible, etc.)
│   ├── scenes/            # Phaser scenes (Game, Menu, etc.)
│   ├── systems/           # Game systems (SpawnManager, ObjectPool)
│   ├── ui/                # UI components (VolumeControls)
│   └── main.ts            # Client entry point
├── server/                # Server-side multiplayer code
│   ├── GameRoom.ts        # Main game room logic
│   ├── WebSocketServer.ts # WebSocket server implementation
│   └── server.ts          # Server entry point
└── shared/                # Shared code between client and server
    ├── config/            # Game configuration and constants
    └── types/             # TypeScript type definitions
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start the Vite development server
- `npm run build` - Build the project for production
- `npm run preview` - Preview the production build
- `npm run server` - Start the multiplayer WebSocket server

### Building for Production

```bash
npm run build
npm run preview
```

### Multiplayer Setup

For multiplayer functionality:

1. **Terminal 1**: Start the WebSocket server
   ```bash
   npm run server
   ```

2. **Terminal 2**: Start the client
   ```bash
   npm run dev
   ```

3. **Browser**: Open multiple tabs/windows to `http://localhost:3000`
4. **Game**: Select "Multiplayer" from the main menu

## 🎨 Game Assets

The game uses custom sprites and audio files located in `src/client/scenes/assets/`:

- **Sprites**: Player, enemies (slime, goblin), collectibles, UI elements
- **Audio**: Background music, sound effects (attacks, pickups, etc.)
- **Animations**: 8-directional movement and attack animations

## 🔧 Configuration

Game settings can be modified in `src/shared/config/`:

- `constants.ts` - Game constants (health, speed, damage, etc.)
- `enemies.json` - Enemy configurations and stats

## 🌐 Multiplayer Architecture

- **WebSocket Communication**: Real-time bidirectional communication
- **Server Authoritative**: Server manages game state and physics
- **State Synchronization**: Client-side interpolation for smooth movement
- **Message Packing**: Efficient msgpack-lite serialization

## 📱 Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🙏 Acknowledgments

- Built with [Phaser.js](https://phaser.io/)
- WebSocket server using [ws](https://github.com/websockets/ws)
- Message serialization with [msgpack-lite](https://github.com/kawanet/msgpack-lite)
- Development server powered by [Vite](https://vitejs.dev/)
