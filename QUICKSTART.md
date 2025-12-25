# Quick Start Guide

Get your Jarvis app up and running in minutes!

## Initial Setup

1. **Install dependencies** (from the root directory):
   ```bash
   npm install
   ```

2. **Build the shared package** (required for TypeScript types):
   ```bash
   cd packages/shared
   npm run build
   cd ../..
   ```

## Running the Web App

1. **Start the development server**:
   ```bash
   npm run dev:web
   ```

2. **Open your browser**:
   Navigate to `http://localhost:3000`

3. **Start using Jarvis**:
   - Click on "Tasks" to create and manage tasks
   - Click on "Week" to see your weekly schedule
   - Click on "Finances" to track income and expenses

## Running the Mobile App

1. **Install Expo CLI** (if not already installed):
   ```bash
   npm install -g expo-cli
   ```

2. **Start the Expo development server**:
   ```bash
   npm run dev:mobile
   ```

3. **Run on your device**:
   - **iOS**: Press `i` in the terminal or scan QR code with Camera app
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go app
   - **Web**: Press `w` in the terminal

## First Steps

### Create Your First Task
1. Go to the Tasks tab
2. Click "+ New Task"
3. Fill in the task details (title, priority, due date)
4. Click "Add Task"

### Organize Your Week
1. Go to the Week tab
2. Create tasks with due dates
3. View them organized by day in the week view
4. Navigate between weeks using the arrow buttons

### Track Your Finances
1. Go to the Finances tab
2. Click "+ Transaction"
3. Add income or expenses
4. View your financial summary and recent transactions

## Data Storage

- **Web**: Data is stored in browser's localStorage
- **Mobile**: Data is stored in AsyncStorage

⚠️ **Note**: This is local storage only. Data will be lost if you clear browser data or uninstall the app. For production, consider adding cloud sync or a database.

## Troubleshooting

### "Module not found" errors
- Make sure you've built the shared package: `cd packages/shared && npm run build`
- Try deleting `node_modules` and running `npm install` again

### Mobile app won't start
- Make sure you have Expo Go installed on your phone
- Check that your phone and computer are on the same network
- Try restarting the Expo development server

### TypeScript errors
- Run `npm run build` in the shared package
- Make sure all dependencies are installed: `npm install`

## Next Steps

- Read `AI_INTEGRATION.md` to learn how to add AI features
- Customize the UI colors and styling
- Add more features like reminders, notifications, etc.
- Set up a database for persistent storage
- Deploy the web app (Vercel, Netlify, etc.)
- Build and publish the mobile app

