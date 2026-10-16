import { describe, it, expect } from 'vitest';
import { isReminderId, planReminders, REMINDER_BASE_ID, REMINDER_DAYS } from './reminders';
import { toLocalDateStr } from './practiceStats';

const workouts = [{ id: 1, name: 'Routine' }, { id: 2, name: 'Blues' }];
// Cycle commençant le lundi 12 octobre 2026 ; semaine 1 : lundi -> 1, mercredi -> 1 et 2
const weeklySchedule = {
  semaine1: { lundi: [1], mardi: [], mercredi: [1, 2], jeudi: [], vendredi: [], samedi: [], dimanche: [] },
  semaine2: { lundi: [], mardi: [], mercredi: [], jeudi: [], vendredi: [], samedi: [], dimanche: [] },
  semaine3: { lundi: [], mardi: [], mercredi: [], jeudi: [], vendredi: [], samedi: [], dimanche: [] },
  semaine4: { lundi: [], mardi: [], mercredi: [], jeudi: [], vendredi: [], samedi: [], dimanche: [] },
};
const emptySchedule = Object.fromEntries(Object.keys(weeklySchedule).map(k => [k, {}]));
const base = { time: '18:30', weeklySchedule, workouts, cycleStartDate: '2026-10-12', sessionHistory: [] };
const dates = (reminders) => reminders.map(r => toLocalDateStr(r.at));

describe('planReminders', () => {
  it('ne prévoit un rappel que les jours avec une session, à l\'heure choisie', () => {
    const reminders = planReminders({ ...base, now: new Date(2026, 9, 12, 9, 0) });
    // Lundi 12, mercredi 14, puis la semaine 1 du cycle suivant (lundi 9 et mercredi 11 novembre : hors des 28 jours)
    expect(dates(reminders)).toEqual(['2026-10-12', '2026-10-14']);
    expect(reminders[0].at.getHours()).toBe(18);
    expect(reminders[0].at.getMinutes()).toBe(30);
    expect(reminders[1].workouts.map(w => w.name)).toEqual(['Routine', 'Blues']);
    expect(reminders[0].id).toBe(REMINDER_BASE_ID);
    expect(reminders[1].id).toBe(REMINDER_BASE_ID + 2);
  });

  it("saute le rappel du jour si l'heure est passée", () => {
    expect(dates(planReminders({ ...base, now: new Date(2026, 9, 12, 19, 0) }))).toEqual(['2026-10-14']);
  });

  it('saute le rappel du jour quand les sessions prévues sont faites', () => {
    const now = new Date(2026, 9, 14, 9, 0); // mercredi : sessions 1 et 2
    const one = [{ date: '2026-10-14', workoutId: 1 }];
    expect(dates(planReminders({ ...base, now, sessionHistory: one }))[0]).toBe('2026-10-14');
    const both = [...one, { date: '2026-10-14', workoutId: 2 }];
    expect(dates(planReminders({ ...base, now, sessionHistory: both }))).not.toContain('2026-10-14');
  });

  it('sans planning, prévoit un rappel chaque jour, sauf aujourd\'hui si on a déjà pratiqué', () => {
    const now = new Date(2026, 9, 12, 9, 0);
    const daily = planReminders({ ...base, weeklySchedule: emptySchedule, now });
    expect(daily).toHaveLength(REMINDER_DAYS);
    const practiced = planReminders({ ...base, weeklySchedule: emptySchedule, now, sessionHistory: [{ date: '2026-10-12', free: true }] });
    expect(practiced).toHaveLength(REMINDER_DAYS - 1);
    expect(dates(practiced)[0]).toBe('2026-10-13');
  });

  it('ignore les sessions supprimées du planning', () => {
    const reminders = planReminders({ ...base, workouts: [], now: new Date(2026, 9, 12, 9, 0) });
    expect(reminders).toHaveLength(REMINDER_DAYS); // plus aucune session existante : comme sans planning
  });
});

describe('isReminderId', () => {
  it('reconnaît les rappels, y compris l\'ancien rappel quotidien', () => {
    expect(isReminderId(1)).toBe(true);
    expect(isReminderId(REMINDER_BASE_ID + 5)).toBe(true);
    expect(isReminderId(100)).toBe(false); // notification de fin de session
    expect(isReminderId(REMINDER_BASE_ID + REMINDER_DAYS)).toBe(false);
  });
});
