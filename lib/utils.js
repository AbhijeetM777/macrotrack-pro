/**
 * Utilities Module - Helper functions for sanitization, validation, and UI
 */

export const UtilsModule = (() => {
  /**
   * Sanitize user input to prevent XSS attacks
   * Uses textContent method which is safe, with additional character filtering
   * @param {string} str - Input string to sanitize
   * @returns {string} Sanitized string
   */
  const sanitizeHTML = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    const sanitized = div.innerHTML;
    // Additional validation: remove any remaining dangerous patterns
    return sanitized.replace(/[<>"']/g, '');
  };

  /**
   * Escape special regex characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  const escapeRegex = (str) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  /**
   * Format number as currency (USD)
   * @param {number} value - Value to format
   * @returns {string} Formatted currency string
   */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  /**
   * Format number with thousands separator
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  const formatNumber = (num) => {
    return num.toLocaleString('en-US');
  };

  /**
   * Format date as MM/DD/YYYY
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date
   */
  const formatDate = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US');
  };

  /**
   * Constrain number to min/max range
   * @param {number} value - Value to constrain
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Constrained value
   */
  const clamp = (value, min, max) => {
    return Math.max(min, Math.min(max, value));
  };

  /**
   * Validate quantity input (for food logging)
   * @param {number} value - Quantity value
   * @returns {number} Valid quantity (0.5 to 99)
   */
  const validateQuantity = (value) => {
    return clamp(value, 0.5, 99);
  };

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid email
   */
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} {valid, strength, messages}
   */
  const validatePassword = (password) => {
    const messages = [];
    let strength = 0;

    if (password.length >= 8) strength++;
    else messages.push('At least 8 characters');

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    else messages.push('Mix of uppercase and lowercase');

    if (/\d/.test(password)) strength++;
    else messages.push('At least one number');

    if (/[!@#$%^&*]/.test(password)) strength++;
    else messages.push('At least one special character');

    return {
      valid: strength >= 3,
      strength: strength,
      messages: messages
    };
  };

  /**
   * Debounce function calls
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  const debounce = (fn, delay = 300) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  };

  /**
   * Throttle function calls
   * @param {Function} fn - Function to throttle
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Throttled function
   */
  const throttle = (fn, delay = 300) => {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn(...args);
      }
    };
  };

  /**
   * Parse JSON safely
   * @param {string} jsonStr - JSON string to parse
   * @param {*} defaultValue - Value if parse fails
   * @returns {*} Parsed object or default
   */
  const parseJSON = (jsonStr, defaultValue = null) => {
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.warn('JSON parse error:', e);
      return defaultValue;
    }
  };

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  /**
   * Check if device is mobile
   * @returns {boolean} Is mobile device
   */
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} Success status
   */
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('Copy to clipboard error:', e);
      return false;
    }
  };

  /**
   * Generate CSV string from array of objects
   * @param {Array<Object>} data - Data to convert
   * @param {Array<string>} keys - Column keys to include
   * @returns {string} CSV formatted string
   */
  const generateCSV = (data, keys) => {
    const header = keys.join(',');
    const rows = data.map(item =>
      keys.map(key => {
        const value = item[key];
        // Escape quotes in values
        return typeof value === 'string' && value.includes(',')
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      }).join(',')
    );
    return [header, ...rows].join('\n');
  };

  /**
   * Download file to user's device
   * @param {string} content - File content
   * @param {string} filename - Filename
   * @param {string} mimeType - MIME type
   */
  const downloadFile = (content, filename, mimeType = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Public API
  return {
    sanitizeHTML,
    escapeRegex,
    formatCurrency,
    formatNumber,
    formatDate,
    clamp,
    validateQuantity,
    validateEmail,
    validatePassword,
    debounce,
    throttle,
    parseJSON,
    generateId,
    sleep,
    isMobileDevice,
    copyToClipboard,
    generateCSV,
    downloadFile
  };
})();
