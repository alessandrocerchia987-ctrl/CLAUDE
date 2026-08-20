const { getBaseUrl } = require('./requestContext');

function absoluteUrl(relativeOrAbsolute) {
  if (!relativeOrAbsolute) return null;
  if (/^https?:\/\//i.test(relativeOrAbsolute)) return relativeOrAbsolute;
  return `${getBaseUrl()}${relativeOrAbsolute}`;
}

function parseListField(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Shapes a user row for API responses. `viewerId` controls whether the
// phone number is included (self always sees it; others only if unlocked,
// handled by caller passing includePhone).
function serializeUser(user, { includePhone = false } = {}) {
  if (!user) return null;
  const base = {
    id: user.id,
    accountType: user.account_type,
    name: user.name,
    age: user.age,
    gender: user.gender,
    location: user.location,
    photoUrl: absoluteUrl(user.photo_url),
    bio: user.bio,
    verified: !!user.verified,
    createdAt: user.created_at,
    lastActiveAt: user.last_active_at,
    phone: includePhone ? user.phone : null,
    phoneLocked: !includePhone,
  };

  if (user.account_type === 'employee') {
    return {
      ...base,
      profession: user.profession,
      yearsExperience: user.years_experience,
      experienceDescription: user.experience_description,
      educationLevel: user.education_level,
      languages: parseListField(user.languages),
      skills: parseListField(user.skills),
      availability: user.availability,
      expectedSalary: user.expected_salary,
      portfolio: user.portfolio,
    };
  }

  return {
    ...base,
    companyName: user.company_name,
    lookingFor: user.looking_for,
    requirements: user.requirements,
    payOffered: user.pay_offered,
    companyDescription: user.company_description,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function serializeJob(job, employer) {
  let expired = false;
  let daysRemaining = null;
  if (job.expires_at) {
    const msRemaining = Date.parse(`${job.expires_at.replace(' ', 'T')}Z`) - Date.now();
    expired = msRemaining <= 0;
    daysRemaining = Math.max(0, Math.ceil(msRemaining / DAY_MS));
  }

  return {
    id: job.id,
    title: job.title,
    sector: job.sector,
    location: job.location,
    payText: job.pay_text,
    payAmount: job.pay_amount,
    availability: job.availability,
    requirements: job.requirements,
    photoUrl: absoluteUrl(job.photo_url),
    featured: !!job.featured,
    active: !!job.active,
    createdAt: job.created_at,
    expiresAt: job.expires_at,
    expired,
    daysRemaining,
    employerId: job.employer_id,
    employer: employer
      ? {
          id: employer.id,
          name: employer.company_name || employer.name,
          photoUrl: absoluteUrl(employer.photo_url),
          verified: !!employer.verified,
          location: employer.location,
        }
      : null,
  };
}

function serializeNotification(n) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data ? JSON.parse(n.data) : null,
    read: !!n.read,
    createdAt: n.created_at,
  };
}

function serializeStory(story, user) {
  return {
    id: story.id,
    caption: story.caption,
    photoUrl: absoluteUrl(story.photo_url),
    createdAt: story.created_at,
    expiresAt: story.expires_at,
    user: user
      ? {
          id: user.id,
          name: user.account_type === 'employer' ? user.company_name || user.name : user.name,
          photoUrl: absoluteUrl(user.photo_url),
          accountType: user.account_type,
          verified: !!user.verified,
        }
      : null,
  };
}

module.exports = {
  absoluteUrl,
  parseListField,
  serializeUser,
  serializeJob,
  serializeNotification,
  serializeStory,
};
