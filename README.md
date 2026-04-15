# Survival Wave Shooter - Ultra Detail

A massively detailed, browser-based survival FPS built with Three.js, Cannon-es, and PartyKit.

## 🚀 Deployment

### Vercel (Frontend)
1. Push this code to GitHub.
2. Link the repository to [Vercel](https://vercel.com).
3. Vercel will automatically build and deploy.

### PartyKit (Backend)
1. Install CLI: `npm install --save-dev partykit`
2. Deploy: `npx partykit deploy`
3. Update `host` in `src/client/main.js` with your unique URL.

## 🎮 Controls
- **WASD**: Move
- **Mouse**: Look & Attack
- **Space**: Jump
- **Shift**: Sprint
- **Tab**: Settings (FOV, Dist, Optimization)
- **B**: Upgrade Terminal
- **1, 2, 3**: Switch Weapons

## ✨ Features
- **Massive World**: Chunk-based generation with Biomes (Forest, Desert, Swamp, Tundra, City).
- **1000+ Buildings**: Procedural generation with floors, accurate interiors, and foundations.
- **100+ Enemies**: Tiered difficulty system with unique stats, names, and health bars.
- **Infinite Upgrades**: Scale your Damage, Speed, HP, and Gold gain.
- **Physics Suspension**: Fixed the "sinking" bug by freezing physics during menu interaction.
- **Visual Feedback**: Projected damage numbers and point gains.

## 🛠 Tech Stack
- **Engine**: Three.js
- **Physics**: Cannon-es (Heightfield Terrain)
- **Multiplayer**: PartyKit
- **UI**: Vanilla CSS (Custom Cyberpunk Theme)
