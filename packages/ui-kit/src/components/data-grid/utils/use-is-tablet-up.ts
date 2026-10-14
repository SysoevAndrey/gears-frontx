import { useSyncExternalStore } from 'react';

// From this width a popover has room to open beside its trigger; below it the same content opens
// as a panel from the bottom edge.
const TABLET_MIN_WIDTH = 720;

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

function getSnapshot() {
  return window.innerWidth >= TABLET_MIN_WIDTH;
}

// The server cannot know the width; it renders the narrow form and the client corrects it.
function getServerSnapshot() {
  return false;
}

/** Whether the window is at least tablet wide, following the window as it is resized. */
export function useIsTabletUp() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
