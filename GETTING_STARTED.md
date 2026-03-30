# Getting Started with MacroTrack Pro v2.0

Quick-start guide for using the refactored modular codebase.

## Installation

```bash
# Install dependencies
npm install

# Install globally (optional)
npm install -g @supabase/supabase-js vitest
```

## Running the App

### Development
```bash
# Start dev server (uses server.js)
npm run server

# Open browser to http://localhost:3456
```

### Testing
```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode (re-run on file changes)
npm run test:watch

# UI test runner
npm run test:ui
```

## Using the Modules

### Import Modules

```javascript
// In your code
import { StorageModule } from './lib/storage.js';
import { CalculationsModule } from './lib/calculations.js';
import { UtilsModule } from './lib/utils.js';
import { SyncModule } from './lib/sync.js'; // Phase 4
```

### Example 1: Get Today's Food Log

```javascript
// Get today's log
const log = StorageModule.getTodayLog();

// Add a food entry
const entry = {
  id: Date.now(),
  name: 'Chicken Breast',
  kcal: 300,
  protein: 35,
  carbs: 0,
  fat: 16,
  meal: 'Lunch'
};

log.push(entry);

// Save back to storage
StorageModule.saveTodayLog(log);

// Display success
console.log('✅ Food logged!');
```

### Example 2: Calculate Macro Targets

```javascript
// User profile
const profile = {
  age: 30,
  weight: 80,
  height: 180,
  gender: 'male',
  activity: 'moderate',
  goal: 'maintain',
  dietRatio: [30, 40, 30] // Protein, Carbs, Fat
};

// Calculate targets
const targets = CalculationsModule.calcTargets(profile);

console.log('Daily Targets:');
console.log(`  Calories: ${targets.kcal} kcal`);
console.log(`  Protein: ${targets.protein}g`);
console.log(`  Carbs: ${targets.carbs}g`);
console.log(`  Fat: ${targets.fat}g`);

// Save targets
StorageModule.saveTargets(targets);
```

### Example 3: Validate User Input

```javascript
// Sanitize user input (XSS prevention)
const userInput = '<img src=x onerror="alert(1)">';
const safe = UtilsModule.sanitizeHTML(userInput);
console.log(safe); // Removes dangerous characters

// Validate email
const email = 'user@example.com';
const isValid = UtilsModule.validateEmail(email);

// Validate quantity (must be 0.5-99)
const qty = 2.5;
const validQty = UtilsModule.validateQuantity(qty);
console.log(validQty); // 2.5 (within bounds)

const invalidQty = 999;
const clampedQty = UtilsModule.validateQuantity(invalidQty);
console.log(clampedQty); // 99 (clamped to max)
```

### Example 4: Aggregate Daily Macros

```javascript
// Get today's food log
const log = StorageModule.getTodayLog();

// Calculate totals
const totals = CalculationsModule.aggregateMacros(log);

console.log('Today\'s Totals:');
console.log(`  Calories: ${totals.kcal} kcal`);
console.log(`  Protein: ${totals.protein.toFixed(1)}g`);
console.log(`  Carbs: ${totals.carbs.toFixed(1)}g`);
console.log(`  Fat: ${totals.fat.toFixed(1)}g`);

// Get targets for comparison
const targets = StorageModule.getTargets();

// Calculate percentages
const progress = CalculationsModule.calcMacroPercentages(totals, targets);

console.log('Progress to Goals:');
console.log(`  Calories: ${progress.kcal}%`);
console.log(`  Protein: ${progress.protein}%`);
console.log(`  Carbs: ${progress.carbs}%`);
console.log(`  Fat: ${progress.fat}%`);
```

### Example 5: Weight Tracking

```javascript
// Add weight entry
StorageModule.addWeightEntry({
  date: '2026-03-31',
  weight: 80.5
});

// Get weight entries for last 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const startDate = thirtyDaysAgo.toISOString().split('T')[0];
const endDate = new Date().toISOString().split('T')[0];

const weights = StorageModule.getWeightRange(startDate, endDate);

// Calculate BMI for latest weight
const latest = weights[weights.length - 1];
const profile = StorageModule.getProfile();
const bmi = CalculationsModule.calcBMI(latest.weight, profile.height);
const category = CalculationsModule.getBMICategory(bmi);

console.log(`Weight: ${latest.weight} kg`);
console.log(`BMI: ${bmi} (${category})`);
```

