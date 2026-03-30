# MacroTrack Pro - Technical Improvement Specification

**Version:** 1.0
**Last Updated:** 2026-03-31
**Target Timeline:** 12-14 weeks across 5 phases

---

## Executive Summary

MacroTrack Pro is a feature-rich fitness tracking PWA (2600+ lines) with excellent UI/UX but critical architectural issues preventing scaling. This document outlines a phased improvement roadmap to fix bugs, refactor into modular components, add comprehensive testing, implement cloud synchronization, and introduce advanced features.

**Key Findings:**
- 5 identified bugs (1 critical, 2 medium, 2 low severity)
- Monolithic architecture requiring 17.5 hours of refactoring
- Zero test coverage requiring 15 hours of test infrastructure
- No cloud sync capability (24 hours needed)
- Missing advanced features driving engagement (28.5 hours)

**Total Effort:** 88.75 hours over 12-14 weeks

---

## Part 1: Bug Analysis & Quick Fixes

### BUG-001: localStorage Quota Exceeded Not Handled Gracefully
**Severity:** HIGH | **Impact:** Data loss
**Current Behavior:** App catches `QuotaExceededError` but only shows a toast; subsequent write operations silently fail.
**User Impact:** On older phones (iOS 8GB, Android 16GB with other apps), after ~5MB of data, users lose ability to log food without warnings.

**Root Cause:**
```javascript
// Current implementation (LINE 1507)
try {
  localStorage.setItem(k, JSON.stringify(v))
} catch(e) {
  console.warn('Storage write err:', e);
  if(e.name === 'QuotaExceededError')
    showToast('⚠️ Storage Full. Clear data.');
}
```

**Solution:**
1. Monitor storage usage (implement quota tracker)
2. Compress old history data (gzip or remove entries >60 days)
3. Warn user at 80% quota
4. Implement tiered deletion: oldest history → oldest weights → oldest fasting data
5. Provide UI: "Manage Storage" button with compression options

**Estimated Fix Time:** 1.5 hours

---

### BUG-002: Timezone Date Key Generation Issue
**Severity:** CRITICAL | **Impact:** Data integrity
**Current Behavior:** `getKey()` uses local Date without timezone offset consideration. Users crossing timezones see dates shift by ±1 days.

**Root Cause:**
```javascript
// Current implementation (LINE 1505)
function getKey(d) {
  const dt = d || new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
}
```

This uses local time, not UTC. A user in EST (UTC-5) at 11 PM traveling to PST (UTC-8) will see their "today" shift.

**Example Scenario:**
- User logs breakfast at 8 AM EST on March 15
- Data stored under key: "2026-03-15"
- Flies to PST (UTC-8, same wall time 8 AM = 11 AM EST)
- Logs lunch at 8 AM PST = 11 AM EST
- Data stored under key: "2026-03-14" ← WRONG! Same calendar day, different timezone
- User sees duplicate/split daily logs

**Solution:**
```javascript
function getKey(d) {
  const dt = d || new Date();
  // Use ISO date in UTC to be timezone-agnostic
  const offset = dt.getTimezoneOffset();
  const localISOTime = new Date(dt.getTime() - offset * 60000)
    .toISOString()
    .split('T')[0];
  return localISOTime; // Returns "2026-03-15" consistently
}
```

**Data Migration:** Create utility to merge entries from duplicate dates.

**Estimated Fix Time:** 0.5 hours

---

### BUG-003: Carbs Display Calculation Error
**Severity:** MEDIUM | **Impact:** Incorrect user-facing data
**Current Behavior:** Line 1802 displays carbs as `carbs + fat` instead of just carbs.

**Root Cause:**
```javascript
// Current (LINE 1802)
document.getElementById('c-eaten').textContent = Math.round(tot.carbs + tot.fat);
```

This is clearly a copy-paste error; the display element ID suggests "carbs-eaten" but adds fat too.

**Solution:**
```javascript
// Fixed
document.getElementById('c-eaten').textContent = Math.round(tot.carbs);
```

**Estimated Fix Time:** 0.25 hours

---

### BUG-004: XSS Vulnerability in Custom Food Entry
**Severity:** MEDIUM | **Impact:** Potential account compromise
**Current Behavior:** Custom food names pass through `sanitizeHTML()` but display still vulnerable to certain XSS vectors.

**Analysis:**
```javascript
// Current sanitizeHTML (LINES 1747-1751)
function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;  // This is safe for text-only
  return div.innerHTML;
}
```

This is actually safe because `.textContent` escapes all HTML. However, the food name appears in HTML contexts where it could be vulnerable to:
- Attribute injection in data attributes
- JavaScript in event handlers (if code later evolves)

**Solution:**
Use DOMPurify or enhanced sanitization:
```javascript
function sanitizeHTML(str) {
  // Option 1: Ultra-safe (text only)
  return str.replace(/[<>]/g, '');

  // Option 2: DOMPurify (lightweight version)
  // Allows safe HTML tags like <b>, <i>, <u>
  const clean = DOMPurify.sanitize(str, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
  return clean;
}
```

**Add CSP Header:**
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
```

**Estimated Fix Time:** 1 hour

---

### BUG-005: Food Quantity Input Validation Gap
**Severity:** MEDIUM | **Impact:** Nonsensical data entry
**Current Behavior:** User can set quantity to 0 or 999+ without constraints.

**Root Cause:**
```javascript
// Current (LINE 1686-1687)
function stepQty(dir) {
  qtyValue = Math.max(0.5, qtyValue + dir * 0.5);
  updatePreview();
}

function onQtyInput() {
  const v = parseFloat(document.getElementById('qty-input').value);
  if (!isNaN(v) && v > 0) {  // Only checks > 0, no upper bound
    qtyValue = v;
    updatePreview();
  }
}
```

Allows: -999, 0, 0.001, 9999, etc.

**Solution:**
```javascript
function stepQty(dir) {
  qtyValue = Math.max(0.5, Math.min(99, qtyValue + dir * 0.5));
  updatePreview();
}

