const db = require('../db');
const { notifyUser } = require('./push');

const WARNING_WINDOW_DAYS = 5;

// Pushes a one-time "5 days left" notification to the employer for every
// active job that has just entered its final WARNING_WINDOW_DAYS days
// before expiry. expiry_warning_sent prevents re-notifying on later runs.
async function notifyExpiringJobs() {
  const jobs = db
    .prepare(
      `SELECT id, employer_id, title FROM jobs
       WHERE active = 1
         AND expiry_warning_sent = 0
         AND expires_at > datetime('now')
         AND expires_at <= datetime('now', '+${WARNING_WINDOW_DAYS} days')`
    )
    .all();

  if (jobs.length === 0) return;

  for (const job of jobs) {
    await notifyUser(job.employer_id, {
      type: 'job_expiring_soon',
      title: 'A sua vaga expira em breve',
      body: `Faltam ${WARNING_WINDOW_DAYS} dias para a vaga "${job.title}" expirar. Publique novamente para continuar a receber candidaturas.`,
      data: { jobId: job.id },
    });
    db.prepare('UPDATE jobs SET expiry_warning_sent = 1 WHERE id = ?').run(job.id);
  }
  console.log(`[notify] sent expiry warning for ${jobs.length} job(s)`);
}

function startJobExpiryWarningSchedule(intervalMs = 60 * 60 * 1000) {
  notifyExpiringJobs().catch((err) => console.error('[notify] initial run failed:', err));
  setInterval(() => {
    notifyExpiringJobs().catch((err) => console.error('[notify] scheduled run failed:', err));
  }, intervalMs);
}

module.exports = { notifyExpiringJobs, startJobExpiryWarningSchedule };
