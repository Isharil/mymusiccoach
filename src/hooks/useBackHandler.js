import { useEffect, useRef } from 'react';

// Bouton ou geste « retour » d'Android : chaque fenêtre ouverte s'inscrit dans une pile, et le
// retour ferme la plus récente (la fiche d'un morceau puis le lecteur ouvert depuis celle-ci, etc.)
const handlers = [];

/**
 * Ferme la fenêtre avec le retour d'Android, comme son bouton de fermeture.
 * @param {() => void} onBack - même action que le bouton de fermeture
 * @param {boolean} [active=true] - false : la fenêtre n'est pas ouverte
 */
export const useBackHandler = (onBack, active = true) => {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    if (!active) return undefined;
    const handler = () => onBackRef.current();
    handlers.push(handler);
    return () => {
      const index = handlers.lastIndexOf(handler);
      if (index >= 0) handlers.splice(index, 1);
    };
  }, [active]);
};

/** Ferme la fenêtre la plus récente ; false s'il n'y en a aucune */
export const handleBackButton = () => {
  const handler = handlers.at(-1);
  if (!handler) return false;
  handler();
  return true;
};