function onQtyInput() {
  let v = parseFloat(document.getElementById('qty-input').value);
  if (!isNaN(v)) {
    v = Math.max(0.5, Math.min(99, v));  // Constrain 0.5-99
    qtyValue = v;
    updatePreview();
  } else {
    document.getElementById('qty-input').value = qtyValue;
  }
}
```

**Estimated Fix Time:** 0.5 hours

---

## Part 2: Code Quality & Architecture Refactoring

### Current Architecture Issues

```
index.html (2596 lines)
├── CSS (600 lines) - styling only
├── HTML (400 lines) - static structure
└── JavaScript (1600 lines) - MONOLITHIC
    ├── Constants (50 lines)
    ├── Utilities (100 lines)
    ├── Storage (50 lines)
    ├── Food logging (300 lines)
    ├── UI rendering (400 lines)
    ├── Profile setup (100 lines)
    ├── History/Weight/Fasting (200 lines)
    └── Mixed concerns (400 lines)
```

**Problems:**
1. No module boundaries → changes to one feature risk breaking others
2. No testability → can't unit test calculations without DOM
3. Global state → `profile`, `targets`, `activeCat` can be mutated anywhere
4. No separation of concerns → business logic mixed with UI

### Proposed Architecture

```
src/
├── index.html (reduced to 800 lines)
├── styles/
│   ├── theme.css (dark/light variants)
│   ├── components.css
│   └── animations.css
├── modules/
│   ├── calculations.js
│   │   ├── calcBMR(profile)
│   │   ├── calcTDEE(profile)
│   │   ├── calcMacros(profile)
│   │   └── stepsToKcal(steps, weight)
│   ├── storage.js
│   │   ├── StorageRepository class
│   │   ├── LocalStorage backend
│   │   ├── Compression utilities
│   │   └── Quota tracking
│   ├── state.js
│   │   ├── AppState class
│   │   ├── Profile management
│   │   ├── Log management
│   │   └── Event system
│   ├── foods.js
│   │   ├── FoodDatabase class
│   │   ├── Category filtering
│   │   ├── Search/sort
│   │   └── Nutrition calculations
│   ├── components.js
│   │   ├── MacroRing component
│   │   ├── FoodItem component
│   │   ├── StatCard component
│   │   └── 8+ other components
│   ├── router.js
│   │   ├── Router class
│   │   ├── Screen navigation
│   │   └── History management
│   ├── logger.js
│   │   ├── Structured logging
│   │   ├── IndexedDB storage
│   │   └── Error tracking
│   └── cloud-storage.js (Phase 4)
├── utils/
│   ├── validation.js
│   ├── formatting.js
│   ├── encryption.js (Phase 4)
│   └── date-utils.js
├── tests/
│   ├── __tests__/
│   │   ├── calculations.test.js
│   │   ├── storage.test.js
│   │   ├── state.test.js
│   │   ├── foods.test.js
│   │   └── cloud-sync.test.js
│   └── e2e/
│       └── workflows.spec.js
└── sw.js (Service Worker)
```

### Module: calculations.js

**Purpose:** All health/fitness calculations isolated for testing

```javascript
/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 * @param {Object} profile - { gender, age, weight (kg), height (cm) }
 * @returns {number} BMR in kcal/day
 */
export function calcBMR(profile) {
  const { gender, age, weight, height } = profile;
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

/**
 * Calculate Total Daily Energy Expenditure
 * @param {Object} profile - includes activity level ('sedentary', 'light', 'moderate', 'active')
 * @returns {number} TDEE in kcal/day
 */
export function calcTDEE(profile) {
  const bmr = calcBMR(profile);
  const activityFactors = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  };
  return Math.round(bmr * (activityFactors[profile.activity] || 1.55));
}

/**
 * Calculate macro targets based on TDEE and diet ratio
 * @param {Object} profile
 * @returns {Object} { kcal, protein, carbs, fat }
 */
export function calcMacros(profile) {
  const tdee = calcTDEE(profile);
  const adj = { cut: -400, maintain: 0, bulk: 350 };
  const kcal = tdee + (adj[profile.goal] || 0);
  const [proteinPct, carbsPct, fatPct] = profile.dietRatio || [30, 40, 30];

  return {
    kcal: Math.round(kcal),
    protein: Math.round((kcal * proteinPct / 100) / 4),
    carbs: Math.round((kcal * carbsPct / 100) / 4),
    fat: Math.round((kcal * fatPct / 100) / 9),
  };
}

/**
 * Convert steps to calories burned
 * @param {number} steps
 * @param {number} weight - user weight in kg
 * @returns {number} kcal burned
 */
export function stepsToKcal(steps, weight = 70) {
  // Heuristic: 1 step ≈ 0.04 kcal per kg of body weight
  return Math.round(steps * ((weight * 0.00057) * 0.76));
}
```

**Tests Required (20 test cases):**
```javascript
describe('Calculations Module', () => {
  describe('calcBMR', () => {
    test('Male BMR calculation', () => {
      expect(calcBMR({ gender: 'male', age: 30, weight: 80, height: 180 }))
        .toBeCloseTo(1730, -1);
    });

    test('Female BMR calculation', () => {
      expect(calcBMR({ gender: 'female', age: 25, weight: 60, height: 165 }))
        .toBeCloseTo(1400, -1);
    });
  });

  describe('calcTDEE', () => {
    test('Sedentary activity', () => {
      const profile = { gender: 'male', age: 30, weight: 80, height: 180, activity: 'sedentary' };
      const tdee = calcTDEE(profile);
      expect(tdee).toBeGreaterThan(2000);
    });
  });

  // 17 more tests covering edge cases, boundary values, etc.
});
```

### Module: storage.js

**Purpose:** Abstract all data persistence, support multiple backends

```javascript
export class StorageRepository {
  constructor(backend = 'localStorage') {
    this.backend = backend;
  }

