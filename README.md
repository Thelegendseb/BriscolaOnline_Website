# 🃏 Briscola Online

A fast-paced, multiplayer online version of the classic European card game **Briscola** (also known as Brisca). Play with friends in real-time across multiple game modes with full mobile and desktop support.

![GitHub last commit](https://img.shields.io/github/last-commit/Thelegendseb/BriscolaOnline)
![React](https://img.shields.io/badge/built%20with-React-blue)
![Next.js 14](https://img.shields.io/badge/built%20with-Next.js%2014-black)
![Playroom Kit](https://img.shields.io/badge/multiplayer-Playroom%20Kit-orange)
![Styled Components](https://img.shields.io/badge/styling-Styled%20Components-db7093)

---

## ✨ Features

### 🎮 Game Modes
- **1v1** — Classic head-to-head duel for 2 players
- **3 for All** — Free-for-all battle royale for 3 players
- **2v2 Teams** — Cooperative team-based play with teammate hand reveal phase

### 🌐 Online Multiplayer
- **Real-time Sync** — Powered by Playroom Kit for instant game state updates
- **Room Codes** — Simple 4-character codes to share with friends
- **Invite Links** — Copy shareable URLs with auto-join (with optional quick setup)
- **QR Code Sharing** — Generate QR codes for quick room invites
- **Cross-platform** — Play seamlessly between desktop and mobile

### 📱 Responsive Design
- **Desktop UI** — Full-featured card layout with player sidebars
- **Mobile UI** — Touch-optimized compact player circles and card swipe areas
- **Smart Layout** — Automatically adapts to screen size and player count

### 🎨 Polish & Accessibility
- **Emoji Avatars** — Express yourself with 16 unique emoji options
- **Sound Effects** — Audio feedback for card plays, rounds, and game events
- **Rules Popup** — In-game rule reference for learning Briscola
- **Play Again** — Instantly rematch without leaving the game
- **Match History** — Track your gameplay
- **Notifications** — Real-time alerts for game events
- **Dark Theme** — Easy on the eyes with modern dark UI

### 🔧 Technical Features
- **Trump Swap Mechanic** — Strategic trump card exchange system
- **Auto-save Preferences** — Remember username and emoji between sessions
- **Optimized Performance** — Responsive 60fps UI with efficient state management
- **Mobile-First Approach** — Progressive enhancement for all devices

---

## 🎯 How to Play

### Basic Rules
Briscola is a trick-taking card game played with Italian playing cards (40 cards). Players aim to win the most valuable cards based on suit rankings and trump value.

### Winning Conditions
- **1v1**: First player to score 61+ points wins
- **3 for All**: First player to score 61+ points wins
- **2v2 Teams**: Team that scores 61+ points wins

### In-Game Actions
- **Play Card** — Click/tap your card to play it on your turn
- **Swap Trump** — Exchange a card in your hand with the visible trump card (if allowed)
- **View Rules** — Press the rules button to see scoring and gameplay details

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Thelegendseb/BriscolaOnline.git
cd briscola_online

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start playing.

### Building for Production

```bash
npm run build
npm start
```

---

## 🛠 Tech Stack

- **Frontend**: React 18 + Next.js 14 (App Router)
- **Styling**: Styled Components v6 with SSR support
- **Multiplayer**: Playroom Kit v0.0.87 for real-time sync
- **QR Codes**: qrcode.react
- **Icons**: lucide-react
- **Card Graphics**: Custom SVG-based card rendering
- **Type Safety**: TypeScript

---

## 🎮 Room Sharing

### Copy Room Code
Share the room's 4-character code with friends—they can paste it into the join field.

### Copy Invite Link
Get a shareable URL like `http://localhost:3000?refcode=ABC1` — send it to friends and they can join directly (with optional quick setup if they haven't played before).

### QR Code
Tap **SHOW QR** to generate a QR code pointing to your room. Scan with any phone and join instantly!

---

## 🔄 State Management

- **Game State**: Playroomkit's multiplayer state for real-time sync across all players
- **Local State**: React hooks for UI state (phase, devices, notifications)
- **Refs**: Optimized game logic refs to prevent unnecessary re-renders

---

## 🎨 Design System

All colors, typography, and spacing use a centralized design system in `gameDesign.ts`:
- **Colors**: Primary, secondary, accents (green, cyan, red)
- **Radius**: Consistent border-radius tokens for buttons и containers
- **Typography**: Responsive font sizing with clamp()
- **Animations**: Smooth keyframe transitions for UI feedback

---

## 🐛 Known Limitations

- Game modes are locked upon room creation (must restart to change)
- Team assignment available only during lobby phase (2v2 mode)
- Lobby leaving is broken.

---

## 📝 License

This project is open source and available under the MIT License.

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork, create issues, and submit pull requests.

---

## 📞 Contact

For questions or feedback, please open an issue on GitHub or reach out directly.

Enjoy the game! 🎉
