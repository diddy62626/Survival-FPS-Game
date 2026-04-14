# Survival FPS Multiplayer Game

A real-time, browser-based survival FPS built with Three.js, Cannon-es (physics), and PartyKit (multiplayer).

## Features
- **Multiplayer**: Sync player positions and zombie states across rooms.
- **Server-Authoritative AI**: Zombies are managed by the server for a fair experience.
- **Singleplayer**: Offline mode with Easy/Normal/Hard difficulty.
- **Shop System**: Earn points from kills to buy a Knife, Pistol, or Health.
- **Realistic FX**: Blood splatters, muzzle flashes, and procedural textures.

## How to Play
- **WASD**: Move
- **Mouse**: Look & Shoot/Punch
- **Space**: Jump
- **Shift**: Sprint
- **1, 2, 3**: Switch Weapons (once purchased)
- **B**: Open Shop
- **M**: Room Menu

## Deployment

### 1. Deploy the Backend (PartyKit)
You need to deploy the server logic to PartyKit.
1. Install PartyKit CLI: `npm install --save-dev partykit`
2. Login: `npx partykit login`
3. Deploy: `npx partykit deploy src/server/index.ts --name survival-fps-game-server`

**Note**: After deploying, update the `host` URL in `src/client/main.js` to your deployed PartyKit URL.

### 2. Deploy the Frontend (Vercel)
1. Push this repository to GitHub.
2. Connect the repository to [Vercel](https://vercel.com).
3. Vercel will automatically detect Vite and deploy your game.

## Local Development
1. Install dependencies: `npm install`
2. Start PartyKit locally: `npm run pk-dev`
3. Start Vite locally: `npm run dev`
4. Open `http://localhost:3000` in your browser.
