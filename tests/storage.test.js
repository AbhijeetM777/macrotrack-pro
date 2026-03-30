/**
 * Test Suite for Storage Module
 * Tests localStorage operations, data persistence, and quota management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageModule } from '../lib/storage.js';

describe('StorageModule', () => {
  const storage = StorageModule;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getKey', () => {
    it('should generate ISO date string in correct format', () => {
      const date = new Date('2026-03-31');
      const key = storage.getKey(date);
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should use today\'s date if no date provided', () => {
      const key = storage.getKey();
      const today = new Date();
      const expectedRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(key).toMatch(expectedRegex);
    });

    it('should handle timezone-aware dates', () => {
      const date = new Date('2026-03-31T20:00:00Z');
      const key = storage.getKey(date);
      expect(key).toBeTruthy();
      expect(key.length).toBe(10); // YYYY-MM-DD
    });
  });

  describe('getStorage and setStorage', () => {
    it('should store and retrieve string values', () => {
      storage.setStorage('test-key', 'test-value');
      const result = storage.getStorage('test-key');
      expect(result).toBe('test-value');
    });

    it('should store and retrieve objects', () => {
      const obj = { name: 'John', age: 30 };
      storage.setStorage('user', obj);
      const retrieved = storage.getStorage('user');
      expect(retrieved).toEqual(obj);
    });

    it('should store and retrieve arrays', () => {
      const arr = [1, 2, 3, { x: 4 }];
      storage.setStorage('list', arr);
      const retrieved = storage.getStorage('list');
      expect(retrieved).toEqual(arr);
    });

    it('should return default value for non-existent key', () => {
      const result = storage.getStorage('non-existent', 'default');
      expect(result).toBe('default');
    });

    it('should return null as default if not specified', () => {
      const result = storage.getStorage('non-existent');
      expect(result).toBeNull();
    });

    it('should handle JSON parse errors gracefully', () => {
      localStorage.setItem('bad-json', 'not valid json {]');
      const result = storage.getStorage('bad-json', 'fallback');
      expect(result).toBe('fallback');
    });
  });

  describe('profile operations', () => {
    it('should save and retrieve profile', () => {
      const profile = {
        name: 'John Doe',
        age: 30,
        weight: 80,
        height: 180,
        gender: 'male'
      };
      storage.saveProfile(profile);
      const retrieved = storage.getProfile();
      expect(retrieved).toEqual(profile);
    });

    it('should return empty object for non-existent profile', () => {
      const profile = storage.getProfile();
      expect(profile).toEqual({});
    });
  });

  describe('targets operations', () => {
    it('should save and retrieve targets', () => {
      const targets = { kcal: 2000, protein: 150, carbs: 200, fat: 65 };
      storage.saveTargets(targets);
      const retrieved = storage.getTargets();
      expect(retrieved).toEqual(targets);
    });

    it('should return empty object for non-existent targets', () => {
      const targets = storage.getTargets();
      expect(targets).toEqual({});
    });
  });

  describe('food log operations', () => {
    it('should get today\'s log as empty array initially', () => {
      const log = storage.getTodayLog();
      expect(Array.isArray(log)).toBe(true);
      expect(log).toHaveLength(0);
    });

    it('should save and retrieve today\'s log', () => {
      const entries = [
        { name: 'Chicken', kcal: 300, protein: 35 },
        { name: 'Rice', kcal: 200, protein: 4 }
      ];
      storage.saveTodayLog(entries);
      const retrieved = storage.getTodayLog();
      expect(retrieved).toEqual(entries);
    });

    it('should handle different dates independently', () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const todayLog = [{ name: 'Today\'s food', kcal: 100 }];
      storage.saveTodayLog(todayLog);

      // Create yesterday's entry
      const yesterdayKey = 'mt_log_' + storage.getKey(yesterday);
      localStorage.setItem(yesterdayKey, JSON.stringify([{ name: 'Yesterday\'s food', kcal: 200 }]));

      const retrievedToday = storage.getTodayLog();
      expect(retrievedToday[0].name).toBe('Today\'s food');
    });
  });

  describe('weight operations', () => {
    it('should add weight entry', () => {
      const entry = { date: '2026-03-31', weight: 80 };
      storage.addWeightEntry(entry);

      const startDate = '2026-03-01';
      const endDate = '2026-04-01';
      const range = storage.getWeightRange(startDate, endDate);

      expect(range).toHaveLength(1);
      expect(range[0]).toEqual(entry);
    });

    it('should get weight range correctly', () => {
      storage.addWeightEntry({ date: '2026-03-20', weight: 80 });
      storage.addWeightEntry({ date: '2026-03-25', weight: 79 });
      storage.addWeightEntry({ date: '2026-04-05', weight: 78 });

      const range = storage.getWeightRange('2026-03-15', '2026-03-31');
      expect(range).toHaveLength(2);
    });

    it('should return empty array for empty weight range', () => {
      const range = storage.getWeightRange('2026-01-01', '2026-02-01');
      expect(range).toEqual([]);
    });
  });

  describe('fasting operations', () => {
    it('should save and retrieve fasting sessions', () => {
      const session = {
        date: '2026-03-31',
        protocol: '16:8',
        startTime: '20:00',
        endTime: '12:00',
        duration: 16
      };
      storage.saveFastingSession(session);

      const sessions = storage.getFastingSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toEqual(session);
    });
  });

  describe('data management', () => {
    it('should export all data in correct format', () => {
      storage.saveProfile({ name: 'John' });
      storage.saveTargets({ kcal: 2000 });
      storage.saveTodayLog([{ name: 'Food', kcal: 500 }]);
      storage.addWeightEntry({ date: '2026-03-31', weight: 80 });
      storage.saveFastingSession({ protocol: '16:8' });

      const exported = storage.exportAllData();

      expect(exported).toHaveProperty('profile');
      expect(exported).toHaveProperty('targets');
      expect(exported).toHaveProperty('logs');
      expect(exported).toHaveProperty('weights');
      expect(exported).toHaveProperty('fasting');
      expect(exported.profile.name).toBe('John');
    });

    it('should import data correctly', () => {
      const data = {
        profile: { name: 'Jane' },
        targets: { kcal: 1800 },
        logs: [],
        weights: [],
        fasting: [],
        theme: 'light'
      };

      const result = storage.importData(data);
      expect(result.success).toBe(true);

      const imported = storage.getProfile();
      expect(imported.name).toBe('Jane');
    });

    it('should clear all data', () => {
      storage.saveProfile({ name: 'John' });
      storage.saveTargets({ kcal: 2000 });
      storage.clearAllData();

      const profile = storage.getProfile();
      const targets = storage.getTargets();

      expect(profile).toEqual({});
      expect(targets).toEqual({});
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', () => {
      // Simulate quota exceeded by mocking localStorage
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      const result = storage.setStorage('test', {});
      expect(result).toBeDefined();

      Storage.prototype.setItem = originalSetItem;
    });
  });
});
