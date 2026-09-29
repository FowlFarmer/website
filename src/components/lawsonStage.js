// The Lawson scene's inspo popup: opened by a click on the store or the rider, closed once the
// pointer moves off them. Listeners hear whether it's open.
const listeners = new Set();
let open = false;

export function openInspo() {
  open = true;
  listeners.forEach((listener) => listener(true));
}

export function closeInspo() {
  if (!open) return;
  open = false;
  listeners.forEach((listener) => listener(false));
}

export function onInspo(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
