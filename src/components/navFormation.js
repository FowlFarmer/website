import { useSyncExternalStore } from 'react';

// On the home page the name banner builds the menu bar out of petals. It publishes whether the
// white bar and its items are showing; while nothing manages it, the navbar keeps its own fade.
let formation = { managed: false, bar: false, items: false };
const listeners = new Set();

export function setNavFormation(patch) {
  formation = { ...formation, ...patch };
  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useNavFormation = () => useSyncExternalStore(subscribe, () => formation);
