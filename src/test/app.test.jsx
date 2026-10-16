// @vitest-environment jsdom
// Tests de parcours : l'application complète est rendue dans un faux navigateur
// avec une base IndexedDB en mémoire. Ils servent de filet de sécurité pour les refontes.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clear, get } from 'idb-keyval';
import App from '../App';

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

  it('change la langue', async () => {
    const { user } = await startApp();

    await user.click(nav('Settings'));
    await user.selectOptions(screen.getByRole('combobox'), 'fr');

    expect(await screen.findByRole('heading', { name: 'Réglages' })).toBeTruthy();
    expect(nav('Accueil')).toBeTruthy();
    await user.click(nav('Accueil'));
    expect(screen.getByText('Routine Débutant')).toBeTruthy();
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
