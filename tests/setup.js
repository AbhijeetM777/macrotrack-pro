/**
 * Test Setup - Initialize test environment
 */

// Mock localStorage for tests
const localStorageMock = (() => {
  let store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock document.getElementById for DOM tests
if (!document.getElementById) {
  document.getElementById = (id) => {
    const el = document.createElement('div');
    el.id = id;
    return el;
  };
}

// Setup console spies to reduce noise
global.console = {
  ...console,
  warn: () => {},
  error: () => {}
};
