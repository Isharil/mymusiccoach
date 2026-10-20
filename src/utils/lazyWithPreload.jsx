import { lazy } from 'react';

// Composants chargés à la demande, qu'on peut aussi précharger.
// Avant le préchargement, le composant est chargé à sa première ouverture (React.lazy, avec un
// <Suspense> parent). Une fois préchargé, il s'affiche directement, sans étape de chargement.
const preloaders = [];

export const lazyWithPreload = (load) => {
  // Un seul chargement, partagé par l'affichage et le préchargement
  let loading = null;
  const loadOnce = () => (loading ??= load());
  let Loaded = null;
  const LazyComponent = lazy(loadOnce);
  preloaders.push(() => loadOnce().then(module => { Loaded = module.default; }));

  const Preloadable = (props) => (Loaded ? <Loaded {...props} /> : <LazyComponent {...props} />);
  return Preloadable;
};

/** Précharge tous les composants déclarés avec lazyWithPreload */
export const preloadLazyComponents = () =>
  Promise.all(preloaders.map(preload => preload().catch(() => {})));
