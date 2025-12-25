# Jarvis - Personal AI Assistant

Your personal assistant app inspired by Iron Man's Jarvis. Manage your tasks, organize your week, track finances, and more.

## 🚀 Features

- **Task Management**: Set and organize tasks for the week
- **Week Organization**: Efficiently plan and organize your weekly schedule
- **Finance Tracking**: Manage and track your personal finances
- **AI Integration** (Coming Soon): Intelligent assistance powered by AI

## 📁 Project Structure

This is a monorepo containing:

- `apps/web` - Next.js web application
- `apps/mobile` - React Native/Expo mobile application
- `packages/shared` - Shared types and utilities

## 🛠️ Setup

### Prerequisites

- Node.js 18+ and npm
- For mobile development: Expo CLI (optional, included in dependencies)

### Installation

```bash
# Install all dependencies
npm install

# Start web app
npm run dev:web

# Start mobile app (in a separate terminal)
npm run dev:mobile
```

## 🌐 Web App

The web app runs on `http://localhost:3000` by default.

## 📱 Mobile App

The mobile app uses Expo. You can:
- Run on iOS simulator: Press `i` in the Expo terminal
- Run on Android emulator: Press `a` in the Expo terminal
- Scan QR code with Expo Go app on your phone

## 🔮 Future: AI Integration

The app is designed to be extensible for AI features. Here's the roadmap for making it truly like Jarvis:

### Phase 1: Basic AI Features
1. **Natural Language Processing**: 
   - Integrate OpenAI API or similar for understanding text commands
   - "Add a task to buy groceries tomorrow" → Creates task automatically
   - "Show me my expenses this month" → Displays financial summary

2. **Smart Task Suggestions**:
   - AI analyzes your task patterns and suggests optimal scheduling
   - Recommends task priorities based on deadlines and importance
   - Suggests breaking down large tasks into smaller ones

### Phase 2: Advanced Features
3. **Financial Insights**:
   - AI analysis of spending patterns and trends
   - Budget recommendations based on income and goals
   - Anomaly detection for unusual spending

4. **Intelligent Week Organization**:
   - AI-powered time blocking suggestions
   - Conflict detection and resolution
   - Energy level optimization (scheduling high-focus tasks at optimal times)

### Phase 3: Voice Interface (True Jarvis Experience)
5. **Voice Commands**:
   - Speech-to-text integration (Web Speech API or native)
   - Voice-activated task creation and queries
   - Natural conversation flow

6. **Proactive Assistance**:
   - Reminders and notifications based on context
   - Weather-aware scheduling suggestions
   - Calendar integration and conflict resolution

### Implementation Notes
- Consider using OpenAI GPT-4 for natural language understanding
- For voice: Web Speech API (web) or React Native Voice (mobile)
- Store AI preferences and context in user settings
- Implement rate limiting and cost management for API calls
- Consider local AI models (e.g., Ollama) for privacy-sensitive features

## 📝 Development

- Web: `apps/web` - Next.js with TypeScript and Tailwind CSS
- Mobile: `apps/mobile` - React Native with Expo
- Shared: `packages/shared` - TypeScript types and utilities

## 🎨 Tech Stack

- **Web**: Next.js 14, React, TypeScript, Tailwind CSS
- **Mobile**: React Native, Expo, TypeScript
- **State Management**: React Context API (can be upgraded to Zustand/Redux)
- **Storage**: LocalStorage (web) / AsyncStorage (mobile) - can be upgraded to a database