### Example 6: Export Data

```javascript
// Export all user data as JSON
const allData = StorageModule.exportAllData();

// Generate CSV for spreadsheet
const csv = UtilsModule.generateCSV(allData.weights, ['date', 'weight', 'bmi']);

// Download CSV file
UtilsModule.downloadFile(csv, `weights_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');

console.log('✅ Data exported!');
```

### Example 7: Cloud Sync (Phase 4)

```javascript
// Initialize Supabase
await SyncModule.initialize(
  'https://your-project.supabase.co',
  'your-anon-key'
);

// Sign up new user
const signUpResult = await SyncModule.signUp({
  email: 'user@example.com',
  password: 'securePassword123',
  profile: {
    name: 'John Doe',
    age: 30,
    weight: 80,
    height: 180,
    gender: 'male',
    activity: 'moderate',
    goal: 'maintain',
    dietRatio: [30, 40, 30]
  }
});

if (signUpResult.success) {
  console.log('✅ Account created!');

  // Auto-sync every 5 minutes
  SyncModule.enableAutoSync(5 * 60 * 1000);

  // Manual sync
  const syncResult = await SyncModule.fullSync();
  console.log(`✅ Synced ${syncResult.stats.logs} food logs`);
}
```

## Module API Reference

### StorageModule

```javascript
// Date keys
getKey(d?: Date) → string

// Generic storage
getStorage(key, default) → any
setStorage(key, value) → {success, message}

// Profile
getProfile() → Object
saveProfile(profile) → void

// Macro targets
getTargets() → Object
saveTargets(targets) → void

// Food logs
getTodayLog() → Array
saveTodayLog(log) → void

// Weight
getWeightRange(start, end) → Array
addWeightEntry(entry) → void

// Fasting
getFastingSessions() → Array
saveFastingSession(session) → void

// Bulk
exportAllData() → Object
importData(data) → {success, message}
clearAllData() → void
```

### CalculationsModule

```javascript
// BMR & TDEE
calcBMR(profile) → number
calcTDEE(bmr, activity) → number
calcCalorieTarget(tdee, goal) → number
calcMacroTargets(calories, ratio) → {protein, carbs, fat}
calcTargets(profile) → {kcal, protein, carbs, fat, tdee}

// Body metrics
calcBMI(weight, height) → number
getBMICategory(bmi) → string

// Activity
stepsToCalories(steps, weight) → number

// Aggregation
aggregateMacros(entries) → {kcal, protein, carbs, fat, fiber, sugar, sodium}
calcMacroPercentages(totals, targets) → {protein, carbs, fat, kcal}
calcNetCalories(eaten, burned) → number

// Validation
validateBioMetrics(age, weight, height) → {valid, errors}
```

### UtilsModule

```javascript
// Security
sanitizeHTML(str) → string
escapeRegex(str) → string

// Validation
validateEmail(email) → boolean
validatePassword(password) → {valid, strength, messages}
validateQuantity(value) → number

// Formatting
formatCurrency(value) → string
formatNumber(num) → string
formatDate(date) → string
clamp(value, min, max) → number

// Performance
debounce(fn, delay) → Function
throttle(fn, delay) → Function

// Data
parseJSON(str, default) → any
generateCSV(data, keys) → string
downloadFile(content, filename, mimeType) → void

// Utilities
generateId() → string
sleep(ms) → Promise
isMobileDevice() → boolean
copyToClipboard(text) → Promise<boolean>
```

### SyncModule (Phase 4)

```javascript
// Init
initialize(url, key) → Promise<boolean>

// Auth
signUp(credentials) → Promise<{success, user, error}>
signIn(credentials) → Promise<{success, user, error}>
signOut() → Promise<{success, error}>
getCurrentUser() → Promise<User|null>
isAuthenticated() → boolean

// Sync
queueChange(change) → void
syncFoodLogs() → Promise<{success, synced, error}>
syncWeightEntries() → Promise<{success, synced, error}>
fullSync() → Promise<{success, stats, error}>
pullLatestData() → Promise<{success, data, error}>

