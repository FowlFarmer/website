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

// Whoever builds the bar can take requests to build it now (the home page's "look at my work"
// button flies the name up as it leaves). `done` runs once the bar's items show; with nothing to
// build it, straight away.
let formHandler = null;
export const setNavFormHandler = (handler) => { formHandler = handler; };
export const formNav = (done = () => {}) => (formHandler ? formHandler(done) : done());

export const useNavFormation = () => useSyncExternalStore(subscribe, () => formation);
