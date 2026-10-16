// @vitest-environment jsdom
// Tests de parcours : l'application complète est rendue dans un faux navigateur
// avec une base IndexedDB en mémoire. Ils servent de filet de sécurité pour les refontes.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clear, get, set } from 'idb-keyval';
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
