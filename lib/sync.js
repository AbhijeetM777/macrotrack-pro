/**
 * Cloud Sync Module - Cross-device synchronization with Supabase
 * Implements offline-first architecture with conflict resolution
 */

import { createClient } from '@supabase/supabase-js';
import { StorageModule } from './storage.js';

export const SyncModule = (() => {
  // Supabase client initialization (requires env vars)
  let supabase = null;
  let syncQueue = [];
  let lastSyncTime = null;
  let isSyncing = false;

  /**
   * Initialize Supabase client
   * @param {string} url - Supabase project URL
   * @param {string} key - Supabase anon key
   * @returns {Promise<boolean>} Success status
   */
  const initialize = async (url, key) => {
    try {
      supabase = createClient(url, key);
      // Test connection
      const { error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Supabase init warning:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Supabase init error:', e);
      return false;
    }
  };

  /**
   * User authentication - Sign up
   * @param {Object} credentials - {email, password, profile}
   * @returns {Promise<Object>} {success, user, error}
   */
  const signUp = async (credentials) => {
    try {
      if (!supabase) return { success: false, error: 'Supabase not initialized' };

      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password
      });

      if (error) return { success: false, error: error.message };

      // Create user profile
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: data.user.id,
          email: credentials.email,
          name: credentials.profile.name,
          age: credentials.profile.age,
          weight: credentials.profile.weight,
          height: credentials.profile.height,
          gender: credentials.profile.gender,
          activity: credentials.profile.activity,
          goal: credentials.profile.goal,
          diet_ratio: credentials.profile.dietRatio,
          created_at: new Date()
        }
      ]);

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      return { success: true, user: data.user };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  };

  /**
   * User authentication - Sign in
   * @param {Object} credentials - {email, password}
   * @returns {Promise<Object>} {success, user, error}
   */
  const signIn = async (credentials) => {
    try {
      if (!supabase) return { success: false, error: 'Supabase not initialized' };

      const { data, error } = await supabase.auth.signInWithPassword(credentials);

      if (error) return { success: false, error: error.message };

      // Store auth token
      localStorage.setItem('mt_auth_token', data.session.access_token);
      localStorage.setItem('mt_user_id', data.user.id);

      return { success: true, user: data.user };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  };

  /**
   * Sign out user
   * @returns {Promise<Object>} {success, error}
   */
  const signOut = async () => {
    try {
      if (!supabase) return { success: false, error: 'Supabase not initialized' };

      const { error } = await supabase.auth.signOut();

      if (error) return { success: false, error: error.message };

      localStorage.removeItem('mt_auth_token');
      localStorage.removeItem('mt_user_id');

      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  };

  /**
   * Get current authenticated user
   * @returns {Promise<Object>} User object or null
   */
  const getCurrentUser = async () => {
    try {
      if (!supabase) return null;

      const { data } = await supabase.auth.getUser();
      return data.user || null;
    } catch (e) {
      return null;
    }
  };

  /**
   * Queue change for sync (offline-first)
   * @param {Object} change - {type, data, timestamp}
   */
  const queueChange = (change) => {
    syncQueue.push({
      ...change,
      id: Date.now(),
      timestamp: Date.now()
    });
    // Save queue to localStorage
    StorageModule.setStorage('mt_sync_queue', syncQueue);
  };

  /**
   * Sync food logs with cloud
   * @returns {Promise<Object>} {success, synced, error}
   */
  const syncFoodLogs = async () => {
    try {
      if (!supabase) return { success: false, error: 'Not initialized' };

      const userId = localStorage.getItem('mt_user_id');
      if (!userId) return { success: false, error: 'Not authenticated' };

      const allLogs = StorageModule.exportAllData().logs || [];
      let syncedCount = 0;

      for (const log of allLogs) {
        const { error } = await supabase.from('food_logs').upsert([
          {
            user_id: userId,
            log_date: log.date,
            entries: log.entries,
            synced_at: new Date()
          }
        ]);

        if (!error) syncedCount++;
      }

      return { success: true, synced: syncedCount };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  };

  /**
   * Sync weight entries with cloud
   * @returns {Promise<Object>} {success, synced, error}
   */
  const syncWeightEntries = async () => {
    try {
      if (!supabase) return { success: false, error: 'Not initialized' };

      const userId = localStorage.getItem('mt_user_id');
      if (!userId) return { success: false, error: 'Not authenticated' };

      const weights = StorageModule.exportAllData().weights || [];
      let syncedCount = 0;

      for (const weight of weights) {
        const { error } = await supabase.from('weight_entries').upsert([
          {
            user_id: userId,
            entry_date: weight.date,
            weight_kg: weight.weight,
            synced_at: new Date()
          }
        ]);

        if (!error) syncedCount++;
      }

      return { success: true, synced: syncedCount };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  };

  /**
   * Full sync operation (all data)
   * @returns {Promise<Object>} {success, stats, error}
   */
  const fullSync = async () => {
    if (isSyncing) return { success: false, error: 'Sync already in progress' };

    isSyncing = true;
    const stats = { logs: 0, weights: 0, fasting: 0, errors: 0 };

    try {
      const logsResult = await syncFoodLogs();
      if (logsResult.success) stats.logs = logsResult.synced;
      else stats.errors++;

      const weightsResult = await syncWeightEntries();
      if (weightsResult.success) stats.weights = weightsResult.synced;
      else stats.errors++;

      lastSyncTime = Date.now();
      isSyncing = false;

      return { success: stats.errors === 0, stats };
    } catch (e) {
      isSyncing = false;
      return { success: false, error: String(e) };
    }
  };

  /**
   * Pull latest data from cloud (for multi-device sync)
   * @returns {Promise<Object>} {success, data, error}
   */
  const pullLatestData = async () => {
    try {
      if (!supabase) return { success: false, error: 'Not initialized' };

      const userId = localStorage.getItem('mt_user_id');
      if (!userId) return { success: false, error: 'Not authenticated' };

      // Fetch latest food logs
      const { data: logs, error: logsError } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Fetch latest weights
      const { data: weights, error: weightsError } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (logsError || weightsError) {
        return { success: false, error: 'Failed to fetch data' };
      }

      return { success: true, data: { logs, weights } };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  };

  /**
   * Resolve conflicts using last-write-wins strategy
   * @param {Object} local - Local data
   * @param {Object} remote - Remote data
   * @returns {Object} Merged data
   */
  const resolveConflict = (local, remote) => {
    // Last-write-wins: compare timestamps
    if (!local) return remote;
    if (!remote) return local;

    const localTime = new Date(local.synced_at || local.updated_at || 0).getTime();
    const remoteTime = new Date(remote.synced_at || remote.updated_at || 0).getTime();

    return remoteTime > localTime ? remote : local;
  };

  /**
   * Get last sync time
   * @returns {number} Timestamp of last sync or null
   */
  const getLastSyncTime = () => {
    return lastSyncTime;
  };

  /**
   * Check if authenticated
   * @returns {boolean} Is user authenticated
   */
  const isAuthenticated = () => {
    return !!localStorage.getItem('mt_user_id');
  };

  /**
   * Enable auto-sync on interval
   * @param {number} intervalMs - Interval in milliseconds (default: 5 min)
   * @returns {Function} Cleanup function to stop auto-sync
   */
  const enableAutoSync = (intervalMs = 5 * 60 * 1000) => {
    const intervalId = setInterval(async () => {
      if (isAuthenticated()) {
        await fullSync();
      }
    }, intervalMs);

    // Return cleanup function
    return () => clearInterval(intervalId);
  };

  // Public API
  return {
    initialize,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    queueChange,
    syncFoodLogs,
    syncWeightEntries,
    fullSync,
    pullLatestData,
    resolveConflict,
    getLastSyncTime,
    isAuthenticated,
    enableAutoSync,
    getSyncQueue: () => syncQueue
  };
})();
