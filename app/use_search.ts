import { useSyncExternalStore } from "react";

declare global {
  interface Window {
    navigation: {
      addEventListener(name: "navigate", listener: () => void): void;
      removeEventListener(name: "navigate", listener: () => void): void;
    };
  }
}

function subscribe(onStoreChange: () => void) {
  const listener = () => onStoreChange();

  window.navigation.addEventListener("navigate", listener);
  return () => window.navigation.removeEventListener("navigate", listener);
}

function getSnapshot() {
  return window.location.search;
}

export function useSearch() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
