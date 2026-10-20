// @vitest-environment jsdom
// Tests de parcours : l'application complète est rendue dans un faux navigateur
// avec une base IndexedDB en mémoire. Ils servent de filet de sécurité pour les refontes.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen, within, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clear, get, keys, set } from 'idb-keyval';
import App from '../App';
import { preloadLazyComponents } from '../utils/lazyWithPreload';
import { handleBackButton } from '../hooks/useBackHandler';

// Lecteur de tablatures : alphaTab ne peut pas dessiner ni jouer de son dans jsdom ; une version
// factice enregistre ce que le lecteur lui demande (le vrai rendu se vérifie sur l'appareil)
vi.mock('@coderline/alphatab', () => {
  const emitter = () => {
    const handlers = [];
    return { on: (handler) => handlers.push(handler), off() {}, emit: (...args) => handlers.forEach(h => h(...args)) };
  };
  class AlphaTabApi {
    constructor(element, settings) {
      this.initialSettings = settings;
      this.settings = { display: { staveProfile: settings.display.staveProfile } };
      this.calls = [];
      this.score = null;
      for (const name of ['scoreLoaded', 'renderFinished', 'playerReady', 'playerStateChanged',
        'playerPositionChanged', 'playbackRangeHighlightChanged', 'error']) {
        this[name] = emitter();
      }
      globalThis.__fakeAlphaTab = this;
    }
    load(bytes, tracks) {
      this.loaded = { bytes, tracks };
      const score = { title: 'Test song', artist: 'Tester', tracks: [{ name: 'Guitar' }, { name: 'Bass' }] };
      this.score = score;
      setTimeout(() => {
        this.scoreLoaded.emit(score);
        this.renderFinished.emit({});
        this.playerReady.emit();
        this.playerPositionChanged.emit({ currentTime: 0, endTime: 125000 });
      });
      return true;
    }
    playPause() { this.calls.push('playPause'); this.playerStateChanged.emit({ state: 1 }); }
    stop() { this.calls.push('stop'); }
    updateSettings() { this.calls.push('updateSettings'); }
    render() { this.calls.push('render'); }
    renderTracks(tracks) { this.renderedTracks = tracks; }
    clearPlaybackRangeHighlight() { this.calls.push('clearPlaybackRangeHighlight'); }
    destroy() { this.destroyed = true; }
  }
  return { AlphaTabApi, synth: { PlayerState: { Paused: 0, Playing: 1 } } };
});

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
      // Fichier d'un autre type (le sélecteur Android ne filtre pas) : refusé avec un message
      const uploader = userEvent.setup({ applyAccept: false });
      await uploader.upload(within(form).getByLabelText('Score or tab'), new File(['hello'], 'notes.txt', { type: 'text/plain' }));
      expect(await screen.findByText(/This format isn't supported/)).toBeTruthy();
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

  it('ajoute un morceau à une session, le travaille pendant la session puis corrige la session', async () => {
    await set('mmc_pieces', [{
      id: 1, title: 'Romance', artist: 'Anonymous', status: 'learning', reminder: true, reminderSince: '2026-10-01',
      addedAt: '2026-10-01', reviewStage: 0, tempoHistory: [],
    }]);
    const { user, container } = await startApp();
    const field = (name) => container.querySelector(`[name="${name}"]`);

    // Nouvelle session : un exercice et le morceau
    await user.click(nav('Library'));
    await user.click(screen.getByRole('button', { name: 'Sessions' }));
    await user.click(screen.getByRole('button', { name: 'Create a session' }));
    await user.type(field('name'), 'Piece routine');
    await user.type(field('duration'), '20 min');
    await user.type(field('category'), 'Pieces');
    await user.click(screen.getByRole('checkbox', { name: /Technical warm-up/ }));
    await user.click(screen.getByRole('checkbox', { name: /Romance/ }));
    await user.click(screen.getByRole('button', { name: /Create session/ }));
    const workouts = await stored('mmc_workouts', (list) => list?.some(w => w.name === 'Piece routine'));
    expect(workouts.find(w => w.name === 'Piece routine')).toMatchObject({ exercises: [1], pieces: [1] });
    expect(await screen.findByText('1 piece')).toBeTruthy();

    // Session : l'exercice validé, le morceau travaillé
    await user.click(screen.getByRole('button', { name: 'Start session Piece routine' }));
    expect(screen.getByRole('heading', { name: 'Repertoire pieces' })).toBeTruthy();
    expect(screen.getByText('0/2 done')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'View details' }));
    await user.click(screen.getByRole('button', { name: 'Validate exercise' }));
    // La fiche de l'exercice peut rester ouverte après validation
    const exerciseDialog = screen.queryByRole('dialog');
    if (exerciseDialog) await user.click(within(exerciseDialog).getByRole('button', { name: '← Back' }));
    expect(screen.getByRole('button', { name: 'Finish session' }).disabled).toBe(true);

    // La fiche du morceau s'ouvre par-dessus la session
    await user.click(screen.getByRole('button', { name: 'Open piece Romance' }));
    expect(screen.getByRole('dialog', { name: 'Romance' })).toBeTruthy();
    await user.click(within(screen.getByRole('dialog', { name: 'Romance' })).getByRole('button', { name: 'Close' }));

    await user.click(screen.getByRole('button', { name: /Practiced/ }));
    expect(screen.getByRole('button', { name: /Practiced/ }).getAttribute('aria-pressed')).toBe('true');
    const duration = container.querySelector('#session-duration');
    await user.clear(duration);
    await user.type(duration, '30');
    await user.click(screen.getByRole('button', { name: 'Finish session' }));

    const history = await stored('mmc_sessionHistory', (h) => h?.length === 1);
    expect(history[0]).toMatchObject({
      completed: 2, skipped: 0, total: 2, durationMinutes: 30,
      exerciseProgress: { 1: 'completed' }, pieceProgress: { 1: 'completed' },
    });
    // Le morceau a été travaillé aujourd'hui : son rappel repart de là
    await stored('mmc_pieces', (list) => list?.[0]?.lastPracticedAt === '2026-10-12');

    // Fiche du morceau : sa part de la session (exercice 5 min, morceau compté 10 min -> 20 min sur 30)
    await user.click(nav('Library'));
    await user.click(screen.getByRole('button', { name: 'Repertoire' }));
    await user.click(screen.getByRole('button', { name: /Romance/ }));
    expect(within(screen.getByRole('dialog', { name: 'Romance' })).getByText('20 min')).toBeTruthy();
    await user.click(within(screen.getByRole('dialog', { name: 'Romance' })).getByRole('button', { name: 'Close' }));

    // Correction depuis l'historique : le morceau finalement passé
    await user.click(nav('Stats'));
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    expect(screen.getByRole('heading', { name: 'Edit session' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Practiced/ }).getAttribute('aria-pressed')).toBe('true');
    await user.click(screen.getByRole('button', { name: /Skipped/ }));
    await user.click(screen.getByRole('button', { name: /Save changes/ }));
    const edited = await stored('mmc_sessionHistory', (h) => h?.[0]?.pieceProgress?.[1] === 'skipped');
    expect(edited[0]).toMatchObject({ completed: 1, skipped: 1, exerciseProgress: { 1: 'completed' } });

    // Morceau supprimé du répertoire : retiré de la session
    await user.click(nav('Library'));
    await user.click(screen.getByRole('button', { name: 'Repertoire' }));
    await user.click(screen.getByRole('button', { name: /Romance/ }));
    await user.click(within(screen.getByRole('dialog', { name: 'Romance' })).getByRole('button', { name: 'Delete' }));
    await stored('mmc_workouts', (list) => list?.find(w => w.name === 'Piece routine')?.pieces.length === 0);
  });

  it("joue avec l'enregistrement audio et la vidéo YouTube d'un morceau", async () => {
    // Fausse API YouTube : position de lecture réglable, appels enregistrés
    const players = [];
    window.YT = {
      Player: class {
        constructor(element, options) {
          this.options = options;
          this.time = 42;
          this.rates = [];
          this.seeks = [];
          element.replaceWith(document.createElement('iframe'));
          players.push(this);
          setTimeout(() => options.events.onReady({ target: this }));
        }
        getCurrentTime() { return this.time; }
        setPlaybackRate(rate) { this.rates.push(rate); }
        seekTo(seconds) { this.seeks.push(seconds); }
        destroy() {}
      },
    };
    try {
      const { user } = await startApp();
      await user.click(nav('Library'));
      await user.click(screen.getByRole('button', { name: 'Repertoire' }));
      await user.click(screen.getByRole('button', { name: 'New piece' }));
      const form = screen.getByRole('dialog', { name: 'New piece' });
      await user.type(within(form).getByLabelText(/Title/), 'Blackbird');

      // Enregistrement : seulement un fichier audio
      const uploader = userEvent.setup({ applyAccept: false });
      await uploader.upload(within(form).getByLabelText('Audio recording'), new File(['x'], 'tab.gp5'));
      expect(await screen.findByText(/Choose an audio file/)).toBeTruthy();
      await user.upload(within(form).getByLabelText('Audio recording'), new File([new Uint8Array([1, 2])], 'backing.mp3', { type: 'audio/mpeg' }));
      expect(await within(form).findByText(/backing\.mp3/)).toBeTruthy();
      await user.type(within(form).getByLabelText(/^Link/), 'https://youtu.be/dQw4w9WgXcQ?t=30');
      await user.click(within(form).getByRole('button', { name: /Add piece/ }));
      const pieces = await stored('mmc_pieces', (list) => list?.length === 1 && !!list[0].audio);
      expect(pieces[0].audio.name).toBe('backing.mp3');

      // Fiche : lecteur audio
      await user.click(await screen.findByRole('button', { name: /Blackbird/ }));
      const detail = screen.getByRole('dialog', { name: 'Blackbird' });
      const recording = await within(detail).findByRole('region', { name: 'Recording' });
      expect(within(recording).getByText('backing.mp3')).toBeTruthy();
      await user.click(within(recording).getByRole('button', { name: 'Play recording' }));
      expect(within(recording).getByRole('button', { name: 'Pause' })).toBeTruthy();
      await user.selectOptions(within(recording).getByLabelText('Speed'), '0.75');
      expect(recording.querySelector('audio').playbackRate).toBe(0.75);

      // Fiche : vidéo YouTube intégrée, ralentie, avec une boucle A-B
      const video = within(detail).getByRole('region', { name: 'YouTube video' });
      await waitFor(() => expect(within(video).getByLabelText('Speed').disabled).toBe(false));
      const player = players[0];
      expect(player.options).toMatchObject({ videoId: 'dQw4w9WgXcQ', playerVars: { start: 30 } });
      await user.selectOptions(within(video).getByLabelText('Speed'), '0.5');
      expect(player.rates).toEqual([0.5]);
      await user.click(within(video).getByRole('button', { name: 'Loop start (A)' }));
      player.time = 50;
      await user.click(within(video).getByRole('button', { name: 'Loop end (B)' }));
      expect(within(video).getByText('Loop 0:42 → 0:50')).toBeTruthy();
      expect(player.seeks).toEqual([42]);

      // Modification : l'enregistrement retiré est supprimé
      await user.click(within(detail).getByRole('button', { name: 'Edit' }));
      const editForm = screen.getByRole('dialog', { name: 'Edit piece' });
      await user.click(within(editForm).getByRole('button', { name: 'Remove recording' }));
      await user.click(within(editForm).getByRole('button', { name: /Save changes/ }));
      await stored('mmc_pieces', (list) => list?.length === 1 && !list[0].audio);
      await waitFor(async () => {
        expect((await keys()).filter(key => String(key).startsWith('mmc_file_'))).toEqual([]);
      });
    } finally {
      delete window.YT;
    }
  });

  it("le retour d'Android ferme la fenêtre ouverte la plus récente", async () => {
    const { user } = await startApp();
    const back = () => act(() => handleBackButton());

    // Formulaire de morceau fermé par le retour, sans rien enregistrer
    await user.click(nav('Library'));
    await user.click(screen.getByRole('button', { name: 'Repertoire' }));
    await user.click(screen.getByRole('button', { name: 'New piece' }));
    expect(screen.getByRole('dialog', { name: 'New piece' })).toBeTruthy();
    await back();
    expect(screen.queryByRole('dialog', { name: 'New piece' })).toBeNull();

    // Fiche d'un morceau, puis lecteur ouvert depuis la fiche : le lecteur se ferme d'abord
    await user.click(screen.getByRole('button', { name: 'New piece' }));
    const form = screen.getByRole('dialog', { name: 'New piece' });
    await user.type(within(form).getByLabelText(/Title/), 'Back song');
    await user.upload(within(form).getByLabelText('Score or tab'), new File([new Uint8Array([1])], 'song.gp5', { type: 'application/octet-stream' }));
    expect(await within(form).findByText(/song\.gp5/)).toBeTruthy();
    await user.click(within(form).getByRole('button', { name: /Add piece/ }));
    await user.click(await screen.findByRole('button', { name: /Back song/ }));
    const detail = screen.getByRole('dialog', { name: 'Back song' });
    await user.click(await within(detail).findByRole('button', { name: 'Open tab' }));
    expect(await screen.findByRole('heading', { name: 'Test song' })).toBeTruthy();

    await back();
    expect(screen.queryByRole('heading', { name: 'Test song' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Back song' })).toBeTruthy();
    await back();
    expect(screen.queryByRole('dialog', { name: 'Back song' })).toBeNull();

    // Plus aucune fenêtre : le retour est laissé à l'app (accueil, puis arrière-plan)
    expect(handleBackButton()).toBe(false);
  });

  describe('lecteur de tablatures', () => {
    it('ouvre un fichier depuis les Outils et transmet les réglages de lecture', async () => {
      const { user } = await startApp();

      await user.click(screen.getByRole('button', { name: /Tab player/ }));
      const player = screen.getByRole('dialog', { name: 'Tab player' });
      expect(within(player).getByText(/Open a Guitar Pro tab/)).toBeTruthy();

      const gp = new File([new Uint8Array([1, 2, 3])], 'song.gp5', { type: 'application/octet-stream' });
      await user.upload(within(player).getByLabelText('Choose a file'), gp);

      // Morceau chargé : titre, artiste, pistes
      expect(await screen.findByRole('heading', { name: 'Test song' })).toBeTruthy();
      const api = globalThis.__fakeAlphaTab;
      expect([...api.loaded.bytes]).toEqual([1, 2, 3]);
      // Tablature seule par défaut, fichiers servis par l'app, curseur et défilement
      expect(api.initialSettings.display.staveProfile).toBe('tab');
      expect(api.initialSettings.player.soundFont).toMatch(/alphatab\/soundfont\/sonivox\.sf3$/);
      expect(api.initialSettings.core.fontDirectory).toMatch(/alphatab\/font\/$/);
      expect(api.initialSettings.player.enableCursor).toBe(true);
      expect(await screen.findByText('0:00 / 2:05')).toBeTruthy();

      // Commandes (dans la fenêtre du lecteur)
      const inPlayer = within(screen.getByRole('dialog', { name: 'Test song' }));
      await user.click(inPlayer.getByRole('button', { name: 'Play' }));
      expect(api.calls).toContain('playPause');
      expect(inPlayer.getByRole('button', { name: 'Pause' })).toBeTruthy();

      await user.selectOptions(inPlayer.getByLabelText('Playback speed'), '0.75');
      expect(api.playbackSpeed).toBe(0.75);

      await user.click(inPlayer.getByRole('button', { name: /Loop/ }));
      expect(api.isLooping).toBe(true);
      expect(inPlayer.getByText(/drag your finger to choose a passage/)).toBeTruthy();

      await user.click(inPlayer.getByRole('button', { name: /Metronome/ }));
      expect(api.metronomeVolume).toBe(1);
      await user.click(inPlayer.getByRole('button', { name: /Count-in/ }));
      expect(api.countInVolume).toBe(1);

      await user.click(inPlayer.getByRole('button', { name: /Notation/ }));
      expect(api.settings.display.staveProfile).toBe('scoretab');
      expect(api.calls).toEqual(expect.arrayContaining(['updateSettings', 'render']));

      await user.selectOptions(inPlayer.getByLabelText('Track'), '1');
      expect(api.renderedTracks).toEqual([api.score.tracks[1]]);

      // Fermeture : le lecteur est libéré
      await user.click(within(screen.getByRole('dialog', { name: 'Test song' })).getByRole('button', { name: 'Close' }));
      expect(api.destroyed).toBe(true);
    });

    it("ouvre la tablature jointe à un morceau, mais pas un PDF", async () => {
      await set('mmc_file_tab', { name: 'riff.gp', data: 'data:application/octet-stream;base64,BAUG', createdAt: 1 });
      await set('mmc_file_pdf', { name: 'score.pdf', data: 'data:application/pdf;base64,AA==', createdAt: 1 });
      await set('mmc_pieces', [
        { id: 1, title: 'Riff', status: 'learning', attachment: { id: 'tab', name: 'riff.gp' }, tempoHistory: [] },
        { id: 2, title: 'Paper', status: 'learning', attachment: { id: 'pdf', name: 'score.pdf' }, tempoHistory: [] },
      ]);
      const { user } = await startApp();
      await user.click(nav('Library'));
      await user.click(screen.getByRole('button', { name: 'Repertoire' }));

      await user.click(screen.getByText('Paper'));
      expect(await screen.findByRole('link', { name: 'Download PDF' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: /Open tab/ })).toBeNull();
      await user.click(within(screen.getByRole('dialog', { name: 'Paper' })).getByRole('button', { name: 'Close' }));

      await user.click(screen.getByText('Riff'));
      await user.click(await screen.findByRole('button', { name: /Open tab/ }));
      expect(await screen.findByRole('heading', { name: 'Test song' })).toBeTruthy();
      expect([...globalThis.__fakeAlphaTab.loaded.bytes]).toEqual([4, 5, 6]);
    });

    it("signale un fichier illisible", async () => {
      const { user } = await startApp();
      await user.click(screen.getByRole('button', { name: /Tab player/ }));
      // Le prochain chargement échoue
      const { AlphaTabApi } = await import('@coderline/alphatab');
      const originalLoad = AlphaTabApi.prototype.load;
      AlphaTabApi.prototype.load = function () { setTimeout(() => this.error.emit(new Error('format inconnu'))); return false; };
      try {
        await user.upload(screen.getByLabelText('Choose a file'), new File(['xx'], 'broken.gp', { type: 'application/octet-stream' }));
        expect((await screen.findByRole('alert')).textContent).toMatch(/Can't open this file/);
      } finally {
        AlphaTabApi.prototype.load = originalLoad;
      }
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