// Advanced
resolveConflict(local, remote) → Object
getLastSyncTime() → number
enableAutoSync(interval) → Function (cleanup)
getSyncQueue() → Array
```

## Testing Examples

### Running Specific Tests

```bash
# Run only storage tests
npm test tests/storage.test.js

# Run only calculation tests
npm test tests/calculations.test.js

# Run with verbose output
npm test -- --reporter=verbose

# Run with specific pattern
npm test -- --grep "BMR"

# Run single test
npm test -- -t "should calculate male BMR correctly"
```

### Writing New Tests

```javascript
import { describe, it, expect } from 'vitest';
import { CalculationsModule } from '../lib/calculations.js';

describe('New Feature Tests', () => {
  it('should do something', () => {
    const result = CalculationsModule.someFunction(args);
    expect(result).toBe(expectedValue);
  });

  it('should handle errors', () => {
    expect(() => {
      CalculationsModule.someFunction(invalidArgs);
    }).toThrow();
  });
});
```

## Common Tasks

### Task: Log Food and Update Progress

```javascript
function logFoodEntry(name, kcal, protein, carbs, fat, meal = 'Snack') {
  // 1. Create entry
  const entry = {
    id: Date.now(),
    name,
    kcal,
    protein,
    carbs,
    fat,
    meal,
    emoji: '🍽️'
  };

  // 2. Validate input
  const safeName = UtilsModule.sanitizeHTML(name);
  if (!safeName) return { success: false, error: 'Invalid food name' };

  // 3. Add to log
  const log = StorageModule.getTodayLog();
  log.push({...entry, name: safeName});
  StorageModule.saveTodayLog(log);

  // 4. Calculate progress
  const totals = CalculationsModule.aggregateMacros(log);
  const targets = StorageModule.getTargets();
  const progress = CalculationsModule.calcMacroPercentages(totals, targets);

  return {
    success: true,
    totals,
    progress,
    message: `✅ ${name} logged! Progress: ${progress.kcal}%`
  };
}

// Usage
const result = logFoodEntry('Chicken', 300, 35, 0, 16, 'Lunch');
console.log(result.message);
```

### Task: Setup New User

```javascript
function setupNewUser(name, age, weight, height, gender, activity, goal) {
  // 1. Validate
  const validation = CalculationsModule.validateBioMetrics(age, weight, height);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  // 2. Create profile
  const profile = {
    name,
    age,
    weight,
    height,
    gender,
    activity,
    goal,
    dietRatio: [30, 40, 30],
    setupDone: true
  };

  // 3. Calculate targets
  const targets = CalculationsModule.calcTargets(profile);

  // 4. Save
  StorageModule.saveProfile(profile);
  StorageModule.saveTargets(targets);

  return {
    success: true,
    profile,
    targets,
    message: `✅ ${name}, your targets are ${targets.kcal} kcal/day!`
  };
}

// Usage
const result = setupNewUser('John', 30, 80, 180, 'male', 'moderate', 'maintain');
console.log(result.message);
```

## Troubleshooting

### Tests not running?
```bash
# Clear cache
rm -rf .vitest/

# Reinstall
npm install

# Try again
npm test
```

### Module import errors?
- Make sure you're using ES module syntax (`import ... from ...`)
- Check file paths are correct (case-sensitive on Linux/Mac)
- Verify `.js` extension is included in imports

### Storage full?
```javascript
// Check usage
const profile = StorageModule.getProfile();
const logs = StorageModule.exportAllData().logs;
console.log(`Logs: ${logs.length} days of data`);

// Clear old data
StorageModule.clearAllData();

// Or auto-cleanup happens on next write if quota exceeded
```

## Next: Phase 4 Setup

To enable cloud sync:

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Get project URL and anon key
3. Set environment variables in `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-key-here
   ```
4. Run database migrations from `SUPABASE_SCHEMA.md`
5. Follow `CLOUD_SYNC_GUIDE.md` for implementation

---

## Resources

- 📚 [Module Documentation](./lib/README.md)
- 🧪 [Test Files](./tests/)
- 🔧 [Technical Spec](./TECHNICAL_SPEC.md)
- ☁️ [Cloud Sync Guide](./CLOUD_SYNC_GUIDE.md)
- 📋 [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)

---

**Need help?** Check the module READMEs or run `npm test` to verify everything works!
