# 🎮 Awale Teams Bot - Complete Setup Guide

## ✅ What's Ready

### 📦 **Teams App Package**: `awale-teams-app.zip`
- ✅ Manifest with bot configuration
- ✅ Color icon (192x192px)
- ✅ Outline icon (32x32px)
- ✅ Ready for sideloading to Teams!

### 🤖 **Bot Implementation**: `packages/bot/`
- ✅ Complete Bot Framework integration
- ✅ Game engine with AI opponent
- ✅ Teams messaging and Adaptive Cards
- ✅ Conversation state management

## 🚀 **Next Steps to Go Live**

### 1. **Register Your Bot** (5 minutes)
1. Go to: https://dev.botframework.com/bots/new
2. **Bot Name**: `Awale Game Bot`
3. **Bot Handle**: `awale-game-bot-[your-name]`
4. **Messaging Endpoint**: `https://your-ngrok-url.ngrok.io/api/messages`
5. **Get credentials**:
   - Copy **App ID**
   - Generate and copy **App Password**
6. **Enable Teams Channel** in bot registration

### 2. **Update Configuration** (2 minutes)
Edit `packages/bot/.env`:
```bash
MICROSOFT_APP_ID=your_app_id_from_step_1
MICROSOFT_APP_PASSWORD=your_app_password_from_step_1
PORT=3978
```

### 3. **Update Manifest** (2 minutes)
Edit `teams-app/manifest.json`:
- Replace `"id": "00000000..."` with your **App ID**
- Replace `"botId": "00000000..."` with your **App ID**

### 4. **Rebuild App Package** (1 minute)
```bash
# In teams-app/ directory
Compress-Archive -Path manifest.json,color.png,outline.png -DestinationPath ..\awale-teams-app.zip -Force
```

### 5. **Start Bot Locally** (1 minute)
```bash
npm run dev -w @awale/bot
```

### 6. **Create Public Tunnel** (2 minutes)
**Option A - Ngrok**:
```bash
# Install: https://ngrok.com/download
ngrok http 3978
# Copy the https URL (e.g., https://abc123.ngrok.io)
```

**Option B - VS Code Dev Tunnels**:
- Install: `code tunnel`
- Use built-in port forwarding

### 7. **Update Bot Registration** (1 minute)
- Go back to https://dev.botframework.com
- Update **Messaging Endpoint**: `https://your-tunnel-url.ngrok.io/api/messages`

### 8. **Deploy to Teams** (2 minutes)
1. Open **Microsoft Teams**
2. **Apps** → **Manage your apps** → **Upload an app**
3. **Upload a custom app**
4. Select `awale-teams-app.zip`
5. **Add** → **Open** → **Start playing!**

## 🎮 **How to Play**

### Commands:
- `new game` - Start playing
- `0-5` - Select pit to move
- `help` - Show rules
- `quit` - End game

### Game Flow:
1. You play pits 0-5 (bottom row)
2. AI plays pits 6-11 (top row)
3. Capture seeds by ending on opponent's side with 2-3 seeds
4. First to 25+ seeds wins!

## 🔧 **Testing Locally**

```bash
# Terminal 1: Start bot
npm run dev -w @awale/bot

# Terminal 2: Start ngrok
ngrok http 3978

# Use Bot Framework Emulator for quick testing
# Download: https://github.com/Microsoft/BotFramework-Emulator
```

## 🚀 **Production Deployment**

For hackathon submission, consider:
1. **Azure App Service** - Host the bot
2. **Azure Bot Service** - Production bot registration
3. **GitHub Actions** - Auto-deployment
4. **Teams App Store** - Organization-wide deployment

---

**Total Setup Time: ~15 minutes**
**Ready for hackathon demo and judging! 🏆**