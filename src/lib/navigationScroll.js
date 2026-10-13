export function scrollNavigation(state, y, max, frozen = false) {
  if (!Number.isFinite(y) || y < 0 || y > max) return state;
  if (frozen) return { ...state, last: y, travel: 0 };
  if (y <= 20) return { last: y, travel: 0, visible: true };
  const delta = y - state.last;
  if (Math.abs(delta) < 3) return state;
  const travel =
    Math.sign(delta) === Math.sign(state.travel) ? state.travel + delta : delta;
  return {
    last: y,
    travel: Math.abs(travel) >= 24 ? 0 : travel,
    visible: Math.abs(travel) >= 24 ? travel < 0 : state.visible,
  };
}
