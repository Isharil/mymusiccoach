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

  // Lecture audio : jsdom ne lit pas les médias
  URL.createObjectURL ??= () => 'blob:mymusiccoach-test';
  URL.revokeObjectURL ??= () => {};
  const media = window.HTMLMediaElement.prototype;
  Object.defineProperty(media, 'paused', { configurable: true, get() { return this.fakePaused ?? true; } });
  media.load = () => {};
  media.play = function play() {
    this.fakePaused = false;
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  };
  media.pause = function pause() {
    if (this.fakePaused !== false) return;
    this.fakePaused = true;
    this.dispatchEvent(new Event('pause'));
  };
}
