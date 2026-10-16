// Share ownership across chat and nested dialogs. Release order must not matter.
const locks = new Set();
let saved = null;
export function acquireScrollLock() {
  const owner = Symbol('scroll-lock');
  if (!locks.size) {
    saved = [document.body, document.documentElement].filter(node => node?.style).map(node => ({
      node, value: node.style.getPropertyValue('overflow'),
      priority: node.style.getPropertyPriority('overflow'),
    }));
    saved.forEach(({node}) => node.style.setProperty('overflow', 'hidden'));
  }
  locks.add(owner);
  return () => {
    if (!locks.delete(owner) || locks.size) return;
    saved?.forEach(({node, value, priority}) => {
      if (value) node.style.setProperty('overflow', value, priority);
      else node.style.removeProperty('overflow');
    });
    saved = null;
  };
}
