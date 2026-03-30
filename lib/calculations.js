/**
 * Calculations Module - All fitness-related math and metrics
 * Includes BMR, TDEE, macro calculations, and data aggregations
 */

export const CalculationsModule = (() => {
  // Activity multipliers for TDEE calculation
  const ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9
  };

  // Calorie conversion factors
  const CALORIE_PER_GRAM = {
    protein: 4,
    carbs: 4,
    fat: 9
  };

  /**
   * Calculate Basal Metabolic Rate (BMR) using Harris-Benedict formula
   * @param {Object} profile - {age, weight (kg), height (cm), gender}
   * @returns {number} BMR in kcal/day
   */
  const calcBMR = (profile) => {
    const { age, weight, height, gender } = profile;

    if (gender === 'male') {
      return 88.36 + 13.4 * weight + 4.8 * height - 5.7 * age;
    } else {
      return 447.6 + 9.2 * weight + 3.1 * height - 4.3 * age;
    }
  };

  /**
   * Calculate Total Daily Energy Expenditure (TDEE)
   * @param {number} bmr - Basal Metabolic Rate
   * @param {string} activityLevel - Activity level key
   * @returns {number} TDEE in kcal/day
   */
  const calcTDEE = (bmr, activityLevel) => {
    const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.55;
    return Math.round(bmr * multiplier);
  };

  /**
   * Calculate daily calorie target based on goal
   * @param {number} tdee - Total Daily Energy Expenditure
   * @param {string} goal - 'cut', 'maintain', or 'bulk'
   * @returns {number} Target kcal/day
   */
  const calcCalorieTarget = (tdee, goal) => {
    const adjustments = {
      cut: -400,
      maintain: 0,
      bulk: 350
    };
    return tdee + (adjustments[goal] || 0);
  };

  /**
   * Calculate macro targets based on calories and diet type
   * @param {number} calories - Target daily calories
   * @param {Array<number>} dietRatio - [proteinPct, carbsPct, fatPct]
   * @returns {Object} {protein (g), carbs (g), fat (g)}
   */
  const calcMacroTargets = (calories, dietRatio = [30, 40, 30]) => {
    return {
      protein: Math.round((calories * dietRatio[0] / 100) / CALORIE_PER_GRAM.protein),
      carbs: Math.round((calories * dietRatio[1] / 100) / CALORIE_PER_GRAM.carbs),
      fat: Math.round((calories * dietRatio[2] / 100) / CALORIE_PER_GRAM.fat)
    };
  };

  /**
   * Calculate full targets given profile
   * @param {Object} profile - User profile object
   * @returns {Object} Complete targets {kcal, protein, carbs, fat, tdee}
   */
  const calcTargets = (profile) => {
    const bmr = calcBMR(profile);
    const tdee = calcTDEE(bmr, profile.activity || 'moderate');
    const kcal = calcCalorieTarget(tdee, profile.goal || 'maintain');
    const macros = calcMacroTargets(kcal, profile.dietRatio || [30, 40, 30]);

    return {
      kcal,
      ...macros,
      tdee
    };
  };

  /**
   * Calculate BMI (Body Mass Index)
   * @param {number} weight - Weight in kg
   * @param {number} height - Height in cm
   * @returns {number} BMI value
   */
  const calcBMI = (weight, height) => {
    const heightM = height / 100;
    return Math.round((weight / (heightM * heightM)) * 10) / 10;
  };

  /**
   * Get BMI category
   * @param {number} bmi - BMI value
   * @returns {string} Category (underweight, normal, overweight, obese)
   */
  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  /**
   * Calculate calories burned from steps
   * @param {number} steps - Number of steps
   * @param {number} weight - Weight in kg
   * @returns {number} Estimated calories burned
   */
  const stepsToCalories = (steps, weight = 70) => {
    return Math.round(steps * ((weight || 70) * 0.00057 * 0.76));
  };

  /**
   * Aggregate daily totals from food entries
   * @param {Array<Object>} entries - Food log entries
   * @returns {Object} Totals {kcal, protein, carbs, fat, fiber, sugar, sodium}
   */
  const aggregateMacros = (entries) => {
    return entries.reduce(
      (totals, entry) => ({
        kcal: totals.kcal + (entry.kcal || 0),
        protein: totals.protein + (entry.protein || 0),
        carbs: totals.carbs + (entry.carbs || 0),
        fat: totals.fat + (entry.fat || 0),
        fiber: totals.fiber + (entry.fiber || 0),
        sugar: totals.sugar + (entry.sugar || 0),
        sodium: totals.sodium + (entry.sodium || 0)
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
    );
  };

  /**
   * Calculate macro percentages from totals
   * @param {Object} totals - Macro totals
   * @param {Object} targets - Macro targets
   * @returns {Object} Percentages {protein, carbs, fat}
   */
  const calcMacroPercentages = (totals, targets) => {
    return {
      protein: Math.min(Math.round((totals.protein / targets.protein) * 100), 100),
      carbs: Math.min(Math.round((totals.carbs / targets.carbs) * 100), 100),
      fat: Math.min(Math.round((totals.fat / targets.fat) * 100), 100),
      kcal: Math.min(Math.round((totals.kcal / targets.kcal) * 100), 100)
    };
  };

  /**
   * Calculate net calories (eaten - burned)
   * @param {number} eaten - Total calories eaten
   * @param {number} burned - Total calories burned (steps + activities)
   * @returns {number} Net calories
   */
  const calcNetCalories = (eaten, burned) => {
    return Math.round(eaten - burned);
  };

  /**
   * Calculate 30-day weight trend (for charting)
   * @param {Array<Object>} weights - Weight entries [{date, weight, unit}]
   * @returns {Array<Object>} Last 30 days of weights
   */
  const getLast30DayWeights = (weights) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return weights
      .filter(w => new Date(w.date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  /**
   * Validate age, weight, height ranges
   * @param {number} age
   * @param {number} weight
   * @param {number} height
   * @returns {Object} {valid: boolean, errors: []}
   */
  const validateBioMetrics = (age, weight, height) => {
    const errors = [];

    if (age < 13 || age > 120) errors.push('Age must be 13-120 years');
    if (weight < 30 || weight > 300) errors.push('Weight must be 30-300 kg');
    if (height < 100 || height > 250) errors.push('Height must be 100-250 cm');

    return {
      valid: errors.length === 0,
      errors
    };
  };

  // Public API
  return {
    calcBMR,
    calcTDEE,
    calcCalorieTarget,
    calcMacroTargets,
    calcTargets,
    calcBMI,
    getBMICategory,
    stepsToCalories,
    aggregateMacros,
    calcMacroPercentages,
    calcNetCalories,
    getLast30DayWeights,
    validateBioMetrics,
    ACTIVITY_MULTIPLIERS,
    CALORIE_PER_GRAM
  };
})();
