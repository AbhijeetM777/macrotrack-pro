/**
 * Test Suite for Calculations Module
 * Tests BMR, TDEE, macro calculations, and data aggregations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CalculationsModule } from '../lib/calculations.js';

describe('CalculationsModule', () => {
  const calc = CalculationsModule;

  describe('calcBMR', () => {
    it('should calculate male BMR correctly', () => {
      const profile = { age: 30, weight: 80, height: 180, gender: 'male' };
      const bmr = calc.calcBMR(profile);
      // Harris-Benedict: 88.36 + 13.4*80 + 4.8*180 - 5.7*30
      const expected = 88.36 + 1072 + 864 - 171;
      expect(bmr).toBeCloseTo(expected, 0);
    });

    it('should calculate female BMR correctly', () => {
      const profile = { age: 25, weight: 65, height: 165, gender: 'female' };
      const bmr = calc.calcBMR(profile);
      // Harris-Benedict female: 447.6 + 9.2*65 + 3.1*165 - 4.3*25
      const expected = 447.6 + 598 + 511.5 - 107.5;
      expect(bmr).toBeCloseTo(expected, 0);
    });
  });

  describe('calcTDEE', () => {
    it('should calculate TDEE with activity multiplier', () => {
      const bmr = 1700;
      const tdee = calc.calcTDEE(bmr, 'moderate');
      expect(tdee).toBe(Math.round(1700 * 1.55));
    });

    it('should use default multiplier for unknown activity level', () => {
      const bmr = 1700;
      const tdee = calc.calcTDEE(bmr, 'unknown');
      expect(tdee).toBe(Math.round(1700 * 1.55));
    });
  });

  describe('calcCalorieTarget', () => {
    it('should reduce calories for cut goal', () => {
      const tdee = 2500;
      const target = calc.calcCalorieTarget(tdee, 'cut');
      expect(target).toBe(2100);
    });

    it('should maintain calories for maintain goal', () => {
      const tdee = 2500;
      const target = calc.calcCalorieTarget(tdee, 'maintain');
      expect(target).toBe(2500);
    });

    it('should increase calories for bulk goal', () => {
      const tdee = 2500;
      const target = calc.calcCalorieTarget(tdee, 'bulk');
      expect(target).toBe(2850);
    });
  });

  describe('calcMacroTargets', () => {
    it('should calculate macros from calories and ratio', () => {
      const calories = 2000;
      const ratio = [30, 40, 30]; // 30% protein, 40% carbs, 30% fat
      const macros = calc.calcMacroTargets(calories, ratio);

      expect(macros.protein).toBe(Math.round((2000 * 0.3) / 4)); // 150g
      expect(macros.carbs).toBe(Math.round((2000 * 0.4) / 4));   // 200g
      expect(macros.fat).toBe(Math.round((2000 * 0.3) / 9));     // ~67g
    });

    it('should use default ratio if not provided', () => {
      const calories = 2000;
      const macros = calc.calcMacroTargets(calories);
      expect(macros.protein).toBeGreaterThan(0);
      expect(macros.carbs).toBeGreaterThan(0);
      expect(macros.fat).toBeGreaterThan(0);
    });
  });

  describe('calcTargets', () => {
    it('should calculate complete targets from profile', () => {
      const profile = {
        age: 30,
        weight: 80,
        height: 180,
        gender: 'male',
        activity: 'moderate',
        goal: 'maintain',
        dietRatio: [30, 40, 30]
      };

      const targets = calc.calcTargets(profile);

      expect(targets).toHaveProperty('kcal');
      expect(targets).toHaveProperty('protein');
      expect(targets).toHaveProperty('carbs');
      expect(targets).toHaveProperty('fat');
      expect(targets).toHaveProperty('tdee');
      expect(targets.kcal).toBeGreaterThan(1500);
      expect(targets.protein).toBeGreaterThan(100);
    });
  });

  describe('calcBMI', () => {
    it('should calculate BMI correctly', () => {
      const bmi = calc.calcBMI(80, 180);
      const expected = 80 / (1.8 * 1.8);
      expect(bmi).toBeCloseTo(expected, 1);
    });

    it('should round to one decimal place', () => {
      const bmi = calc.calcBMI(75, 175);
      expect(String(bmi).split('.')[1].length).toBeLessThanOrEqual(1);
    });
  });

  describe('getBMICategory', () => {
    it('should categorize underweight BMI', () => {
      expect(calc.getBMICategory(18)).toBe('Underweight');
    });

    it('should categorize normal BMI', () => {
      expect(calc.getBMICategory(23)).toBe('Normal');
    });

    it('should categorize overweight BMI', () => {
      expect(calc.getBMICategory(27)).toBe('Overweight');
    });

    it('should categorize obese BMI', () => {
      expect(calc.getBMICategory(32)).toBe('Obese');
    });
  });

  describe('stepsToCalories', () => {
    it('should calculate calories from steps', () => {
      const calories = calc.stepsToCalories(10000, 70);
      expect(calories).toBeGreaterThan(0);
    });

    it('should use default weight if not provided', () => {
      const calories = calc.stepsToCalories(10000);
      expect(calories).toBeGreaterThan(0);
    });
  });

  describe('aggregateMacros', () => {
    it('should sum macros from multiple entries', () => {
      const entries = [
        { kcal: 100, protein: 10, carbs: 20, fat: 5, fiber: 2, sugar: 1, sodium: 100 },
        { kcal: 200, protein: 15, carbs: 30, fat: 8, fiber: 3, sugar: 2, sodium: 150 }
      ];

      const totals = calc.aggregateMacros(entries);

      expect(totals.kcal).toBe(300);
      expect(totals.protein).toBe(25);
      expect(totals.carbs).toBe(50);
      expect(totals.fat).toBe(13);
      expect(totals.fiber).toBe(5);
      expect(totals.sugar).toBe(3);
      expect(totals.sodium).toBe(250);
    });

    it('should handle empty array', () => {
      const totals = calc.aggregateMacros([]);
      expect(totals.kcal).toBe(0);
      expect(totals.protein).toBe(0);
    });

    it('should handle missing optional fields', () => {
      const entries = [
        { kcal: 100, protein: 10, carbs: 20, fat: 5 }
      ];

      const totals = calc.aggregateMacros(entries);
      expect(totals.fiber).toBe(0);
      expect(totals.sodium).toBe(0);
    });
  });

  describe('calcMacroPercentages', () => {
    it('should calculate percentages of targets', () => {
      const totals = { kcal: 1500, protein: 100, carbs: 150, fat: 45 };
      const targets = { kcal: 2000, protein: 150, carbs: 200, fat: 65 };

      const percentages = calc.calcMacroPercentages(totals, targets);

      expect(percentages.kcal).toBe(75);
      expect(percentages.protein).toBe(67); // 100/150 * 100
      expect(percentages.carbs).toBe(75);
      expect(percentages.fat).toBe(69); // 45/65 * 100
    });

    it('should cap percentage at 100', () => {
      const totals = { kcal: 2500, protein: 200, carbs: 250, fat: 80 };
      const targets = { kcal: 2000, protein: 150, carbs: 200, fat: 65 };

      const percentages = calc.calcMacroPercentages(totals, targets);

      expect(percentages.kcal).toBe(100);
      expect(percentages.protein).toBe(100);
    });
  });

  describe('calcNetCalories', () => {
    it('should calculate net calories', () => {
      const net = calc.calcNetCalories(2100, 300);
      expect(net).toBe(1800);
    });

    it('should handle negative net calories', () => {
      const net = calc.calcNetCalories(1500, 2000);
      expect(net).toBe(-500);
    });
  });

  describe('validateBioMetrics', () => {
    it('should validate correct biometrics', () => {
      const result = calc.validateBioMetrics(30, 80, 180);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid age', () => {
      const result = calc.validateBioMetrics(10, 80, 180);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Age');
    });

    it('should reject invalid weight', () => {
      const result = calc.validateBioMetrics(30, 20, 180);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Weight');
    });

    it('should reject invalid height', () => {
      const result = calc.validateBioMetrics(30, 80, 50);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Height');
    });

    it('should report multiple errors', () => {
      const result = calc.validateBioMetrics(500, 10, 30);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
    });
  });
});
