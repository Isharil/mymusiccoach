import { describe, it, expect } from 'vitest';
import {
  changePieceStatus, duePieces, isPieceDue, nextReminderDate, piecePracticeSummary, recordPiecePractice,
  REVIEW_INTERVALS_DAYS
} from './repertoire';
import { parseLocalDate } from './practiceStats';

const today = parseLocalDate('2026-10-20');
const piece = (fields) => ({ id: 1, title: 'Spain', status: 'learning', addedAt: '2026-10-01', ...fields });

describe('rappels', () => {
  it("ne rappelle rien si l'utilisateur ne l'a pas demandé", () => {
    expect(nextReminderDate(piece({ lastPracticedAt: '2026-10-01' }))).toBeNull();
    expect(isPieceDue(piece({ lastPracticedAt: '2026-10-01' }), today)).toBe(false);
  });

  it('rappelle un morceau en cours tous les 2 jours après la dernière séance', () => {
    expect(nextReminderDate(piece({ reminder: true, lastPracticedAt: '2026-10-18' }))).toBe('2026-10-20');
    expect(isPieceDue(piece({ reminder: true, lastPracticedAt: '2026-10-18' }), today)).toBe(true);
    expect(isPieceDue(piece({ reminder: true, lastPracticedAt: '2026-10-19' }), today)).toBe(false);
  });

  it("part de l'activation du rappel si le morceau n'a jamais été travaillé", () => {
    expect(nextReminderDate(piece({ reminder: true, reminderSince: '2026-10-19' }))).toBe('2026-10-21');
  });

  it('espace les révisions d\'un morceau maîtrisé', () => {
    const mastered = (reviewStage) => piece({ status: 'mastered', reminder: true, lastPracticedAt: '2026-10-01', reviewStage });
    expect(nextReminderDate(mastered(0))).toBe('2026-10-04');
    expect(nextReminderDate(mastered(2))).toBe('2026-10-15');
    expect(nextReminderDate(mastered(99))).toBe('2027-01-29'); // plafonné à 120 jours
  });

  it('liste les morceaux à travailler, du plus en retard au plus récent', () => {
    const list = [
      piece({ id: 1, reminder: true, lastPracticedAt: '2026-10-17' }),
      piece({ id: 2, reminder: true, lastPracticedAt: '2026-10-10' }),
      piece({ id: 3, reminder: true, lastPracticedAt: '2026-10-20' }),
      piece({ id: 4, lastPracticedAt: '2026-10-01' }),
    ];
    expect(duePieces(list, today).map(p => p.id)).toEqual([2, 1]);
  });
});

describe('séances et révisions', () => {
  it('note la date de la séance', () => {
    expect(recordPiecePractice(piece({}), { date: '2026-10-20' })).toMatchObject({ lastPracticedAt: '2026-10-20', status: 'learning' });
  });

  it('allonge l\'intervalle quand un morceau maîtrisé est toujours au point', () => {
    const updated = recordPiecePractice(piece({ status: 'mastered', reviewStage: 1 }), { date: '2026-10-20', stillMastered: true });
    expect(updated).toMatchObject({ status: 'mastered', reviewStage: 2 });
    const top = recordPiecePractice(piece({ status: 'mastered', reviewStage: REVIEW_INTERVALS_DAYS.length - 1 }), { date: '2026-10-20', stillMastered: true });
    expect(top.reviewStage).toBe(REVIEW_INTERVALS_DAYS.length - 1);
  });

  it('repasse un morceau en cours quand il est à retravailler', () => {
    expect(recordPiecePractice(piece({ status: 'mastered', reviewStage: 3 }), { date: '2026-10-20', stillMastered: false }))
      .toMatchObject({ status: 'learning', reviewStage: 0 });
  });

  it('remet les révisions à zéro quand le statut change', () => {
    expect(changePieceStatus(piece({ status: 'learning', reviewStage: 2 }), 'mastered')).toMatchObject({ status: 'mastered', reviewStage: 0 });
    const same = piece({ status: 'mastered', reviewStage: 2 });
    expect(changePieceStatus(same, 'mastered')).toBe(same);
  });

  it('additionne le temps passé sur le morceau', () => {
    const history = [
      { pieceId: 1, durationMinutes: 20 }, { pieceId: 2, durationMinutes: 99 },
      { pieceId: 1, durationMinutes: 15 }, { workoutId: 3, durationMinutes: 30 },
    ];
    expect(piecePracticeSummary(1, history)).toEqual({ minutes: 35, sessions: 2 });
  });
});
