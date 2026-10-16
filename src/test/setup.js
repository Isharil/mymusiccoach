// Préparation commune des tests Vitest
import 'fake-indexeddb/auto';

if (typeof window !== 'undefined') {
  // API du navigateur absentes de jsdom
  window.matchMedia ??= (query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  });
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView ??= () => {};
}