  /**
   * Get item from storage
   * @param {string} key
   * @param {*} defaultValue - returned if key not found
   * @returns {*}
   */
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.warn(`Storage read error for key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Set item in storage with compression and quota handling
   * @param {string} key
   * @param {*} value
   * @throws {Error} if quota exceeded after cleanup attempts
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        this._handleQuotaExceeded(key, value);
      } else {
        throw error;
      }
    }
  }

  /**
   * Get storage usage metrics
   * @returns {Object} { used, available, percentFull }
   */
  getQuotaInfo() {
    const testKey = '__test__quota__';
    const testValue = 'x'.repeat(1024); // 1KB

    try {
      localStorage.setItem(testKey, testValue);
      localStorage.removeItem(testKey);

      // Estimate by checking total size
      let total = 0;
      for (let key in localStorage) {
        total += localStorage[key].length + key.length;
      }

      return {
        used: total,
        available: 5242880 - total, // ~5MB typical limit
        percentFull: (total / 5242880) * 100,
      };
    } catch (error) {
      return { used: 'unknown', available: 'unknown', percentFull: 100 };
    }
  }

  /**
   * Handle quota exceeded by compressing old data
   * @private
   */
  _handleQuotaExceeded(key, value) {
    const quota = this.getQuotaInfo();

    if (quota.percentFull < 90) {
      throw new Error('Storage quota exceeded but not critical');
    }

    // Strategy: Delete oldest history entries
    this._pruneOldHistory();

    // Retry
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      throw new Error('Storage quota exceeded. Please clear data or enable cloud sync.');
    }
  }

  /**
   * Delete history entries older than 60 days
   * @private
   */
  _pruneOldHistory() {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const cutoffKey = sixtyDaysAgo.toISOString().split('T')[0];

    for (let key in localStorage) {
      if (key.startsWith('mt_log_') && key < cutoffKey) {
        localStorage.removeItem(key);
      }
    }
  }

  /**
   * Clear all app data
   */
  clear() {
    const keysToDelete = [];
    for (let key in localStorage) {
      if (key.startsWith('mt_')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => localStorage.removeItem(key));
  }
}
```

### Module: state.js

**Purpose:** Centralized state management with validation and event system

```javascript
export class AppState {
  constructor(storage) {
    this.storage = storage;
    this.listeners = [];
    this.profile = storage.get('mt_profile', {});
    this.targets = storage.get('mt_targets', {});
    this.todayLog = storage.get(`mt_log_${getKey()}`, []);
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback - receives (eventType, data)
   */
  subscribe(callback) {
    this.listeners.push(callback);
  }

  /**
   * Update profile with validation
   * @param {Object} profile
   * @throws {Error} if validation fails
   */
  setProfile(profile) {
    this.validateProfile(profile);
    this.profile = profile;
    this.storage.set('mt_profile', profile);
    this.emit('profileChanged', profile);
  }

  /**
   * Add food to today's log
   * @param {Object} food - { name, kcal, protein, carbs, fat, meal, emoji }
   */
  addFood(food) {
    this.validateFood(food);
    food.id = Date.now();
    this.todayLog.push(food);
    this.saveTodayLog();
    this.emit('foodAdded', food);
  }

  /**
   * Delete food from log
   * @param {number} foodId
   */
  deleteFood(foodId) {
    this.todayLog = this.todayLog.filter(f => f.id !== foodId);
    this.saveTodayLog();
    this.emit('foodDeleted', foodId);
  }

  /**
   * Get daily totals
   * @returns {Object} { kcal, protein, carbs, fat, fiber, sugar, sodium }
   */
  getDailyTotals() {
    return this.todayLog.reduce((totals, food) => ({
      kcal: totals.kcal + food.kcal,
      protein: totals.protein + food.protein,
      carbs: totals.carbs + food.carbs,
      fat: totals.fat + food.fat,
      fiber: totals.fiber + (food.fiber || 0),
      sugar: totals.sugar + (food.sugar || 0),
      sodium: totals.sodium + (food.sodium || 0),
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });
  }

  /**
   * @private
   */
  saveTodayLog() {
    const key = `mt_log_${getKey()}`;
    this.storage.set(key, this.todayLog);
  }

  validateProfile(profile) {
    if (!profile.age || profile.age < 13 || profile.age > 120) {
      throw new Error('Age must be 13-120');
    }
    if (!profile.weight || profile.weight < 30 || profile.weight > 300) {
      throw new Error('Weight must be 30-300 kg');
    }
    // More validations...
  }

  validateFood(food) {
    if (!food.name || food.name.length === 0) {
      throw new Error('Food name required');
    }
    if (food.kcal < 0 || food.kcal > 2000) {
      throw new Error('Kcal must be 0-2000');
    }
  }

  /**
   * @private
   */
  emit(eventType, data) {
    this.listeners.forEach(cb => cb(eventType, data));
  }
}

function getKey(d) {
  const dt = d || new Date();
  const offset = dt.getTimezoneOffset();
  return new Date(dt.getTime() - offset * 60000).toISOString().split('T')[0];
}
```

### Additional Modules Summary

**food.js (150 lines)**
- `FoodDatabase` class
- Search, filter by category
- Nutrition calculations
- 150+ food entries

**components.js (400 lines)**
- Reusable UI components as pure functions
- `MacroRing`, `FoodItem`, `StatCard`, `WaterTracker`, etc.
- Event binding utilities
- No DOM mutations, no global state

**router.js (200 lines)**
- `Router` class for screen navigation
- Browser history support
- URL-based state restoration
- Navigation guards

**logger.js (150 lines)**
- Structured logging (info, warn, error)
- IndexedDB backend for log persistence
- Error tracking with context
- Privacy-aware (no PII logging)

---

## Part 3: Testing Strategy

### Test Infrastructure (Phase 3, 15 hours)

**Testing Stack:**
- **Jest** - Unit & integration testing
- **Playwright** - E2E browser testing
- **Coverage** - 80% minimum threshold

### Test Distribution

```
Total: 83 tests, 80%+ coverage

Unit Tests (65 tests)
├── calculations.test.js (20 tests)
│   ├── BMR calculations (4 tests - male/female, edge cases)
│   ├── TDEE calculations (4 tests)
│   ├── Macro ratios (6 tests)
│   ├── Steps to kcal (6 tests)
│   └── Edge cases (0 calorie foods, etc)
│
├── storage.test.js (15 tests)
│   ├── Get/Set operations (4 tests)
│   ├── Quota handling (3 tests)
│   ├── Compression (2 tests)
│   ├── Data corruption recovery (3 tests)
│   └── Clear operations (3 tests)
│
├── state.test.js (18 tests)
│   ├── Profile updates (4 tests)
│   ├── Food add/delete (5 tests)
│   ├── Daily totals (4 tests)
│   ├── Validation (3 tests)
│   └── Event emissions (2 tests)
│
├── foods.test.js (12 tests)
│   ├── Search functionality (4 tests)
│   ├── Category filtering (3 tests)
│   ├── Nutrition calculations (3 tests)
│   └── Duplicate handling (2 tests)
│
└── utilities.test.js (0 tests - utilities are pure functions, skip)

Integration Tests (18 tests)
├── integration-logging.test.js (8 tests)
│   ├── Complete food logging workflow
│   ├── Quantity adjustments
│   ├── Macro calculations
│   ├── Daily totals update
│   ├── Multiple meals
│   ├── Custom food entry
│   └── Undo/delete operations
│
└── integration-profile.test.js (10 tests)
    ├── Profile setup validation
    ├── Target calculations
    ├── Goal adjustments
    ├── Data persistence
    ├── Migration from legacy data
    └── Error recovery

E2E Tests (6 tests)
├── Onboarding flow
├── Daily tracking workflow
├── History viewing
├── Weight logging
├── Fasting timer
└── Settings management
```

### Sample Unit Test

```javascript
// __tests__/calculations.test.js

import { calcBMR, calcTDEE, calcMacros, stepsToKcal } from '../modules/calculations';

describe('calcBMR - Basal Metabolic Rate', () => {
  test('Male BMR using Mifflin-St Jeor', () => {
    const profile = { gender: 'male', age: 30, weight: 80, height: 180 };
    const bmr = calcBMR(profile);

    // Manual calculation: 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(bmr).toBe(1780);
  });

  test('Female BMR using Mifflin-St Jeor', () => {
    const profile = { gender: 'female', age: 25, weight: 60, height: 165 };
    const bmr = calcBMR(profile);

    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    expect(bmr).toBeCloseTo(1345, 0);
  });

  test('Age boundary: 13 years old', () => {
    const profile = { gender: 'male', age: 13, weight: 50, height: 160 };
    expect(() => calcBMR(profile)).not.toThrow();
  });

  test('Handles extreme values', () => {
    const profile = { gender: 'male', age: 120, weight: 30, height: 250 };
    expect(calcBMR(profile)).toBeGreaterThan(0);
  });
});

describe('calcTDEE - Total Daily Energy Expenditure', () => {
  test('Sedentary activity multiplier (1.2x)', () => {
    const profile = { gender: 'male', age: 30, weight: 80, height: 180, activity: 'sedentary' };
    const tdee = calcTDEE(profile);
    const bmr = calcBMR(profile);

    expect(tdee).toBeCloseTo(bmr * 1.2, -1);
  });

  test('Moderate activity multiplier (1.55x)', () => {
    const profile = { gender: 'male', age: 30, weight: 80, height: 180, activity: 'moderate' };
    const tdee = calcTDEE(profile);
    const bmr = calcBMR(profile);

    expect(tdee).toBeCloseTo(bmr * 1.55, -1);
  });

  test('Unknown activity defaults to 1.55x', () => {
    const profile = { gender: 'male', age: 30, weight: 80, height: 180, activity: 'unknown' };
    const tdee = calcTDEE(profile);
    const bmr = calcBMR(profile);

    expect(tdee).toBeCloseTo(bmr * 1.55, -1);
  });
});

describe('calcMacros - Macro targets', () => {
  test('Bulk goal adds +350 kcal', () => {
    const profile = { gender: 'male', age: 30, weight: 80, height: 180, activity: 'moderate', goal: 'bulk', dietRatio: [30, 40, 30] };
    const tdee = calcTDEE(profile);
    const { kcal } = calcMacros(profile);

    expect(kcal).toBe(tdee + 350);
  });

  test('Cut goal subtracts 400 kcal', () => {
    const profile = { gender: 'male', age: 30, weight: 80, height: 180, activity: 'moderate', goal: 'cut', dietRatio: [30, 40, 30] };
    const tdee = calcTDEE(profile);
    const { kcal } = calcMacros(profile);

    expect(kcal).toBe(tdee - 400);
  });

  test('30/40/30 ratio (protein/carbs/fat)', () => {
    const profile = { gender: 'male', age: 30, weight: 80, height: 180, activity: 'moderate', goal: 'maintain', dietRatio: [30, 40, 30] };
    const { kcal, protein, carbs, fat } = calcMacros(profile);

    // Protein: 30% / 4 kcal per gram
    expect(protein).toBeCloseTo((kcal * 0.3) / 4, 0);
    // Carbs: 40% / 4 kcal per gram
    expect(carbs).toBeCloseTo((kcal * 0.4) / 4, 0);
    // Fat: 30% / 9 kcal per gram
    expect(fat).toBeCloseTo((kcal * 0.3) / 9, 0);
  });
});

describe('stepsToKcal', () => {
  test('Converts steps to calories burned', () => {
    // 10,000 steps at 70kg should burn ~120 kcal
    const calories = stepsToKcal(10000, 70);
    expect(calories).toBeGreaterThan(100);
    expect(calories).toBeLessThan(150);
  });

  test('Higher weight burns more calories', () => {
    const cal70kg = stepsToKcal(10000, 70);
    const cal80kg = stepsToKcal(10000, 80);

    expect(cal80kg).toBeGreaterThan(cal70kg);
  });
});
```

### Sample Integration Test

```javascript
// __tests__/integration-logging.test.js

import { AppState } from '../modules/state';
import { StorageRepository } from '../modules/storage';

describe('Food Logging Integration', () => {
  let state;
  let storage;

  beforeEach(() => {
    storage = new StorageRepository('mock');
    state = new AppState(storage);
  });

  test('Complete food logging workflow', () => {
    // 1. Set profile
    state.setProfile({
      age: 30, weight: 80, height: 180, gender: 'male',
      activity: 'moderate', goal: 'bulk', dietRatio: [30, 40, 30]
    });

    // 2. Add breakfast
    state.addFood({
      name: 'Oatmeal', kcal: 300, protein: 10, carbs: 50, fat: 5,
      fiber: 4, sugar: 2, sodium: 100, meal: 'Breakfast', emoji: '🥣'
    });

    // 3. Add lunch
    state.addFood({
      name: 'Chicken breast', kcal: 165, protein: 35, carbs: 0, fat: 3,
      fiber: 0, sugar: 0, sodium: 70, meal: 'Lunch', emoji: '🍗'
    });

    // 4. Verify daily totals
    const totals = state.getDailyTotals();
    expect(totals.kcal).toBe(465);
    expect(totals.protein).toBe(45);
    expect(totals.carbs).toBe(50);
    expect(totals.fat).toBe(8);

    // 5. Delete breakfast
    const breakfastId = state.todayLog[0].id;
    state.deleteFood(breakfastId);

    // 6. Verify totals updated
    const updatedTotals = state.getDailyTotals();
    expect(updatedTotals.kcal).toBe(165);
    expect(updatedTotals.protein).toBe(35);
  });

  test('Custom food entry validation', () => {
    expect(() => {
      state.addFood({ name: '', kcal: 100, protein: 20, carbs: 0, fat: 0, meal: 'Breakfast', emoji: '🍽️' });
    }).toThrow('Food name required');

    expect(() => {
      state.addFood({ name: 'Food', kcal: 2500, protein: 20, carbs: 0, fat: 0, meal: 'Breakfast', emoji: '🍽️' });
    }).toThrow('Kcal must be 0-2000');
  });
});
```

### Sample E2E Test

```javascript
// e2e/workflows.spec.js

import { test, expect } from '@playwright/test';

test.describe('MacroTrack Pro E2E Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('Complete onboarding flow', async ({ page }) => {
    // 1. See setup screen
    await expect(page.locator('text=Setup Your Profile')).toBeVisible();

    // 2. Fill in profile
    await page.fill('input[id="s-name"]', 'Test User');
    await page.fill('input[id="s-age"]', '30');
    await page.fill('input[id="s-weight"]', '80');
    await page.fill('input[id="s-height"]', '180');

    // 3. Select options
    await page.click('text=Moderate');
    await page.click('text=Bulk');
    await page.click('text=Balanced');

    // 4. Submit
    await page.click('text=Save Profile');

    // 5. Verify home screen loaded
    await expect(page.locator('text=Home')).toBeVisible();
    await expect(page.locator('text=0 kcal')).toBeVisible();
  });

  test('Log food and verify calculations', async ({ page }) => {
    // Complete setup first
    await page.fill('input[id="s-name"]', 'Test User');
    await page.fill('input[id="s-age"]', '30');
    await page.fill('input[id="s-weight"]', '80');
    await page.fill('input[id="s-height"]', '180');
    await page.click('text=Moderate');
    await page.click('text=Bulk');
    await page.click('text=Balanced');
    await page.click('text=Save Profile');

    // Add food
    await page.click('text=Add Food');
    await page.click('text=Chicken Breast');
    await page.fill('input[id="qty-input"]', '200');
    await page.click('text=Log Food');

    // Verify logged
    await expect(page.locator('text=Chicken Breast')).toBeVisible();
    await expect(page.locator('text=330')).toBeVisible(); // ~330 kcal for 200g
  });
});
```

---

## Part 4: Cloud Sync & Backend Integration (Phase 4, 24 hours)

### Backend Selection Recommendation: **Supabase**

**Why Supabase:**
- PostgreSQL backend (battle-tested)
- Real-time subscriptions out-of-the-box
- Row-Level Security for user isolation
- Auth0 integration for OAuth
- Open-source tooling
- 5 projects free, generous free tier
- Excellent TypeScript support

**Alternative Comparison:**

| Feature | Supabase | Firebase | Custom Node.js |
|---------|----------|----------|-----------------|
| Setup time | 30 min | 20 min | 4 hours |
| Cost (1k users) | ~$50-200/mo | ~$100-500/mo | ~$50-100/mo |
| Offline support | Via app logic | Built-in | Manual |
| Real-time | Yes (WebSocket) | Yes (Firestore) | Manual (Socket.io) |
| Learning curve | Medium | Low | High |
| Vendor lock-in | Low | High | None |

### Cloud Sync Architecture

```
Client (MacroTrack PWA)
│
├─ LocalStorage / IndexedDB
│  └─ SyncQueue (pending changes)
│
├─ Service Worker
│  └─ Background Sync (retry on reconnect)
│
└─ Cloud Storage Module
   ├─ CloudStorage class (Supabase adapter)
   ├─ Sync conflict resolution
   ├─ Encryption layer (TweetNaCl.js)
   └─ Real-time subscriptions
      │
      └─ Supabase Backend
         ├─ PostgreSQL Database
         │  ├─ users table (auth)
         │  ├─ profiles table (user data)
         │  ├─ daily_logs table (food entries)
         │  ├─ weight_history table
         │  ├─ fasting_sessions table
         │  └─ devices table (device management)
         │
         ├─ Auth (OAuth2, JWT tokens)
         │  └─ Session management
         │
         └─ Edge Functions (optional)
            ├─ Auto-backup daily
            ├─ Export to email
            └─ Aggregations for analytics
```

### Database Schema (Supabase PostgreSQL)

```sql
-- Users table (managed by Supabase Auth)
-- CREATE TABLE auth.users (auto-created by Supabase)

-- User profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  age INTEGER CHECK (age >= 13 AND age <= 120),
  weight NUMERIC(5, 1) CHECK (weight >= 30 AND weight <= 300),
  height INTEGER CHECK (height >= 100 AND height <= 250),
  gender TEXT CHECK (gender IN ('male', 'female')),
  activity TEXT CHECK (activity IN ('sedentary', 'light', 'moderate', 'active')),
  goal TEXT CHECK (goal IN ('cut', 'maintain', 'bulk')),
  diet_ratio INTEGER[3] DEFAULT ARRAY[30, 40, 30],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Daily food logs
CREATE TABLE public.daily_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  food_name TEXT NOT NULL,
  kcal INTEGER,
  protein NUMERIC(5, 1),
  carbs NUMERIC(5, 1),
  fat NUMERIC(5, 1),
  fiber NUMERIC(5, 1),
  sugar NUMERIC(5, 1),
  sodium INTEGER,
  meal TEXT,
  emoji TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, id)
);

-- Weight history
CREATE TABLE public.weight_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weight_date DATE NOT NULL,
  weight NUMERIC(5, 1),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, weight_date)
);

-- Fasting sessions
CREATE TABLE public.fasting_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_hours INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Device management for multi-device sync
CREATE TABLE public.devices (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  last_sync_at TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fasting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Similar policies for other tables...
```

### Cloud Storage Module Implementation

```javascript
// modules/cloud-storage.js

import { createClient } from '@supabase/supabase-js';

export class CloudStorage {
  constructor(supabaseUrl, supabaseKey) {
    this.client = createClient(supabaseUrl, supabaseKey);
    this.syncQueue = [];
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.setupRealtimeListeners();
  }

  /**
   * Authenticate user
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user, session}>}
   */
  async signUp(email, password) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
    return data;
  }

  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  /**
   * Sync user profile to cloud
   * @param {Object} profile
   * @returns {Promise<void>}
   */
  async syncProfile(profile) {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.client
      .from('profiles')
      .upsert({
        id: user.id,
        ...profile,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    this.emit('profileSynced', profile);
  }

  /**
   * Sync daily logs to cloud
   * @param {string} date - ISO date (YYYY-MM-DD)
   * @param {Array<Object>} foods
   * @returns {Promise<void>}
   */
  async syncDailyLog(date, foods) {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Delete existing entries for this date
    await this.client
      .from('daily_logs')
      .delete()
      .eq('user_id', user.id)
      .eq('log_date', date);

    // Insert new entries
    const entries = foods.map(f => ({
      user_id: user.id,
      log_date: date,
      food_name: f.name,
      kcal: f.kcal,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      fiber: f.fiber,
      sugar: f.sugar,
      sodium: f.sodium,
      meal: f.meal,
      emoji: f.emoji,
    }));

    const { error } = await this.client
      .from('daily_logs')
      .insert(entries);

    if (error) throw error;
    this.emit('logSynced', { date, count: foods.length });
  }

  /**
   * Sync weight entry to cloud
   * @param {string} date - ISO date
   * @param {number} weight
   * @returns {Promise<void>}
   */
  async syncWeight(date, weight) {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.client
      .from('weight_history')
      .upsert({
        user_id: user.id,
        weight_date: date,
        weight,
      });

    if (error) throw error;
    this.emit('weightSynced', { date, weight });
  }

  /**
   * Fetch cloud backup
   * @returns {Promise<Object>} - { profile, logs, weights, fastingSessions }
   */
  async getCloudBackup() {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const [profileResult, logsResult, weightsResult, fastingResult] = await Promise.all([
      this.client.from('profiles').select('*').eq('id', user.id).single(),
      this.client.from('daily_logs').select('*').eq('user_id', user.id),
      this.client.from('weight_history').select('*').eq('user_id', user.id),
      this.client.from('fasting_sessions').select('*').eq('user_id', user.id),
    ]);

    return {
      profile: profileResult.data,
      logs: logsResult.data,
      weights: weightsResult.data,
      fastingSessions: fastingResult.data,
    };
  }

  /**
   * Restore all data from cloud backup
   * @param {Object} backup
   * @returns {Promise<void>}
   */
  async restoreFromCloud(backup) {
    // This would emit events that local state listens to
    this.emit('restoreStarted');
    this.emit('profileRestored', backup.profile);
    backup.logs.forEach(log => this.emit('logRestored', log));
    backup.weights.forEach(weight => this.emit('weightRestored', weight));
    this.emit('restoreCompleted');
  }

  /**
   * Register device for multi-device support
   * @returns {Promise<void>}
   */
  async registerDevice() {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const deviceId = this.getDeviceId();
    const deviceName = this.getDeviceName();

    await this.client.from('devices').upsert({
      user_id: user.id,
      device_id: deviceId,
      device_name: deviceName,
      last_sync_at: new Date().toISOString(),
    });
  }

  /**
   * Setup real-time subscriptions
   * @private
   */
  setupRealtimeListeners() {
    this.client
      .channel('public:daily_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs' }, payload => {
        this.emit('remoteLogChanged', payload);
      })
      .subscribe();
  }

  /**
   * Get unique device ID (persisted in localStorage)
   * @private
   */
  getDeviceId() {
    let deviceId = localStorage.getItem('mt_device_id');
    if (!deviceId) {
      deviceId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('mt_device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * Get human-readable device name
   * @private
   */
  getDeviceName() {
    const ua = navigator.userAgent;
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Windows')) return 'Windows';
    return 'Web Browser';
  }

  /**
   * Event system for real-time updates
   */
  on(event, callback) {
    if (!this.listeners) this.listeners = {};
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (!this.listeners || !this.listeners[event]) return;
    this.listeners[event].forEach(cb => cb(data));
  }
}
```

### Sync Conflict Resolution

```javascript
// modules/sync-resolver.js

export class SyncResolver {
  /**
   * Resolve conflicts between local and cloud data
   * @param {Object} local - local version
   * @param {Object} cloud - cloud version
   * @param {string} dataType - 'profile', 'log', 'weight', 'fasting'
   * @returns {Object} resolved version
   */
  resolve(local, cloud, dataType) {
    switch (dataType) {
      case 'profile':
        return this.resolveProfile(local, cloud);
      case 'log':
        return this.resolveLog(local, cloud);
      case 'weight':
        return this.resolveWeight(local, cloud);
      case 'fasting':
        return this.resolveFasting(local, cloud);
      default:
        return cloud; // Default to server wins
    }
  }

  /**
   * Profile: Show manual conflict resolution UI
   * @private
   */
  resolveProfile(local, cloud) {
    // For profile conflicts, prompt user
    return {
      conflict: true,
      local,
      cloud,
      message: 'Your profile was updated on another device. Which version would you like to keep?',
    };
  }

  /**
   * Logs: Merge by meal type and date
   * @private
   */
  resolveLog(local, cloud) {
    if (local.id === cloud.id) {
      // Same entry, check timestamps
      return new Date(cloud.updated_at) > new Date(local.updated_at) ? cloud : local;
    }
    // Different entries on same day, merge them
    return { merged: [local, cloud] };
  }

  /**
   * Weight: Always keep latest date
   * @private
   */
  resolveWeight(local, cloud) {
    return new Date(cloud.weight_date) > new Date(local.weight_date) ? cloud : local;
  }

  /**
   * Fasting: Merge by keeping all non-overlapping sessions
   * @private
   */
  resolveFasting(local, cloud) {
    const overlap = (local.start_time < cloud.end_time && local.end_time > cloud.start_time);
    return overlap ? [cloud] : [local, cloud]; // Keep non-overlapping only
  }
}
```

---

## Part 5: Feature Enhancements (Phase 5, 28.5 hours)

### FEAT-001: USDA Food Database Integration

**Integration with FatSecret or USDA FoodData Central API**

```javascript
// modules/food-api.js

import { Database } from '@dexie/dexie'; // IndexedDB wrapper

export class FoodAPI {
  constructor() {
    this.db = new Database('macrotrack-foods');
    this.db.version(1).stores({
      usda_foods: '++id, name, category',
      local_foods: '++id, user_id, name',
    });
  }

  /**
   * Search USDA database (8000+ foods)
   * @param {string} query
   * @returns {Promise<Array>}
   */
  async searchUSDA(query) {
    const API_KEY = process.env.USDA_API_KEY;
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${query}&api_key=${API_KEY}`
    );

