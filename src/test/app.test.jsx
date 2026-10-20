// @vitest-environment jsdom
// Tests de parcours : l'application complète est rendue dans un faux navigateur
// avec une base IndexedDB en mémoire. Ils servent de filet de sécurité pour les refontes.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clear, get, set } from 'idb-keyval';
import App from '../App';
import { preloadLazyComponents } from '../utils/lazyWithPreload';

// Lundi 12 octobre 2026 : avec le planning par défaut, la session du jour est "Beginner routine"
const MONDAY = new Date(2026, 9, 12, 10, 0);

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(MONDAY);
  await clear();
  localStorage.clear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Lance l'app et passe le tutoriel
const startApp = async () => {
  // Écrans chargés à la demande : préchargés pour s'afficher dès le clic, comme dans l'app après quelques secondes
  await preloadLazyComponents();
  const user = userEvent.setup();
  const view = render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Skip' }));
  return { user, ...view };
};

const nav = (name) => screen.getByRole('button', { name });

// Attend qu'une valeur soit écrite dans IndexedDB
const stored = async (key, predicate) => {
  let value;
  await waitFor(async () => {
    value = await get(key);
    expect(predicate(value)).toBe(true);
  });
  return value;
};

describe('MyMusicCoach', () => {
  it('affiche le tutoriel puis navigue entre les onglets', async () => {
    const { user } = await startApp();

    expect(screen.getByText(/Hello, Musician/)).toBeTruthy();
    expect(screen.getByText('Beginner routine')).toBeTruthy();

    await user.click(nav('Library'));
    expect(await screen.findByText('Technical warm-up')).toBeTruthy();

    await user.click(nav('Stats'));
    expect(screen.getByRole('heading', { name: 'Statistics' })).toBeTruthy();

    await user.click(nav('Settings'));
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
  });

  it('déroule une session complète et enregistre le statut de chaque exercice', async () => {
    const { user } = await startApp();

    await user.click(screen.getByRole('button', { name: 'Start session' }));
    expect(screen.getByRole('heading', { name: 'Beginner routine' })).toBeTruthy();

    // Exercice 1 sauté, exercice 2 validé
    await user.click(screen.getAllByRole('button', { name: 'View details' })[0]);
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '← Back' }));

    await user.click(screen.getAllByRole('button', { name: 'View details' })[1]);
    await user.click(screen.getByRole('button', { name: 'Validate exercise' }));

    await user.click(screen.getByRole('button', { name: 'Finish session' }));
    expect(await screen.findByText('Session completed!')).toBeTruthy();

    const history = await stored('mmc_sessionHistory', (h) => h?.length === 1);
    expect(history[0]).toMatchObject({
      date: '2026-10-12',
      workoutId: 1,
      completed: 1,
      skipped: 1,
      exerciseProgress: { 1: 'skipped', 2: 'completed' },
    });

    // La session terminée peut être modifiée depuis l'accueil
    await user.click(screen.getByRole('button', { name: /Session completed - Edit/ }));
    expect(screen.getByRole('heading', { name: 'Edit session' })).toBeTruthy();

    // Et apparaît dans l'historique des stats
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(nav('Stats'));
    expect(screen.getByText('Beginner routine')).toBeTruthy();
  });

  it('enregistre le temps de pratique et le compare à l\'objectif de la semaine', async () => {
    const { user } = await startApp();

    await user.click(screen.getByRole('button', { name: 'Start session' }));
    for (const index of [0, 1]) {
      await user.click(screen.getAllByRole('button', { name: 'View details' })[index]);
      await user.click(screen.getByRole('button', { name: 'Validate exercise' }));
    }

    // Durée mesurée (la date est figée dans les tests : 1 min), corrigée à la main
    const duration = screen.getByLabelText('Practice time');
    expect(duration.value).toBe('1');
    await user.clear(duration);
    await user.type(duration, '25');
    await user.click(screen.getByRole('button', { name: 'Finish session' }));

    const history = await stored('mmc_sessionHistory', (h) => h?.length === 1);
    expect(history[0].durationMinutes).toBe(25);

    // Objectif hebdomadaire
    await user.click(nav('Settings'));
    await user.type(screen.getByLabelText(/Weekly practice goal/), '60');
    await user.click(nav('Home'));
    expect(screen.getByText('/ 1 h', { exact: false })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Weekly goal' }).getAttribute('aria-valuenow')).toBe('25');

    // Stats : durée dans l'historique et répartition par catégorie (exercices de 5 et 8 min)
    await user.click(nav('Stats'));
    expect(screen.getByText('⏱ 25 min')).toBeTruthy();
    expect(screen.getByText('Breakdown over 28 days')).toBeTruthy();
    expect(screen.getAllByText('Technique').length).toBeGreaterThan(0);
  });

  it('crée un exercice puis une session, et la programme dans le planning', async () => {
    const { user, container } = await startApp();
    const field = (name) => container.querySelector(`[name="${name}"]`);

    // Nouvel exercice
    await user.click(nav('Library'));
    await user.click(screen.getByRole('button', { name: 'Create an exercise' }));
    await user.type(field('name'), 'Major scales');
    await user.type(field('duration'), '10');
    await user.type(field('sets'), '5');
    await user.type(field('description'), 'Two octaves');
    await user.click(screen.getByRole('button', { name: /Create exercise/ }));

    expect(await screen.findByText('Major scales')).toBeTruthy();
    expect(screen.getByText('5 sets')).toBeTruthy();
    const exercises = await stored('mmc_exercises', (list) => list?.length === 3);
    expect(exercises[2]).toMatchObject({ id: 3, name: 'Major scales', duration: '10 min', sets: '5 séries' });

    // Nouvelle session contenant cet exercice
    await user.click(screen.getByRole('button', { name: 'Sessions' }));
    await user.click(screen.getByRole('button', { name: 'Create a session' }));
    await user.type(field('name'), 'My routine');
    await user.type(field('duration'), '20 min');
    await user.type(field('category'), 'Scales');
    await user.click(screen.getByRole('checkbox', { name: /Major scales/ }));
    await user.click(screen.getByRole('button', { name: /Create session/ }));
    expect(await screen.findByText('My routine')).toBeTruthy();

    // Programmation le lundi de la semaine 1
    await user.click(nav('Home'));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('heading', { name: '4-week schedule' })).toBeTruthy();
    const mondaySelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(mondaySelect, '3');
    await user.click(screen.getByRole('button', { name: /Save schedule/ }));

    expect(await screen.findByText('My routine')).toBeTruthy();
    await stored('mmc_weeklySchedule', (s) => s?.semaine1?.lundi?.join(',') === '1,3');
  });

  it('suit la progression vers le tempo cible et suggère le tempo suivant', async () => {
    await set('mmc_exercises', [{
      id: 1, name: 'Arpeggios', duration: '5 min', sets: '3 séries', type: 'none', difficulty: 'Débutant',
      category: 'Technique', description: '', baseTempo: 60, targetTempo: 100,
      tempoHistory: [{ date: '2026-10-08', tempo: 80 }, { date: '2026-10-10', tempo: 80 }],
    }]);
    const { user, container } = await startApp();

    await user.click(nav('Library'));
    expect(screen.getByText(/60 → 100 BPM/)).toBeTruthy();
    await user.click(screen.getByText('Arpeggios'));

    expect(screen.getByText('80 / 100 BPM')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Target tempo' }).getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getByText(/Today, try 85 BPM/)).toBeTruthy();

    // Modification du tempo cible
    await user.click(screen.getByRole('button', { name: 'More options' }));
    await user.click(screen.getByRole('button', { name: /Edit exercise/ }));
    const target = container.querySelector('[name="targetTempo"]');
    expect(target.value).toBe('100');
    await user.clear(target);
    await user.type(target, '82');
    await user.click(screen.getByRole('button', { name: /Save changes/ }));
    await stored('mmc_exercises', (list) => list?.[0]?.targetTempo === 82);
  });

  it('démarre une session hors planning depuis la bibliothèque', async () => {
    const { user } = await startApp();

    await user.click(nav('Library'));
    await user.click(screen.getByRole('button', { name: 'Sessions' }));
    await user.click(screen.getByRole('button', { name: 'Start session Blues improvisation' }));

    expect(screen.getByRole('heading', { name: 'Blues improvisation' })).toBeTruthy();
    const active = await stored('mmc_activeWorkout', (w) => w?.id === 2);
    expect(active.startedAt).toBe(MONDAY.getTime());
  });

  it('note, modifie et supprime une pratique libre', async () => {
    await set('mmc_sessionHistory', [
      { id: 1, date: '2026-10-11', time: '09:00', workoutId: 1, workoutName: 'Beginner routine', completed: 2, skipped: 0, total: 2, durationMinutes: 20 },
    ]);
    const { user } = await startApp();

    await user.click(screen.getByRole('button', { name: /^Free practice/ }));
    const dialog = screen.getByRole('dialog', { name: 'Free practice' });
    await user.type(within(dialog).getByLabelText('Title (optional)'), 'Jam with friends');
    const date = within(dialog).getByLabelText('Date');
    await user.clear(date);
    await user.type(date, '2026-10-10');
    const duration = within(dialog).getByLabelText('Practice time');
    await user.clear(duration);
    await user.type(duration, '45');
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Morceaux');
    await user.type(within(dialog).getByLabelText('Note (optional)'), 'Blues in A');
    await user.click(within(dialog).getByRole('button', { name: /Save/ }));

    // Rangée avant la session du 11 octobre
    const history = await stored('mmc_sessionHistory', (h) => h?.length === 2);
    expect(history[0]).toMatchObject({
      date: '2026-10-10', workoutName: 'Jam with friends', free: true, durationMinutes: 45,
      category: 'Morceaux', note: 'Blues in A', workoutId: null,
    });

    // Historique des stats : affichage puis modification
    await user.click(nav('Stats'));
    await user.click(screen.getByRole('button', { name: /Show more/ }));
    expect(screen.getByText('Blues in A')).toBeTruthy();
    expect(screen.getByText(/Free practice · Pieces/)).toBeTruthy();
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[1]);
    const editDialog = screen.getByRole('dialog', { name: 'Edit free practice' });
    const editDuration = within(editDialog).getByLabelText('Practice time');
    await user.clear(editDuration);
    await user.type(editDuration, '30');
    await user.click(within(editDialog).getByRole('button', { name: /Save/ }));
    await stored('mmc_sessionHistory', (h) => h?.[0]?.durationMinutes === 30);

    // Suppression
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[1]);
    await user.click(screen.getByRole('button', { name: 'Delete this entry' }));
    const remaining = await stored('mmc_sessionHistory', (h) => h?.length === 1);
    expect(remaining[0].id).toBe(1);
  });

  it('affiche la progression du tempo le plus récent, et les autres sur demande', async () => {
    const exercise = (id, name, date) => ({
      id, name, duration: '5 min', sets: '3 séries', type: 'none', difficulty: 'Débutant',
      category: 'Technique', description: '', baseTempo: 60, tempoHistory: [{ date, tempo: 70 }],
    });
    await set('mmc_exercises', [
      exercise(1, 'Old scales', '2026-09-01'),
      exercise(2, 'Recent arpeggios', '2026-10-11'),
      exercise(3, 'Chords', '2026-10-05'),
    ]);
    const { user } = await startApp();

    await user.click(nav('Stats'));
    expect(screen.getByText('Recent arpeggios')).toBeTruthy();
    expect(screen.queryByText('Chords')).toBeNull();
    expect(screen.queryByText('Old scales')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Show more (2 others)' }));
    const names = ['Recent arpeggios', 'Chords', 'Old scales'];
    names.forEach(name => expect(screen.getByText(name)).toBeTruthy());
    // Du plus récemment travaillé au plus ancien
    const positions = names.map(name => screen.getByText(name).compareDocumentPosition(screen.getByText('Old scales')));
    expect(positions[0] & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.queryByText('Chords')).toBeNull();
  });

  describe('accordeur', () => {
    // Micro simulé : joue en continu une note de fréquence connue
    const installFakeMicrophone = ({ frequency = 440, error = null } = {}) => {
      const sampleRate = 48000;
      class FakeAudioContext {
        sampleRate = sampleRate;
        destination = {};
        createAnalyser() {
          return {
            fftSize: 2048,
            getFloatTimeDomainData(buffer) {
              for (let i = 0; i < buffer.length; i++) buffer[i] = 0.5 * Math.sin(2 * Math.PI * frequency * i / sampleRate);
            },
          };
        }
        createMediaStreamSource() { return { connect() {} }; }
        createBiquadFilter() { return { type: '', frequency: { value: 0 }, connect() {} }; }
        createOscillator() { return { frequency: { value: 0 }, connect: (node) => node, start() {}, stop() {} }; }
        createGain() { return { gain: { value: 0 }, connect() {} }; }
        close() { return Promise.resolve(); }
      }
      const track = { stop: vi.fn() };
      const getUserMedia = error
        ? vi.fn().mockRejectedValue(Object.assign(new Error('refusé'), { name: error }))
        : vi.fn().mockResolvedValue({ getTracks: () => [track] });
      window.AudioContext = FakeAudioContext;
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
      return { track, getUserMedia };
    };

    afterEach(() => {
      delete window.AudioContext;
      delete navigator.mediaDevices;
    });

    it('reconnaît la note jouée, gère la transposition et libère le micro', async () => {
      const { track, getUserMedia } = installFakeMicrophone({ frequency: 440 });
      const { user } = await startApp();

      await user.click(screen.getByRole('button', { name: /Tuner/ }));
      await user.click(screen.getByRole('button', { name: /Turn on microphone/ }));

      expect(await screen.findByText('In tune!')).toBeTruthy();
      expect(screen.getByText('A')).toBeTruthy();
      expect(screen.getByText('440.0 Hz')).toBeTruthy();
      // Son brut : sans traitements qui faussent la hauteur
      expect(getUserMedia.mock.calls[0][0].audio).toMatchObject({ echoCancellation: false, noiseSuppression: false });

      // Trompette en Si♭ : le La réel s'écrit Si
      await user.selectOptions(screen.getByLabelText('Instrument'), 'Bb');
      expect(await screen.findByText('B')).toBeTruthy();
      expect(screen.getByText('Concert pitch: A4 · 440.0 Hz')).toBeTruthy();

      // Diapason à 442 Hz : le même son devient trop bas
      await user.click(screen.getByRole('button', { name: 'Raise the reference A' }));
      await user.click(screen.getByRole('button', { name: 'Raise the reference A' }));
      expect(await screen.findByText('Too low (-8 cents)')).toBeTruthy();
      await stored('mmc_settings', (s) => s?.tuner?.a4 === 442 && s.tuner.transposition === 'Bb');

      // La fermeture libère le micro
      await user.click(within(screen.getByRole('dialog', { name: 'Tuner' })).getByRole('button', { name: 'Close' }));
      expect(track.stop).toHaveBeenCalled();
      expect(screen.queryByRole('dialog', { name: 'Tuner' })).toBeNull();
    });

    it('écrit les altérations en dièses ou en bémols', async () => {
      installFakeMicrophone({ frequency: 466.16 }); // La♯4 / Si♭4
      const { user } = await startApp();

      await user.click(screen.getByRole('button', { name: /Tuner/ }));
      await user.click(screen.getByRole('button', { name: /Turn on microphone/ }));
      expect(await screen.findByText('A♯')).toBeTruthy();

      await user.selectOptions(screen.getByLabelText('Accidentals'), 'flats');
      expect(await screen.findByText('B♭')).toBeTruthy();
      await stored('mmc_settings', (s) => s?.tuner?.accidentals === 'flats');

      // En français : Si♭, octave 3 (La3 = 440 Hz)
      await user.click(within(screen.getByRole('dialog', { name: 'Tuner' })).getByRole('button', { name: 'Close' }));
      await user.click(nav('Settings'));
      await user.selectOptions(screen.getByLabelText('Language'), 'fr');
      await user.click(nav('Accueil'));
      await user.click(screen.getByRole('button', { name: /Accordeur/ }));
      await user.click(screen.getByRole('button', { name: /Activer le micro/ }));
      expect(await screen.findByText('Si♭')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it("explique quoi faire si l'accès au micro est refusé", async () => {
      installFakeMicrophone({ error: 'NotAllowedError' });
      const { user } = await startApp();

      await user.click(screen.getByRole('button', { name: /Tuner/ }));
      await user.click(screen.getByRole('button', { name: /Turn on microphone/ }));
      expect((await screen.findByRole('alert')).textContent).toMatch(/Microphone access denied/);
    });
  });

  describe('répertoire de morceaux', () => {
    const openPieces = async (user) => {
      await user.click(nav('Library'));
      await user.click(screen.getByRole('button', { name: 'Repertoire' }));
    };

    it('ajoute un morceau avec sa partition, puis note une séance de travail', async () => {
      const { user } = await startApp();
      await openPieces(user);
      expect(screen.getByText(/No pieces yet/)).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'New piece' }));
      const form = screen.getByRole('dialog', { name: 'New piece' });
      await user.type(within(form).getByLabelText(/Title/), 'Asturias');
      await user.type(within(form).getByLabelText('Artist or composer'), 'Isaac Albéniz');
      await user.click(within(form).getByLabelText(/Remind me to practice it/));
      await user.upload(within(form).getByLabelText('Score or tab'), new File(['%PDF'], 'asturias.pdf', { type: 'application/pdf' }));
      expect(await within(form).findByText(/asturias\.pdf/)).toBeTruthy();
      await user.click(within(form).getByRole('button', { name: /Add piece/ }));

      const pieces = await stored('mmc_pieces', (list) => list?.length === 1 && !!list[0].attachment);
      expect(pieces[0]).toMatchObject({
        id: 1, title: 'Asturias', artist: 'Isaac Albéniz', status: 'learning', reminder: true,
        reminderSince: '2026-10-12', addedAt: '2026-10-12',
      });
      expect(await get(`mmc_file_${pieces[0].attachment.id}`)).toMatchObject({ name: 'asturias.pdf' });

      // Fiche du morceau et séance de travail
      await user.click(screen.getByText('Asturias'));
      const detail = screen.getByRole('dialog', { name: 'Asturias' });
      expect(within(detail).getByText('Never')).toBeTruthy();
      expect(await within(detail).findByRole('link', { name: 'Download PDF' })).toBeTruthy();
      await user.click(within(detail).getByRole('button', { name: /I practiced it/ }));

      const practice = screen.getByRole('dialog', { name: 'Free practice' });
      expect(within(practice).getByLabelText('Title (optional)').value).toBe('Asturias');
      expect(within(practice).getByLabelText('Category').value).toBe('Morceaux');
      const duration = within(practice).getByLabelText('Practice time');
      await user.clear(duration);
      await user.type(duration, '30');
      await user.click(within(practice).getByRole('button', { name: /Save/ }));

      const history = await stored('mmc_sessionHistory', (h) => h?.length === 1);
      expect(history[0]).toMatchObject({ pieceId: 1, durationMinutes: 30, free: true, workoutName: 'Asturias' });
      await stored('mmc_pieces', (list) => list?.[0]?.lastPracticedAt === '2026-10-12');
      expect(within(screen.getByRole('dialog', { name: 'Asturias' })).getByText('30 min')).toBeTruthy();
    });

    it("garde la partition d'un morceau lors du nettoyage des fichiers au démarrage", async () => {
      await set('mmc_file_tab1', { name: 'song.gp5', data: 'data:application/octet-stream;base64,AA==', createdAt: 1 });
      await set('mmc_file_orphan', { name: 'old.pdf', data: 'data:application/pdf;base64,AA==', createdAt: 1 });
      await set('mmc_pieces', [{ id: 1, title: 'Song', status: 'learning', attachment: { id: 'tab1', name: 'song.gp5' }, tempoHistory: [] }]);
      await startApp();

      await waitFor(async () => expect(await get('mmc_file_orphan')).toBeUndefined());
      expect(await get('mmc_file_tab1')).toMatchObject({ name: 'song.gp5' });
    });

    it("ne rappelle un morceau sur l'accueil que si c'est demandé, et gère la révision", async () => {
      await set('mmc_pieces', [
        { id: 1, title: 'No reminder', status: 'learning', lastPracticedAt: '2026-10-01', tempoHistory: [] },
        { id: 2, title: 'Reviewed piece', status: 'mastered', reminder: true, reviewStage: 0, lastPracticedAt: '2026-10-09', tempoHistory: [] },
      ]);
      const { user } = await startApp();

      expect(screen.getByRole('heading', { name: /Piece to practice/ })).toBeTruthy();
      expect(screen.queryByText('No reminder')).toBeNull();
      await user.click(screen.getByRole('button', { name: /Reviewed piece/ }));

      const detail = screen.getByRole('dialog', { name: 'Reviewed piece' });
      expect(within(detail).getByText(/Review time/)).toBeTruthy();
      await user.click(within(detail).getByRole('button', { name: 'Still solid' }));
      await stored('mmc_pieces', (list) => list?.[1]?.reviewStage === 1 && list[1].lastPracticedAt === '2026-10-12');

      // Plus rien à réviser : la carte disparaît de l'accueil
      await user.click(within(screen.getByRole('dialog', { name: 'Reviewed piece' })).getByRole('button', { name: 'Close' }));
      await user.click(nav('Home'));
      expect(screen.queryByRole('heading', { name: /Piece to practice/ })).toBeNull();
    });
  });

  it('met un exercice à la corbeille puis le restaure', async () => {
    const { user } = await startApp();

    await user.click(nav('Library'));
    await user.click(await screen.findByText('Rhythm exercise'));
    await user.click(screen.getByRole('button', { name: 'More options' }));
    await user.click(screen.getByRole('button', { name: 'Delete exercise' }));
    expect(screen.queryByText('Rhythm exercise')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Trash' }));
    expect(screen.getByText('Rhythm exercise')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Restore/ }));
    await stored('mmc_deletedExercises', (list) => list?.length === 0);
    await stored('mmc_exercises', (list) => list?.length === 2);
  });

  it('archive une session et la signale dans le planning', async () => {
    const { user } = await startApp();

    await user.click(nav('Library'));
    await user.click(screen.getByRole('button', { name: 'Sessions' }));
    const card = (await screen.findByText('Beginner routine')).closest('.rounded-xl');
    await user.click(within(card).getByRole('button', { name: 'Archive' }));
    await stored('mmc_archivedWorkouts', (list) => list?.length === 1);

    // Plus de session aujourd'hui : on ouvre le planning depuis l'accueil
    await user.click(nav('Home'));
    await user.click(screen.getByRole('button', { name: 'View schedule' }));
    expect(screen.getAllByText('Beginner routine (Archive)').length).toBeGreaterThan(0);
  });

  it('importe une session partagée et refuse un fichier non JSON', async () => {
    const { user } = await startApp();

    await user.click(nav('Library'));
    await user.click(screen.getByRole('button', { name: 'Sessions' }));
    await user.click(screen.getByRole('button', { name: 'Import session' }));
    const input = screen.getByRole('dialog').querySelector('input[type="file"]');

    // Un fichier qui n'est pas du JSON est refusé avec un message
    // (applyAccept: false pour contourner le filtre .json du sélecteur, comme le ferait un fichier mal nommé)
    const uploader = userEvent.setup({ applyAccept: false });
    await uploader.upload(input, new File(['hello'], 'notes.txt', { type: 'text/plain' }));
    expect(await screen.findByText('File must be in JSON format')).toBeTruthy();

    // Une session exportée par MyMusicCoach est ajoutée avec ses exercices
    const shared = {
      version: '1.0',
      appName: 'MyMusicCoach',
      workout: { name: 'Shared routine', duration: '15 min', category: 'Technique' },
      exercises: [{
        name: 'Shared exercise', duration: '5 min', sets: '2 séries', type: 'none',
        difficulty: 'Débutant', category: 'Technique', description: 'From my teacher', baseTempo: 70
      }],
    };
    await user.upload(input, new File([JSON.stringify(shared)], 'session.json', { type: 'application/json' }));

    expect(await screen.findByText('Shared routine')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    const workouts = await stored('mmc_workouts', (list) => list?.length === 3);
    expect(workouts[2]).toMatchObject({ id: 3, name: 'Shared routine', exercises: [3] });
    const exercises = await stored('mmc_exercises', (list) => list?.length === 3);
    expect(exercises[2]).toMatchObject({ id: 3, name: 'Shared exercise', tempoHistory: [] });
  });

  it('restaure une sauvegarde après confirmation', async () => {
    const { user, container } = await startApp();
    await user.click(nav('Settings'));
    const input = container.querySelector('input[type="file"][accept=".json"]');
    const backupFile = (content) => new File([JSON.stringify(content)], 'backup.json', { type: 'application/json' });

    // Un fichier de session envoyé ici par erreur est refusé avec une explication
    await user.upload(input, backupFile({ version: '1.0', workout: { name: 'R' }, exercises: [] }));
    expect(await screen.findByText(/This file contains a shared session/)).toBeTruthy();

    const backup = {
      appName: 'MyMusicCoach',
      formatVersion: 2,
      exportDate: '2026-10-01T09:00:00.000Z',
      exercises: JSON.stringify([{ id: 7, name: 'Restored exercise', tempoHistory: [] }]),
      sessionHistory: JSON.stringify([{ id: 1, date: '2026-09-30', workoutId: 1 }]),
    };

    // Annulation : rien n'est écrit
    window.confirm.mockReturnValueOnce(false);
    await user.upload(input, backupFile(backup));
    await waitFor(() => expect(window.confirm).toHaveBeenCalledTimes(1));
    expect(window.confirm.mock.calls[0][0]).toMatch(/Exercises: 1 · Sessions: 0 · History: 1/);
    expect((await get('mmc_exercises')).map(e => e.id)).toEqual([1, 2]);

    // Confirmation : les données sont remplacées
    await user.upload(input, backupFile(backup));
    expect(await screen.findByText(/Data imported/)).toBeTruthy();
    await stored('mmc_exercises', (list) => list?.length === 1 && list[0].name === 'Restored exercise');
  });

  it('joint un fichier à un exercice, le stocke à part et le partage avec la session', async () => {
    const { user, container } = await startApp();
    const field = (name) => container.querySelector(`[name="${name}"]`);

    // Création d'un exercice avec un PDF
    await user.click(nav('Library'));
    await user.click(screen.getByRole('button', { name: 'Create an exercise' }));
    await user.type(field('name'), 'Sight reading');
    await user.type(field('duration'), '10');
    await user.type(field('sets'), '1');
    await user.type(field('description'), 'Page 12');
    await user.click(screen.getByRole('button', { name: 'File' }));
    const pdf = new File(['%PDF-1.4 test'], 'etude.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByRole('dialog').querySelector('input[type="file"]'), pdf);
    expect(await screen.findByText(/etude\.pdf/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Create exercise/ }));

    // L'exercice ne contient qu'une référence, le fichier est sous sa propre clé
    const exercises = await stored('mmc_exercises', (list) => list?.length === 3 && !!list[2].attachment);
    expect(exercises[2]).not.toHaveProperty('fileData');
    const file = await get(`mmc_file_${exercises[2].attachment.id}`);
    expect(file).toMatchObject({ name: 'etude.pdf', data: expect.stringMatching(/^data:application\/pdf/) });

    // La fiche de l'exercice affiche le fichier
    await user.click(await screen.findByText('Sight reading'));
    expect(await screen.findByRole('link', { name: 'Download PDF' })).toBeTruthy();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '← Back' }));

    // Une session contenant cet exercice est partagée avec le fichier
    await user.click(screen.getByRole('button', { name: 'Sessions' }));
    await user.click(screen.getByRole('button', { name: 'Create a session' }));
    await user.type(field('name'), 'Reading');
    await user.type(field('duration'), '10 min');
    await user.type(field('category'), 'Theory');
    await user.click(screen.getByRole('checkbox', { name: /Sight reading/ }));
    await user.click(screen.getByRole('button', { name: /Create session/ }));

    let downloadedHref = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloadedHref = this.href; });
    const card = (await screen.findByText('Reading')).closest('.rounded-xl');
    await user.click(within(card).getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(downloadedHref).not.toBeNull());
    const shared = JSON.parse(decodeURIComponent(downloadedHref.split(',').slice(1).join(',')));
    expect(shared.exercises[0]).toMatchObject({ name: 'Sight reading', fileData: { name: 'etude.pdf' } });
    expect(shared.exercises[0]).not.toHaveProperty('attachment');

    // Réimport : le fichier est de nouveau rangé à part
    await user.click(screen.getByRole('button', { name: 'Import session' }));
    await user.upload(
      screen.getByRole('dialog').querySelector('input[type="file"]'),
      new File([JSON.stringify(shared)], 'session.json', { type: 'application/json' })
    );
    const afterImport = await stored('mmc_exercises', (list) => list?.length === 4);
    expect(afterImport[3].attachment.id).not.toBe(exercises[2].attachment.id);
    expect(afterImport[3]).not.toHaveProperty('fileData');
    expect(await get(`mmc_file_${afterImport[3].attachment.id}`)).toMatchObject({ name: 'etude.pdf' });
  });

  it('range à part au démarrage les fichiers stockés dans les exercices (ancien format)', async () => {
    await set('mmc_exercises', [
      { id: 1, name: 'Old exercise', type: 'file', fileData: { name: 'old.png', data: 'data:image/png;base64,iVBORw0KGgo=' }, tempoHistory: [] },
    ]);
    await startApp();

    const exercises = await stored('mmc_exercises', (list) => !!list?.[0]?.attachment);
    expect(exercises[0]).not.toHaveProperty('fileData');
    expect(await get(`mmc_file_${exercises[0].attachment.id}`)).toMatchObject({ name: 'old.png' });
  });

  it('change la langue', async () => {
    const { user } = await startApp();

    await user.click(nav('Settings'));
    await user.selectOptions(screen.getByRole('combobox'), 'fr');

    expect(await screen.findByRole('heading', { name: 'Réglages' })).toBeTruthy();
    expect(nav('Accueil')).toBeTruthy();
    await user.click(nav('Accueil'));
    expect(screen.getByText('Routine Débutant')).toBeTruthy();
  });

  it('ouvre une fenêtre chargée à la demande avant la fin du préchargement', async () => {
    // Copie neuve de l'app : aucun composant n'est encore préchargé
    vi.resetModules();
    const { default: FreshApp } = await import('../App');
    const user = userEvent.setup();
    render(<FreshApp />);
    await user.click(await screen.findByRole('button', { name: 'Skip' }));

    await user.click(screen.getByRole('button', { name: /Metronome/ }));
    expect((await screen.findAllByText('BPM')).length).toBeGreaterThan(0);
  });

  it('ouvre le métronome depuis l\'accueil', async () => {
    const { user } = await startApp();

    await user.click(screen.getByRole('button', { name: /Metronome/ }));
    expect(screen.getAllByText('BPM').length).toBeGreaterThan(0);
  });

  it('ouvre les badges, le rapport et la politique de confidentialité', async () => {
    const { user } = await startApp();

    await user.click(nav('Stats'));
    await user.click(screen.getByRole('button', { name: /See all badges/ }));
    expect(screen.getByRole('heading', { name: /All badges/ })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await user.click(screen.getByRole('button', { name: /Export my report/ }));
    expect(screen.getByRole('heading', { name: /Export report/ })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('heading', { name: /Export report/ })).toBeNull();

    await user.click(nav('Settings'));
    await user.click(screen.getByRole('button', { name: /Privacy Policy/ }));
    expect(screen.getByText('1. Data collection')).toBeTruthy();
  });
});
