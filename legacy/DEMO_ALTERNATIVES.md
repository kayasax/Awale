# Awale Bot Demo Guide - Alternative Testing Methods

## 🚫 Teams Restriction Workaround

Since your organization restricts custom Teams apps, here are current alternatives to demonstrate your Awale bot:

## Method 1: Azure Bot Service Test in Web Chat (Recommended)

### Setup:
1. Go to **Azure Portal** → **Bot Services** → Find your bot (ID: 94ecc03e-3bdc-4f89-abce-2d6eda64f5bd)
2. Click **Test in Web Chat** in the left menu
3. This provides immediate testing without additional downloads

### Demo Commands:
- `new game` - Start a new Awale game
- `help` - Show game rules
- `move 3` - Make a move (pit number 1-6)
- `quit` - End current game

*Note: Bot Framework Emulator is being retired (Dec 2025) in favor of Azure Agents Playground*

## Method 2: Direct Line Web Chat Integration

### Create a secure web demo:
1. Enable **Direct Line** channel in your Azure Bot Service
2. Generate a **Direct Line secret**
3. Use the provided `web-demo.html` with proper authentication
4. Share secure demo URL with your team

## Method 3: Azure Agents Playground (Future)

### Microsoft's new testing platform:
- **Replacing Bot Framework Emulator** (available late 2025)
- **Integrated Azure experience** for bot testing
- **Enhanced debugging** and conversation flow testing
- **Current Status**: In development, not yet available

## Method 4: Request IT Exception

### For your hackathon demo:
- **Explain it's temporary** (just for hackathon demonstration)
- **Show the security**: App is hosted on your own Azure tenant
- **Highlight the learning**: Demonstrates Microsoft Bot Framework integration
- **Propose time limit**: Request 24-48 hour exception for demo purposes

## Method 5: Screen Recording Demo

### Create a video demonstration:
- Record bot interaction using **Azure Portal Test in Web Chat**
- Show game mechanics and AI responses
- Present to judges/team via screen share

## Current Status:
✅ Bot is fully deployed and functional at: https://app-ho6sgq4onri72.azurewebsites.net/
✅ All game logic, AI opponent, and conversation handling working
✅ Professional Azure infrastructure deployed
✅ Teams integration ready (just blocked by policy)

*Note: Bot Framework Emulator being retired in favor of Azure Agents Playground (Dec 2025)*

The technical implementation is complete - only organizational policy preventing Teams integration.