    const data = await response.json();
    return data.foods.map(f => ({
      id: f.fdcId,
      name: f.description,
      kcal: f.foodNutrients?.find(n => n.nutrientCode === '208000')?.value || 0,
      protein: f.foodNutrients?.find(n => n.nutrientCode === '203000')?.value || 0,
      carbs: f.foodNutrients?.find(n => n.nutrientCode === '205000')?.value || 0,
      fat: f.foodNutrients?.find(n => n.nutrientCode === '204000')?.value || 0,
      source: 'usda',
      unit: 'per 100g',
    }));
  }

  /**
   * Cache food results in IndexedDB
   * @param {string} query
   * @param {Array} foods
   */
  async cacheFoods(query, foods) {
    await this.db.usda_foods.bulkAdd(foods);
  }

  /**
   * Get cached foods
   * @param {string} query
   * @returns {Promise<Array>}
   */
  async getCachedFoods(query) {
    return await this.db.usda_foods.where('name').startsWithIgnoreCase(query).toArray();
  }

  /**
   * Barcode scanning via Quagga.js
   * @returns {Promise<string>} UPC code
   */
  async scanBarcode() {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');

    // Initialize Quagga
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    video.srcObject = stream;

    return new Promise((resolve, reject) => {
      Quagga.init({ inputStream: { type: 'LiveStream', sources: [video] } }, error => {
        if (error) reject(error);
        else {
          Quagga.onDetected(result => {
            resolve(result.codeResult.code);
            Quagga.stop();
          });
          Quagga.start();
        }
      });
    });
  }
}
```

### FEAT-002: Advanced Analytics Dashboard

```html
<!-- analytics.html -->
<div id="analytics-screen" class="screen">
  <div class="page-header">
    <h1 class="page-title">Analytics</h1>
  </div>

  <!-- Calorie Trend (7 days) -->
  <div class="card">
    <h3 class="card-title">7-Day Calorie Trend</h3>
    <canvas id="calorie-chart"></canvas>
  </div>

  <!-- Macro Distribution (pie) -->
  <div class="card">
    <h3 class="card-title">Weekly Macro Average</h3>
    <canvas id="macro-chart"></canvas>
  </div>

  <!-- Weight Progression -->
  <div class="card">
    <h3 class="card-title">Weight Trend (30 days)</h3>
    <canvas id="weight-chart"></canvas>
    <div id="weight-stats">
      <span>Current: <strong id="current-weight">0</strong> kg</span>
      <span>Change: <strong id="weight-change">0</strong> kg</span>
    </div>
  </div>

  <!-- Consistency Streak -->
  <div class="card">
    <h3 class="card-title">Logging Consistency</h3>
    <div id="consistency-badge"></div>
    <p id="consistency-text">Logged 0 out of 30 days this month</p>
  </div>
