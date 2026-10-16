export function domStyle() {
  const priorities = new Map();
  return {
    getPropertyValue(name) { return this[name] || ''; },
    getPropertyPriority(name) { return priorities.get(name) || ''; },
    setProperty(name, value, priority = '') { this[name] = value; priorities.set(name, priority); },
    removeProperty(name) { const old = this[name]; delete this[name]; priorities.delete(name); return old; },
  };
}
