import { escapeHtml } from './html';
import { formatMinutes } from './practiceTime';
import { normalizeDate, parseLocalDate, toLocalDateStr } from './practiceStats';

/**
 * Génère le rapport de progression HTML (à imprimer en PDF) pour les `weeks` dernières semaines.
 * @returns {{ html: string, fileName: string }}
 */
export const buildProgressReport = ({ weeks, sessionHistory, exercises, settings, t, exerciseName, formatDisplayDate }) => {
  // Calculer la date limite selon la période choisie (X derniers jours)
  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));
  cutoffDate.setHours(0, 0, 0, 0); // Début de journée pour inclure toute la journée

  // Filtrer les sessions par période
  const filteredSessions = sessionHistory
    .filter(session => parseLocalDate(session.date) >= cutoffDate)
    .reverse();

  // Libellé de la période
  const periodLabel = t('report.lastDays', { count: weeks * 7 });

  // Créer le contenu du rapport
  // Calculer les stats pour la période
  const sessionsCount = filteredSessions.length;
  const uniqueDaysWithPractice = new Set(filteredSessions.map(s => s.date)).size;
  const periodMinutes = filteredSessions.reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);

  // Calculer le meilleur streak sur la période sélectionnée
  const periodDays = weeks * 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const uniqueDates = [...new Set(sessionHistory.map(s => normalizeDate(s.date)))];

  // Créer un tableau des jours de la période avec un booléen pour chaque jour pratiqué
  const periodDaysSessions = [];
  for (let i = 0; i < periodDays; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = toLocalDateStr(checkDate);
    periodDaysSessions.push(uniqueDates.includes(dateStr));
  }

  // Trouver le meilleur streak sur la période
  let bestStreakInPeriod = 0;
  let currentStreakCount = 0;
  for (let i = 0; i < periodDaysSessions.length; i++) {
    if (periodDaysSessions[i]) {
      currentStreakCount++;
      if (currentStreakCount > bestStreakInPeriod) {
        bestStreakInPeriod = currentStreakCount;
      }
    } else {
      currentStreakCount = 0;
    }
  }

  const reportData = {
    userName: settings.userName,
    date: new Date().toLocaleDateString(settings.language || 'en', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    periodLabel,
    stats: {
      sessionsCount,
      streak: bestStreakInPeriod,
      daysWithPractice: uniqueDaysWithPractice,
      minutes: periodMinutes
    },
    recentSessions: filteredSessions,
    exercisesWithProgress: exercises.filter(ex => ex.tempoHistory && ex.tempoHistory.length > 0)
  };

  const formatDate = (dateStr) => formatDisplayDate(dateStr);
  // Textes traduits insérés dans le HTML
  const tr = (key, params) => escapeHtml(t(key, params));

  // Créer le document HTML pour le PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="${escapeHtml(settings.language || 'en')}">
    <head>
      <meta charset="UTF-8">
      <title>${tr('report.title')} - ${escapeHtml(reportData.userName)}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
        }
        .print-button {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #9333EA;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
        }
        .print-button:hover {
          background: #7C3AED;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #9333EA;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #9333EA;
          margin: 0;
          font-size: 32px;
        }
        .header p {
          color: #666;
          margin: 5px 0;
        }
        .section {
          margin: 30px 0;
          page-break-inside: avoid;
        }
        .section h2 {
          color: #9333EA;
          border-bottom: 2px solid #E9D5FF;
          padding-bottom: 10px;
          font-size: 24px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .stat-card {
          background: #F3F4F6;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        }
        .stat-card h3 {
          font-size: 36px;
          margin: 0;
          color: #9333EA;
        }
        .stat-card p {
          margin: 5px 0 0 0;
          color: #666;
          font-size: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        th {
          background: #9333EA;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: bold;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #E5E7EB;
        }
        tr:hover {
          background: #F9FAFB;
        }
        .progress-bar {
          background: #E5E7EB;
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
          margin: 5px 0;
        }
        .progress-fill {
          background: linear-gradient(to right, #9333EA, #7C3AED);
          height: 100%;
          transition: width 0.3s;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
        }
        .badge-success {
          background: #D1FAE5;
          color: #065F46;
        }
        .badge-warning {
          background: #FEF3C7;
          color: #92400E;
        }
        .observation-card {
          background: #FFFBEB;
          border: 1px solid #F59E0B;
          border-radius: 8px;
          padding: 15px;
          margin: 10px 0;
        }
        .observation-card .date {
          font-size: 12px;
          color: #92400E;
          margin-bottom: 5px;
        }
        .observation-card .exercise-name {
          font-weight: bold;
          color: #9333EA;
          margin-bottom: 8px;
        }
        .observation-card .note-text {
          color: #333;
          font-style: italic;
          background: white;
          padding: 10px;
          border-radius: 6px;
          border-left: 3px solid #F59E0B;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #999;
          font-size: 12px;
          border-top: 1px solid #E5E7EB;
          padding-top: 20px;
        }
        .instructions {
          background: #EFF6FF;
          border: 2px solid #3B82F6;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
        }
        .instructions h3 {
          color: #1E40AF;
          margin-top: 0;
        }
        .instructions ol {
          color: #1E3A8A;
          margin: 10px 0;
          padding-left: 20px;
        }
      </style>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()">
        🖨️ ${tr('report.printSave')} (Ctrl+P)
      </button>

      <div class="instructions no-print">
        <h3>📋 ${tr('report.howToTitle')}</h3>
        <ol>
          <li>${tr('report.howToStep1')}</li>
          <li>${tr('report.howToStep2')}</li>
          <li>${tr('report.howToStep3')}</li>
          <li>${tr('report.howToStep4')}</li>
        </ol>
      </div>

      <div class="header">
        <h1>📊 ${tr('report.title')}</h1>
        <p><strong>${escapeHtml(reportData.userName)}</strong></p>
        <p>${escapeHtml(reportData.date)}</p>
        <p style="color: #9333EA; font-weight: bold;">${tr('report.period')} : ${escapeHtml(reportData.periodLabel)}</p>
      </div>

      <div class="section">
        <h2>📈 ${tr('report.periodStats')}</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h3>${reportData.stats.sessionsCount}</h3>
            <p>${tr('report.sessionsPracticed')}</p>
          </div>
          <div class="stat-card">
            <h3>${reportData.stats.streak}</h3>
            <p>${tr('report.bestStreak')}</p>
          </div>
          <div class="stat-card">
            <h3>${reportData.stats.daysWithPractice}</h3>
            <p>${tr('report.daysWithPractice')}</p>
          </div>
          <div class="stat-card">
            <h3>${escapeHtml(formatMinutes(reportData.stats.minutes))}</h3>
            <p>${tr('practice.title')}</p>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>📅 ${tr('report.sessionHistory')} (${escapeHtml(reportData.periodLabel)})</h2>
        <table>
          <thead>
            <tr>
              <th>${tr('report.colDate')}</th>
              <th>${tr('report.colSession')}</th>
              <th>${tr('report.colCompleted')}</th>
              <th>${tr('report.colSkipped')}</th>
              <th>${tr('report.colTotal')}</th>
              <th>${tr('report.colDuration')}</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.recentSessions.map(session => `
              <tr>
                <td>${escapeHtml(formatDate(session.date))} ${escapeHtml(session.time)}</td>
                <td><strong>${escapeHtml(session.workoutName)}</strong></td>
                <td><span class="badge badge-success">${Number(session.completed) || 0}</span></td>
                <td>${session.skipped > 0 ? `<span class="badge badge-warning">${Number(session.skipped)}</span>` : '-'}</td>
                <td>${Number(session.total) || 0}</td>
                <td>${session.durationMinutes ? escapeHtml(formatMinutes(session.durationMinutes)) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${(() => {
        const sessionsWithNotes = reportData.recentSessions.filter(s => s.notes && Object.keys(s.notes).length > 0);
        if (sessionsWithNotes.length === 0) return '';
        return `
      <div class="section">
        <h2>📝 ${tr('report.observations')}</h2>
        ${sessionsWithNotes.map(session => {
          const noteEntries = Object.entries(session.notes);
          return noteEntries.map(([exId, note]) => {
            const exercise = exercises.find(e => e.id === parseInt(exId));
            const name = exercise ? exerciseName(exercise) : t('report.unknownExercise');
            return `
            <div class="observation-card">
              <div class="date">📅 ${escapeHtml(formatDate(session.date))} ${escapeHtml(session.time)} — ${escapeHtml(session.workoutName)}</div>
              <div class="exercise-name">🎵 ${escapeHtml(name)}</div>
              <div class="note-text">${escapeHtml(note)}</div>
            </div>
            `;
          }).join('');
        }).join('')}
      </div>
        `;
      })()}

      ${reportData.exercisesWithProgress.length > 0 ? `
      <div class="section">
        <h2>📊 ${tr('report.tempoProgress')}</h2>
        <table>
          <thead>
            <tr>
              <th>${tr('report.colExercise')}</th>
              <th>${tr('report.colBaseTempo')}</th>
              <th>${tr('report.colLastTempo')}</th>
              <th>${tr('report.colProgress')}</th>
              <th>${tr('report.colRecords')}</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.exercisesWithProgress.map(ex => {
              const lastTempo = ex.tempoHistory[ex.tempoHistory.length - 1];
              const firstTempo = ex.tempoHistory[0];
              const progression = lastTempo.tempo - firstTempo.tempo;
              return `
                <tr>
                  <td><strong>${escapeHtml(exerciseName(ex))}</strong></td>
                  <td>${Number(ex.baseTempo) || 0} BPM</td>
                  <td>${Number(lastTempo.tempo) || 0} BPM</td>
                  <td style="color: ${progression >= 0 ? '#059669' : '#DC2626'};">
                    ${progression >= 0 ? '+' : ''}${progression} BPM
                  </td>
                  <td>${ex.tempoHistory.length}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="footer">
        <p>${tr('report.footer1')}</p>
        <p>${tr('report.footer2')}</p>
      </div>
    </body>
    </html>
  `;

  // Nom du fichier proposé
  const fileName = `${t('report.filePrefix')}_${reportData.userName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;

  return { html: htmlContent, fileName };
};