</div>
```

```javascript
// modules/analytics.js

import Chart from 'chart.js/auto';

export class Analytics {
  constructor(appState, storage) {
    this.state = appState;
    this.storage = storage;
    this.charts = {};
  }

  /**
   * Render analytics dashboard
   */
  async render() {
    const last30Days = this.getLast30Days();
    const logs = last30Days.map(date =>
      this.storage.get(`mt_log_${date}`, [])
    );

    this.renderCalorieChart(logs);
    this.renderMacroChart(logs);
    this.renderWeightChart();
    this.renderConsistency(logs);
  }

  /**
   * @private
   */
  renderCalorieChart(logs) {
    const data = logs.map(log =>
      log.reduce((sum, f) => sum + f.kcal, 0)
    );

    const ctx = document.getElementById('calorie-chart');
    this.charts.calorie = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.getLast30Days(),
        datasets: [{
          label: 'Calories',
          data,
          borderColor: 'var(--ac)',
          backgroundColor: 'rgba(166, 255, 0, 0.1)',
          tension: 0.4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
      },
    });
  }

  /**
   * @private
   */
  renderMacroChart(logs) {
    const avgProtein = logs.reduce((sum, log) =>
      sum + log.reduce((s, f) => s + f.protein, 0), 0) / logs.length;
    const avgCarbs = logs.reduce((sum, log) =>
      sum + log.reduce((s, f) => s + f.carbs, 0), 0) / logs.length;
    const avgFat = logs.reduce((sum, log) =>
      sum + log.reduce((s, f) => s + f.fat, 0), 0) / logs.length;

    const ctx = document.getElementById('macro-chart');
    this.charts.macro = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Protein', 'Carbs', 'Fat'],
        datasets: [{
          data: [avgProtein * 4, avgCarbs * 4, avgFat * 9],
          backgroundColor: ['#ff6b9d', '#a6ff00', '#00e4ff'],
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }

  /**
   * @private
   */
  renderWeightChart() {
    const weights = this.storage.get('mt_weights', []);
    const last30 = weights.slice(-30);

    const ctx = document.getElementById('weight-chart');
    this.charts.weight = new Chart(ctx, {
      type: 'line',
      data: {
        labels: last30.map(w => w.date),
        datasets: [{
          label: 'Weight (kg)',
          data: last30.map(w => w.weight),
          borderColor: 'var(--bl)',
          backgroundColor: 'rgba(0, 228, 255, 0.1)',
          tension: 0.4,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: false },
        },
      },
    });

    const current = last30[last30.length - 1]?.weight || 0;
    const previous = last30[0]?.weight || current;
    document.getElementById('current-weight').textContent = current.toFixed(1);
    document.getElementById('weight-change').textContent = ((current - previous).toFixed(1));
  }

  /**
   * @private
   */
  renderConsistency(logs) {
    const logsWithFood = logs.filter(log => log.length > 0).length;
    const percentage = Math.round((logsWithFood / logs.length) * 100);

    const badge = document.getElementById('consistency-badge');
    badge.innerHTML = `
      <div style="font-size: 48px; font-weight: 800; color: var(--ac);">${percentage}%</div>
      <div style="font-size: 12px; color: var(--t3); margin-top: 4px;">Consistency Streak</div>
    `;

    document.getElementById('consistency-text').textContent =
      `Logged ${logsWithFood} out of ${logs.length} days this month`;
  }

  /**
   * @private
   */
  getLast30Days() {
    const days = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.unshift(key);
    }
    return days;
  }
}
```

---

## Timeline & Resource Planning

### Recommended Team Composition

**Phase 1-2: Single Developer (1-3 weeks)**
- Bug fixes and code modularity

**Phase 3-4: 1 Lead Developer + 1 QA Engineer (3-4 weeks)**
- Testing infrastructure and cloud sync
- QA: Test coverage, integration testing

**Phase 5: 2 Developers (4 weeks)**
- Feature development
- One focused on food API, other on analytics/integrations

### Week-by-Week Schedule

```
Week 1: Phase 1 (Bug Fixes) - 6.25 hours
├─ Monday: BUG-002 (timezone), BUG-003 (carbs), BUG-005 (quantity) = 1 hour
├─ Tuesday: BUG-001 (quota handling) = 1.5 hours
├─ Wednesday: BUG-004 (XSS prevention), manifest setup = 2 hours
├─ Thursday: Data validation layer = 1.5 hours
└─ Friday: Testing & bug bash

