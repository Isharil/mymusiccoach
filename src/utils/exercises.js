// Plus grand id d'une liste d'éléments (0 si vide)
export const maxIdOf = (items) => items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);

// Normalise les champs durée, séries et tempo saisis dans le formulaire
export const normalizeExerciseFields = (data) => {
  let { duration, sets, baseTempo, ...rest } = data;

  // Normaliser la durée: extraire le nombre, limiter à 60 min, ajouter "min"
  if (duration) {
    const durationTrimmed = duration.trim();
    const durationMatch = durationTrimmed.match(/^(\d+)/);
    if (durationMatch) {
      const minutes = Math.min(60, Math.max(1, parseInt(durationMatch[1])));
      duration = `${minutes} min`;
    }
  }

  // Normaliser les séries: extraire le nombre, limiter à 20, afficher "séries"
  if (sets) {
    const setsTrimmed = sets.trim();
    const setsMatch = setsTrimmed.match(/^(\d+)/);
    if (setsMatch) {
      const numSets = Math.min(20, Math.max(1, parseInt(setsMatch[1])));
      sets = `${numSets} séries`;
    }
  }

  // Normaliser le tempo: limiter entre 0 et 300 BPM (0 = non applicable)
  if (baseTempo !== undefined) {
    const tempoValue = parseInt(baseTempo);
    baseTempo = isNaN(tempoValue) ? 0 : Math.min(300, Math.max(0, tempoValue));
  }

  return { ...rest, duration, sets, baseTempo };
};

// "5 min" -> 300 secondes
export const parseDuration = (durationStr) => {
  // Parse "5 min", "10 min", "8 min", etc. vers secondes
  const match = durationStr.match(/(\d+)\s*min/i);
  if (match) {
    return parseInt(match[1]) * 60;
  }
  return 300; // Default 5 minutes
};

// 75 -> "1:15"
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
