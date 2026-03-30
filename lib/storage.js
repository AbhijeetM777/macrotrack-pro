/**
 * Storage Module - Handles all localStorage operations and data persistence
 * Provides abstraction layer for accessing, saving, and managing app state
 */

export const StorageModule = (() => {
  // ── UTILITY FUNCTIONS ──

  /**
   * Generate date key for daily data - now timezone-aware
   * @param {Date} d - Optional date object, defaults to today
   * @returns {string} ISO date string (YYYY-MM-DD)
   */
  const getKey = (d) => {
    const dt = d || new Date();
    const offset = dt.getTimezoneOffset();
    const utcAdjusted = new Date(dt.getTime() - offset * 60000);
    const iso = utcAdjusted.toISOString().split('T')[0];
    return iso;
  };

  /**
   * Safely retrieve data from localStorage with fallback
   * @param {string} k - Storage key
   * @param {*} def - Default value if not found or parse fails
   * @returns {*} Parsed value or default
   */
  const getStorage = (k, def) => {
    try {
      const v = localStorage.getItem(k);
      if (v) return JSON.parse(v);
      return def;
    } catch (e) {
      console.warn('Storage read err:', e);
      return def;
    }
  };

  /**
   * Safely store data to localStorage with quota management
   * @param {string} k - Storage key
   * @param {*} v - Value to store
   */
  const setStorage = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {
      console.warn('Storage write err:', e);
      if (e.name === 'QuotaExceededError') {
        // Attempt auto-cleanup of old entries
        const keys = Object.keys(localStorage);
        const now = Date.now();
        const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;

        keys.forEach(key => {
          if (key.startsWith('mt_log_')) {
            const dateStr = key.replace('mt_log_', '');
            const date = new Date(dateStr).getTime();
            if (now - date > sixtyDaysMs) {
              localStorage.removeItem(key);
            }
          }
        });

        // Retry the write
        try {
          localStorage.setItem(k, JSON.stringify(v));
          return { success: true, message: 'Freed space and saved!' };
        } catch (e2) {
          return { success: false, message: 'Storage still full. Manual cleanup needed.' };
        }
      }
      return { success: false, message: String(e) };
    }
  };

  /**
   * Get today's food log
   * @returns {Array} Array of food entries for today
   */
  const getTodayLog = () => {
    return getStorage('mt_log_' + getKey(), []);
  };

  /**
   * Save today's food log
   * @param {Array} log - Food entries array
   */
  const saveTodayLog = (log) => {
    setStorage('mt_log_' + getKey(), log);
  };

  /**
   * Get stored user profile
   * @returns {Object} User profile object
   */
  const getProfile = () => {
    return getStorage('mt_profile', {});
  };

  /**
   * Save user profile
   * @param {Object} profile - Profile object with age, weight, height, goals, etc.
   */
  const saveProfile = (profile) => {
    setStorage('mt_profile', profile);
  };

  /**
   * Get calculated macro targets
   * @returns {Object} Macro targets (kcal, protein, carbs, fat)
   */
  const getTargets = () => {
    return getStorage('mt_targets', {});
  };

  /**
   * Save macro targets
   * @param {Object} targets - Targets object
   */
  const saveTargets = (targets) => {
    setStorage('mt_targets', targets);
  };

  /**
   * Get weight entries for a date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Array} Weight entries in date range
   */
  const getWeightRange = (startDate, endDate) => {
    const allWeights = getStorage('mt_weight_entries', []);
    return allWeights.filter(w => w.date >= startDate && w.date <= endDate);
  };

  /**
   * Add weight entry
   * @param {Object} entry - {date, weight, unit}
   */
  const addWeightEntry = (entry) => {
    const all = getStorage('mt_weight_entries', []);
    all.push(entry);
    setStorage('mt_weight_entries', all);
  };

  /**
   * Get fasting sessions
   * @returns {Array} Fasting session records
   */
  const getFastingSessions = () => {
    return getStorage('mt_fasting_sessions', []);
  };

  /**
   * Save fasting session
   * @param {Object} session - Session object
   */
  const saveFastingSession = (session) => {
    const sessions = getFastingSessions();
    sessions.push(session);
    setStorage('mt_fasting_sessions', sessions);
  };

  /**
   * Clear all user data
   */
  const clearAllData = () => {
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith('mt_')) {
        localStorage.removeItem(k);
      }
    });
  };

  /**
   * Export data as JSON
   * @returns {Object} All user data
   */
  const exportAllData = () => {
    return {
      profile: getProfile(),
      targets: getTargets(),
      logs: Object.keys(localStorage)
        .filter(k => k.startsWith('mt_log_'))
        .map(k => ({ date: k.replace('mt_log_', ''), entries: getStorage(k, []) })),
      weights: getStorage('mt_weight_entries', []),
      fasting: getFastingSessions(),
      theme: localStorage.getItem('theme') || 'dark',
      reminders: localStorage.getItem('reminders_enabled') !== 'false'
    };
  };

  /**
   * Import data from JSON
   * @param {Object} data - Exported data object
   */
  const importData = (data) => {
    try {
      if (data.profile) saveProfile(data.profile);
      if (data.targets) saveTargets(data.targets);
      if (data.logs) {
        data.logs.forEach(log => {
          setStorage('mt_log_' + log.date, log.entries);
        });
      }
      if (data.weights) setStorage('mt_weight_entries', data.weights);
      if (data.fasting) setStorage('mt_fasting_sessions', data.fasting);
      if (data.theme) localStorage.setItem('theme', data.theme);
      if (data.reminders !== undefined) localStorage.setItem('reminders_enabled', data.reminders);
      return { success: true, message: 'Data imported successfully!' };
    } catch (e) {
      return { success: false, message: String(e) };
    }
  };

  // Public API
  return {
    getKey,
    getStorage,
    setStorage,
    getTodayLog,
    saveTodayLog,
    getProfile,
    saveProfile,
    getTargets,
    saveTargets,
    getWeightRange,
    addWeightEntry,
    getFastingSessions,
    saveFastingSession,
    clearAllData,
    exportAllData,
    importData
  };
})();