Week 2-3: Phase 2 (Modularity) - 17.5 hours
├─ Extract modules: calculations, storage, state, foods, components = 12 hours
├─ Create router & logger = 3 hours
├─ Add JSDoc documentation = 2.5 hours

Week 4: Phase 3 Part A (Testing Setup) - 5 hours
├─ Jest configuration = 1 hour
├─ Create unit test suite = 4 hours

Week 5: Phase 3 Part B (Integration Tests) - 10 hours
├─ Integration tests = 8 hours
├─ E2E tests with Playwright = 2 hours

Week 6-7: Phase 4 (Cloud Sync) - 21.5 hours
├─ Backend setup & auth = 2 hours
├─ Cloud storage module = 3 hours
├─ Sync conflict resolution = 2 hours
├─ Background sync in SW = 2 hours
├─ Dashboard creation = 2 hours
├─ Export/import = 2 hours
├─ Notifications system = 1.5 hours
├─ Encryption layer = 2 hours
├─ API documentation = 1.5 hours
├─ Cloud sync tests = 2 hours

Week 8-11: Phase 5 (Features) - 28.5 hours
├─ Food API integration = 4 hours
├─ Analytics dashboard = 4 hours
├─ Social features = 3 hours
├─ Fasting insights = 2 hours
├─ AI recommendations = 3 hours
├─ Fitness tracker integration = 5 hours
├─ Meal templates = 2 hours
├─ Voice input = 2 hours
├─ Smart notifications = 2 hours
├─ Theme system = 1.5 hours
```

---

## Success Criteria & Metrics

### Code Quality Gates
- [ ] 80%+ test coverage
- [ ] All functions <50 lines
- [ ] All files <800 lines
- [ ] Zero console.log statements
- [ ] All bugs fixed and closed
- [ ] All security issues resolved

### Performance Targets
- [ ] Lighthouse score: 90+
- [ ] Initial load: <2 seconds
- [ ] Time to interactive: <3 seconds
- [ ] Largest Contentful Paint: <2.5 seconds

### Feature Completeness
- [ ] Cloud sync 100% functional
- [ ] Multi-device sync working
- [ ] Data export in 3+ formats
- [ ] All 10 feature enhancements launched
- [ ] 5+ critical user flows with E2E tests

### User Metrics
- [ ] Cloud sync adoption: 80%+ within 3 months
- [ ] Session duration: +100% vs current
- [ ] Daily active users: +50%
- [ ] 30-day retention: 70%+
- [ ] Feature adoption: 80%+ analytics, 60%+ fitness tracker

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| localStorage data loss during migration | HIGH | Implement auto-backup to Cloud, version-based migration script |
| Cloud sync conflicts breaking data | HIGH | Extensive conflict resolution tests, gradual rollout with feature flags |
| API rate limits (USDA, OpenAI) | MEDIUM | Implement caching, queuing, user quotas |
| Performance regression from modularity | MEDIUM | Benchmark before/after, lazy-load non-critical modules |
| Third-party service outages | MEDIUM | Graceful degradation, fallback to offline mode, retry logic |

---

## Conclusion

This 88.75-hour improvement plan transforms MacroTrack Pro from a feature-rich prototype into a production-ready, scalable fitness tracking platform. By addressing critical bugs, refactoring into modular architecture, adding comprehensive testing, implementing cloud synchronization, and introducing advanced features, the app will position itself as a premium fitness tracking solution with enterprise-grade reliability and multi-device support.

**Recommended Starting Point:**
1. Complete Phase 1 immediately (6.25 hours) to fix bugs
2. Plan Phase 2 architecture in detail
3. Begin Phase 2 modularity work with CI/CD infrastructure
4. Run Phases 3-4 in parallel with staggered start times

**Expected Outcome:**
- Stable, maintainable codebase
- Multi-device cloud synchronization
- 80%+ test coverage
- 10+ new advanced features
- Production-ready PWA with enterprise capabilities

