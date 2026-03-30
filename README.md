# MacroTrack Pro 💪

**Advanced Fitness & Macro Tracker** - A premium, feature-rich fitness tracking app with macro monitoring, weight tracking, intermittent fasting timer, and progress analytics.

🔗 **[Live on GitHub](https://github.com/AbhijeetM777/macrotrack-pro)**

---

## What is MacroTrack Pro?

MacroTrack Pro is an enhanced version of the original MacroTrack, adding **13+ professional fitness tracker features** found in apps like MyFitnessPal, Cronometer, and MacroFactor. It's a **single-page PWA app** that runs offline and syncs data via localStorage.

---

## ✨ Key Features

### 📊 Today Screen
- **Calorie Ring** - Visual progress toward daily calorie goal
- **Macro Tracking** - Protein, Carbs, Fat with progress bars
- **Micronutrients** - Fiber, Sugar, Sodium monitoring ⭐ NEW
- **Water Intake** - 8 glasses per day tracker
- **Steps & Activities** - Step counter + activity presets (Walk, Run, Gym)
- **Net Calories** - Calories eaten minus burned
- **Daily Notes** - Journal your mood & progress ⭐ NEW
- **Favorites Quick-Log** - Rapidly log favorite foods ⭐ NEW

### 📈 History Screen
- **30-Day Trend Chart** - Canvas-based calorie trends ⭐ NEW
- **Calendar Grid** - Visual log of tracked days
- **Monthly Stats** - Avg calories, days logged, avg protein, streak
- **Weekly Bars** - Last 7 days at a glance

### ⚖️ Weight Screen ⭐ NEW
- **Current Weight Display** with BMI badge
- **Weight Logger** - Date + weight entries
- **Weight Trend Chart** - 30-day progress visualization
- **Body Measurements** - Waist, chest, arms tracking
- **Weight History** - Full log of past entries

### ⏱️ Fasting Screen ⭐ NEW
- **Intermittent Fasting Protocols** - 16:8, 18:6, 20:4, OMAD
- **Circular Timer** - Beautiful progress arc
- **Elapsed/Remaining Time** - Clear fasting status
- **Start/Stop Controls** - Easy fasting management
- **Fasting History** - Track streaks

### 👤 Profile Screen
- **Dark/Light Theme Toggle** ⭐ NEW
- **Meal Reminders** - Notification settings ⭐ NEW
- **BMI Display Card** ⭐ NEW
- **Profile Stats** - Daily targets, macro goals
- **Edit Settings** - Adjust goals and diet type
- **CSV Export** - Download all your data
- **Reset Data** - Start fresh

---

## 🆕 NEW Features vs Original MacroTrack

| Feature | Original | Pro |
|---------|----------|-----|
| Micronutrient Tracking (Fiber, Sugar, Sodium) | ❌ | ✅ |
| Weight Tracking with BMI | ❌ | ✅ |
| 30-Day Progress Charts | ❌ | ✅ |
| Intermittent Fasting Timer | ❌ | ✅ |
| Daily Notes/Journal | ❌ | ✅ |
| Favorites & Recent Foods | ❌ | ✅ |
| Dark/Light Theme Toggle | ❌ | ✅ |
| PWA Support (Installable) | ❌ | ✅ |
| Meal Reminders/Notifications | ❌ | ✅ |
| Body Measurements Tracking | ❌ | ✅ |
| 5 Screens (vs 3) | 3 screens | 5 screens |

---

## 🏗️ Architecture

### Single-Page Progressive Web App
- **No Build Tool Required** - Pure HTML/CSS/JS
- **Offline Support** - Service Worker + localStorage
- **Installable** - PWA manifest for home screen
- **Responsive** - Mobile-first, max-width 430px
- **Dark/Light Modes** - CSS variables for theming

### Technology Stack
- **Frontend**: HTML5, CSS3 (variables, grid, flexbox)
- **JavaScript**: Vanilla JS (no frameworks)
- **Data**: localStorage (client-side persistence)
- **Offline**: Service Worker (sw.js)
- **PWA**: Web App Manifest (manifest.json)
- **Canvas**: TrendChart & WeightChart for visualizations

### File Structure
```
macro tracker/
├── index.html          # Main app (HTML + CSS + JS inline)
├── manifest.json       # PWA manifest
├── sw.js              # Service worker
├── server.js          # Local dev server
└── README.md          # This file
```

---

## 🚀 Getting Started

### Online
1. Visit: https://github.com/AbhijeetM777/macrotrack-pro
2. Deploy to Vercel, Netlify, or GitHub Pages
3. Or clone and run locally

### Local Development
```bash
cd "C:/Users/USER/OneDrive/Desktop/Project Ai/micro tracker"
node server.js
# Open http://localhost:3456 in browser
```

### Install as PWA
1. Open app in browser
2. Click "Install" (address bar menu on mobile)
3. Add to home screen
4. Works offline with all data synced

---

## 📱 Screens

### 1. **Today** (Home)
Daily tracking dashboard with calorie ring, macros, water, steps, activities, and food log.

### 2. **History**
Monthly calendar, 30-day trend chart, weekly bars, and aggregate stats.

### 3. **Weight**
Weight logger, BMI calculator, 30-day weight trend, and body measurements.

### 4. **Fasting**
Intermittent fasting timer with 4 protocols and fasting history tracking.

### 5. **Profile**
Settings, theme toggle, reminders, BMI badge, and data management.

---

## 💾 Data Storage

All data is stored **locally** in browser:
- `mt_profile` - User profile & goals
- `mt_log_YYYY-MM-DD` - Daily food logs
- `mt_water_YYYY-MM-DD` - Water intake
- `mt_steps_YYYY-MM-DD` - Step data
- `mt_weight_*` - Weight entries
- `mt_fasting_*` - Fasting sessions
- `theme` - Dark/light mode preference
- `reminders_enabled` - Notification setting

**Export**: Download all data as CSV from Profile screen.

---

## 🎨 Design

### Theme
- **Dark Mode** (default): Premium glassmorphism with purple accents
- **Light Mode**: Clean, minimal aesthetic
- **Colors**: Purple (#a78bfa), Green (#34d399), Blue (#60a5fa), Orange (#fb923c)
- **Font**: Plus Jakarta Sans (display), DM Mono (data)
- **Animations**: Smooth transitions, micro-interactions

### Responsive
- Mobile-first design
- Max-width: 430px (mobile phone size)
- Optimized for touch interactions
- Safe area padding for notches

---

## ⚙️ Setup Instructions

### First Launch
1. Fill in your **age, weight, height, gender**
2. Select **activity level** (Sedentary to Very Active)
3. Choose **goal** (Cut, Maintain, Bulk)
4. Pick **diet type** (Balanced, High Protein, Keto, Low Carb, Moderate Carb)
5. Enter your **name**
6. Tap "Calculate My Macros"

**Your daily macro targets are auto-calculated** using:
- Harris-Benedict BMR formula
- Activity multiplier
- Goal-based calorie adjustment (-400 for cut, +350 for bulk)

### Add Foods
1. Tap "Log Food" button
2. Search 150+ foods or create custom entries
3. Adjust quantity and unit (g, ml, cups, pieces, etc.)
4. Select meal time (Breakfast, Lunch, Dinner, Snack)
5. Tap "Add to Today"

### Log Weight
1. Go to Weight tab
2. Enter current weight and date
3. Tap "Add Weight Entry"
4. View 30-day trend chart automatically

### Start Fasting
1. Go to Fasting tab
2. Select protocol (16:8, 18:6, 20:4, OMAD)
3. Tap "Start Fast"
4. Watch elapsed time in circular timer
5. Tap "Break Fast" when done

---

## 📊 Comparisons

### vs MyFitnessPal
- ✅ Same macro tracking
- ✅ Offline support (MFP requires internet)
- ❌ Fewer foods in database (150 vs 10M+)
- ❌ No barcode scanner

### vs Cronometer
- ✅ Simpler interface
- ✅ Faster onboarding
- ❌ Less detailed micronutrients
- ❌ No recipe builder

### vs MacroFactor
- ✅ Weight tracking
- ✅ Fasting timer
- ❌ No ML-powered macro adjustments
- ❌ No recipe scaling

---

## 🔄 Data Sync

Currently uses **localStorage only**. To sync across devices, manually export/import CSV:
1. **Export**: Profile → "Export Data (CSV)"
2. Save `.csv` file
3. On new device: Import data manually

**Future**: Add cloud sync with Firebase/Supabase.

---

## 📝 License

MIT - Free to use, modify, and distribute.

---

## 🙋 Support

Questions? Check the GitHub Issues:
https://github.com/AbhijeetM777/macrotrack-pro/issues

---

## 🎯 Roadmap

- [ ] Cloud sync (Firebase)
- [ ] Barcode scanner
- [ ] Recipe builder & scaling
- [ ] AI-powered macro recommendations
- [ ] Social features (challenges, friends)
- [ ] Wearable integration (Smart Watches, Fitbit)
- [ ] Meal planning
- [ ] Grocery list generator

---

**Made with 💜 by Claude Code** | **[View on GitHub](https://github.com/AbhijeetM777/macrotrack-pro)**
