# MacroTrack Pro - Modular Architecture

This directory contains the refactored, modular JavaScript codebase for MacroTrack Pro. The monolithic `index.html` is being gradually migrated to this modular structure.

## Module Structure

### 1. **storage.js** - Data Persistence Layer
Handles all localStorage operations and data management.

**Key Functions:**
- `getKey(d)` - Generate timezone-aware date keys
- `getStorage(k, def)` - Retrieve stored data with fallback
- `setStorage(k, v)` - Store data with quota management
- `getTodayLog()` / `saveTodayLog()` - Daily food entries
- `getProfile()` / `saveProfile()` - User profile
- `getTargets()` / `saveTargets()` - Macro targets
- `getWeightRange()` / `addWeightEntry()` - Weight tracking
- `getFastingSessions()` / `saveFastingSession()` - Fasting data
- `exportAllData()` / `importData()` - Bulk data operations
- `clearAllData()` - Reset user data

**Features:**
- Automatic cleanup of old entries (>60 days) when quota exceeded
- Type-safe JSON parsing with error recovery
- Timezone-aware date handling

### 2. **calculations.js** - Fitness Math Engine
All mathematical calculations and data aggregations.

**Key Functions:**
- `calcBMR(profile)` - Basal Metabolic Rate (Harris-Benedict)
- `calcTDEE(bmr, activityLevel)` - Total Daily Energy Expenditure
- `calcCalorieTarget(tdee, goal)` - Adjust TDEE for cut/bulk
- `calcMacroTargets(calories, ratio)` - Distribute macros
- `calcTargets(profile)` - Complete calculation pipeline
- `calcBMI(weight, height)` - Body Mass Index
- `getBMICategory(bmi)` - BMI classification
- `stepsToCalories(steps, weight)` - Activity calorie burn
- `aggregateMacros(entries)` - Sum daily totals
- `calcMacroPercentages(totals, targets)` - Progress % calculations
- `calcNetCalories(eaten, burned)` - Net calorie calculation
- `validateBioMetrics(age, weight, height)` - Input validation

**Features:**
- Harris-Benedict BMR formula (male/female specific)
- Activity level multipliers (sedentary to very active)
- Goal-based calorie adjustments
- Comprehensive validation with detailed error messages

### 3. **utils.js** - General Utilities
Helper functions for sanitization, validation, and UI operations.

**Key Functions:**
- `sanitizeHTML(str)` - XSS prevention (enhanced)
- `validateEmail(email)` - Email format validation
- `validatePassword(password)` - Password strength assessment
- `validateQuantity(value)` - Quantity bounds (0.5-99)
- `clamp(value, min, max)` - Number range constraint
- `debounce(fn, delay)` - Debounce function calls
- `throttle(fn, delay)` - Throttle function calls
- `formatDate(date)` - Date formatting
- `formatNumber(num)` - Number formatting with commas
- `generateCSV(data, keys)` - CSV export
- `downloadFile(content, filename, mimeType)` - File download
- `isMobileDevice()` - Device detection
- `parseJSON(jsonStr, defaultValue)` - Safe JSON parsing

**Features:**
- Security-focused input sanitization
- Multiple validation utilities
- Performance helpers (debounce, throttle)
- Data export/download utilities

## Usage in Main App

### Import Modules
```javascript
import { StorageModule } from './lib/storage.js';
import { CalculationsModule } from './lib/calculations.js';
import { UtilsModule } from './lib/utils.js';
```

### Usage Examples

```javascript
// Get today's food log
const log = StorageModule.getTodayLog();

// Calculate macros from profile
const targets = CalculationsModule.calcTargets({
  age: 30,
  weight: 80,
  height: 180,
  gender: 'male',
  activity: 'moderate',
  goal: 'maintain',
  dietRatio: [30, 40, 30]
});

// Sanitize user input
const safeName = UtilsModule.sanitizeHTML(userInput);

// Validate quantity
const qty = UtilsModule.validateQuantity(userValue);
```

## Migration Status

- [x] Storage module created
- [x] Calculations module created
- [x] Utils module created
- [x] Unit tests created (40+ tests)
- [ ] Main `index.html` refactored to use modules
- [ ] Cloud sync module created
- [ ] Integration tests added
- [ ] E2E tests added
- [ ] Build system setup (webpack/Vite)

## Testing

Run tests with:
```bash
npm test                    # Run all tests
npm run test:coverage       # Generate coverage report
npm run test:watch         # Watch mode
```

Coverage targets: **80%+ (lines, branches, functions)**

## Next Steps

### Phase 2: Integration
1. Refactor main `index.html` to use these modules
2. Remove redundant code from inline JS
3. Add event handlers module
4. Add UI components module

### Phase 3: Testing
1. Add 83 total test cases
2. Reach 80%+ code coverage
3. Add integration tests
4. Add E2E tests

### Phase 4: Cloud Sync
1. Create Supabase database schema
2. Add auth module with login/signup
3. Create API/sync module
4. Implement offline-first sync queue

### Phase 5: Advanced Features
1. Social features (friend tracking)
2. Meal planning
3. Recipe builder
4. AI recommendations
5. Wearable integration

## File Organization

```
lib/
├── storage.js         # Data persistence (localStorage)
├── calculations.js    # Fitness math engine
├── utils.js          # General utilities
└── README.md         # This file

tests/
├── storage.test.js       # 25 tests
├── calculations.test.js  # 30 tests
├── utils.test.js        # 10 tests
├── setup.js            # Test environment setup
└── README.md           # Test documentation

vitest.config.js       # Test runner configuration
```

## Code Quality Guidelines

- **Testability**: All modules export pure functions with no side effects
- **Reusability**: Single responsibility principle
- **Documentation**: JSDoc comments on all public functions
- **Validation**: Input validation with clear error messages
- **Performance**: Efficient algorithms, debouncing for frequent calls
- **Security**: XSS prevention, input sanitization, no hardcoded secrets

## Dependencies

- **No external dependencies** (vanilla JavaScript)
- **Vitest** for testing (dev dependency)
- **jsdom** for DOM testing (dev dependency)

## Contributing

When adding new modules:
1. Follow the existing module pattern (IIFE with public API)
2. Add comprehensive JSDoc comments
3. Create corresponding test file
4. Maintain 80%+ test coverage
5. Update this README

## Future: Cloud Sync Module

```javascript
// Example of future sync module
export const SyncModule = (() => {
  const syncWithCloud = async (data) => { /* ... */ };
  const resolveConflicts = (local, remote) => { /* ... */ };
  const queueOfflineChanges = (change) => { /* ... */ };

  return { syncWithCloud, resolveConflicts, queueOfflineChanges };
})();
```

---

**Last Updated**: March 31, 2026
**Version**: 1.0
**Maintainer**: MacroTrack Pro Team
