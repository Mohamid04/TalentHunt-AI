import type { EmploymentType, JobMatch, ResumeAnalysis, WorkplaceMode } from './ai';

export type CandidatePreferences = {
  role: string;
  location: string;
  preferredWorkplace: WorkplaceMode | 'Any';
  preferredEmploymentType: EmploymentType | 'Any';
  minimumSalary: number;
};

export type MatchFactor = {
  key: string;
  label: string;
  score: number | null;
  weight: number;
  status: 'match' | 'partial' | 'gap' | 'unknown';
  explanation: string;
};

export type ExplainableJobMatch = JobMatch & {
  match: number;
  factors: MatchFactor[];
  matchedSkills: string[];
  missingSkills: string[];
  matchedPreferredTechnologies: string[];
  missingPreferredTechnologies: string[];
};

const weights = {
  skills: 20,
  technologies: 20,
  experience: 15,
  education: 8,
  title: 12,
  location: 7,
  salary: 6,
  employment: 4,
  workplace: 4,
  interests: 4,
} as const;

const keywordAliases: Record<string, string[]> = {
  'user experience': ['ux'],
  'user interface': ['ui'],
  'ui systems': ['design system', 'design systems', 'ui system'],
  'api development': ['api integration', 'rest api', 'rest apis', 'restful api'],
  'rest apis': ['rest api', 'restful api'],
};

export function matchJobToCandidate(job: JobMatch, profile: CandidatePreferences, resume: ResumeAnalysis, resumeText: string): ExplainableJobMatch {
  const allText = normalize([
    resumeText,
    profile.role,
    ...resume.skills,
    ...resume.education,
    ...resume.experience.flatMap((item) => [item.role, item.summary]),
    ...resume.internships,
    ...resume.projects,
    ...resume.certifications,
    ...resume.interests,
  ].join(' '));
  const findMatches = (items: string[]) => items.filter((item) => keywordMatches(allText, item));
  const matchedSkills = findMatches(job.requiredSkills);
  const matchedTechnologies = findMatches(job.requiredTechnologies);
  const matchedPreferredTechnologies = findMatches(job.preferredTechnologies);
  const missingSkills = [...job.requiredSkills.filter((item) => !matchedSkills.includes(item)), ...job.requiredTechnologies.filter((item) => !matchedTechnologies.includes(item))];

  const years = estimateExperienceYears(resume);
  const roleEvidence = normalize([...resume.experience.map((item) => `${item.role} ${item.summary}`), ...resume.internships, ...resume.projects].join(' '));
  const targetRoleText = normalize(profile.role);
  const roleTokens = meaningfulTokens(job.title);
  const roleMatches = roleTokens.filter((token) => contains(roleEvidence, token));
  const targetRoleMatches = roleTokens.filter((token) => contains(targetRoleText, token));
  const experienceScore = job.minimumExperienceYears === null
    ? null
    : years === null
      ? null
      : Math.round(Math.min(years / Math.max(job.minimumExperienceYears, 0.5), 1) * (roleMatches.length ? 100 : 70));

  const educationText = normalize(resume.education.join(' '));
  const matchedEducation = job.educationRequirements.filter((item) => contains(educationText, item));
  const matchedEducationEvidence = resume.education.filter((line) => job.educationRequirements.some((item) => keywordMatches(normalize(line), item)));
  const titleOverlap = roleTokens.length ? Math.round(((targetRoleMatches.length / roleTokens.length) * 0.6 + (roleMatches.length / roleTokens.length) * 0.4) * 100) : null;
  const locationScore = locationFit(profile.location, job.location, job.workplace);
  const salaryScore = salaryFit(profile.minimumSalary, job.salaryMin, job.salaryMax);
  const employmentScore = profile.preferredEmploymentType === 'Any' ? null : profile.preferredEmploymentType === job.employmentType ? 100 : 0;
  const workplaceScore = profile.preferredWorkplace === 'Any' ? null : profile.preferredWorkplace === job.workplace || job.workplace === 'Flexible' ? 100 : 0;
  const interestText = normalize([...resume.interests, profile.role].join(' '));
  const matchedInterests = job.interests.filter((interest) => hasTokenOverlap(interestText, normalize(interest)));

  const factors: MatchFactor[] = [
    factor('skills', 'Relevant skills', coverage(matchedSkills.length, job.requiredSkills.length), weights.skills, job.requiredSkills.length ? `${matchedSkills.length}/${job.requiredSkills.length} listed skills found: ${matchedSkills.join(', ') || 'none yet'}.` : 'No separate general-skill requirements listed.'),
    factor('technologies', 'Required technologies', coverage(matchedTechnologies.length, job.requiredTechnologies.length), weights.technologies, job.requiredTechnologies.length ? `${matchedTechnologies.length}/${job.requiredTechnologies.length} required technologies found: ${matchedTechnologies.join(', ') || 'none yet'}.` : 'No required technology keywords listed.'),
    factor('experience', 'Experience', experienceScore, weights.experience, years === null ? 'Experience dates or durations were not clear enough to estimate years.' : job.minimumExperienceYears === null ? 'No minimum experience duration is listed.' : `Estimated ${formatYears(years)} from listed role durations (overlap may occur); role asks for ${job.minimumExperienceYears}+ years${roleMatches.length ? ', with related role wording found.' : ', but related role wording is limited.'}`),
    factor('education', 'Education', job.educationRequirements.length ? matchedEducation.length > 0 ? 100 : 0 : null, weights.education, job.educationRequirements.length ? matchedEducation.length ? `Education requirement matched: ${matchedEducationEvidence.join('; ')}.` : `No listed education requirement was found (${job.educationRequirements.join(' or ')}).` : 'No formal education requirement listed.'),
    factor('title', 'Role & title', titleOverlap, weights.title, `Target role shares ${targetRoleMatches.length}/${roleTokens.length} title terms; experience text shares ${roleMatches.length}/${roleTokens.length}.`),
    factor('location', 'Location', locationScore, weights.location, locationExplanation(profile.location, job.location, locationScore)),
    factor('salary', 'Salary', salaryScore, weights.salary, salaryExplanation(profile.minimumSalary, job.salaryMin, job.salaryMax, salaryScore)),
    factor('employment', 'Employment type', employmentScore, weights.employment, profile.preferredEmploymentType === 'Any' ? 'No employment-type preference set.' : employmentScore ? `Matches your ${profile.preferredEmploymentType} preference.` : `This is ${job.employmentType}; your preference is ${profile.preferredEmploymentType}.`),
    factor('workplace', 'Work arrangement', workplaceScore, weights.workplace, profile.preferredWorkplace === 'Any' ? 'No remote/hybrid/on-site preference set.' : workplaceScore ? `Matches your ${profile.preferredWorkplace} preference.` : `This role is ${job.workplace}; your preference is ${profile.preferredWorkplace}.`),
    factor('interests', 'Career interests', coverage(matchedInterests.length, job.interests.length), weights.interests, job.interests.length ? `${matchedInterests.length}/${job.interests.length} interest areas overlap: ${matchedInterests.join(', ') || 'none detected'}.` : 'No interest tags listed for this role.'),
  ];

  const applicableFactors = factors.filter((item) => item.score !== null);
  const totalWeight = applicableFactors.reduce((sum, item) => sum + item.weight, 0);
  const match = totalWeight
    ? Math.round(applicableFactors.reduce((sum, item) => sum + (item.score ?? 0) * item.weight, 0) / totalWeight)
    : 0;

  return {
    ...job,
    match,
    factors,
    matchedSkills: [...matchedSkills, ...matchedTechnologies],
    missingSkills,
    matchedPreferredTechnologies,
    missingPreferredTechnologies: job.preferredTechnologies.filter((item) => !matchedPreferredTechnologies.includes(item)),
    reasons: factors.filter((item) => item.score !== null && item.score >= 70).map((item) => item.explanation),
    missing: factors.filter((item) => item.status === 'gap').map((item) => item.label),
  };
}

function factor(key: string, label: string, score: number | null, weight: number, explanation: string): MatchFactor {
  return {
    key,
    label,
    score,
    weight,
    explanation,
    status: score === null ? 'unknown' : score >= 70 ? 'match' : score >= 35 ? 'partial' : 'gap',
  };
}

function coverage(matched: number, total: number) {
  return total ? Math.round((matched / total) * 100) : 100;
}

export function estimateExperienceYears(resume: ResumeAnalysis): number | null {
  const durations = resume.experience.map((item) => parseDuration(item.tenure)).filter((value): value is number => value !== null);
  if (durations.length) return durations.reduce((sum, item) => sum + item, 0);
  return resume.experience.length ? null : null;
}

function parseDuration(value: string): number | null {
  const text = value.toLowerCase();
  const years = text.match(/(\d+(?:\.\d+)?)\s*years?/);
  const months = text.match(/(\d+(?:\.\d+)?)\s*months?/);
  const range = text.match(/\b(19\d{2}|20\d{2})\s*[-–]\s*(present|19\d{2}|20\d{2})\b/);
  if (years || months) return Number(years?.[1] ?? 0) + Number(months?.[1] ?? 0) / 12;
  if (range) return Math.max(0, ((range[2] === 'present' ? new Date().getFullYear() : Number(range[2])) - Number(range[1])));
  return null;
}

function locationFit(preferred: string, jobLocation: string, workplace: WorkplaceMode): number | null {
  if (!preferred.trim()) return null;
  const candidateLocation = normalize(preferred);
  const openingLocation = normalize(jobLocation);
  if (candidateLocation === openingLocation || openingLocation.includes(candidateLocation) || candidateLocation.includes(openingLocation)) return 100;
  if (workplace === 'Remote' && /united states|\bus\b/.test(openingLocation) && /united states|\bus\b|usa/.test(candidateLocation)) return 100;
  if (/remote|anywhere/.test(candidateLocation)) return workplace === 'Remote' || workplace === 'Flexible' ? 100 : 0;
  if (/united states|\bus\b|usa/.test(candidateLocation) && !/united states|\bus\b|usa/.test(openingLocation)) return 50;
  return 0;
}

function locationExplanation(preferred: string, location: string, score: number | null) {
  if (score === null) return 'Add a preferred location to compare this factor.';
  if (score >= 70) return `Location aligns with your preference (${preferred}) and this job (${location}).`;
  if (score >= 35) return `Your preference is ${preferred}; the role is listed in ${location}. Confirm commute or relocation expectations.`;
  return `Potential location conflict: preference is ${preferred}, job is listed in ${location}.`;
}

function salaryFit(minimum: number, jobMin: number, jobMax: number) {
  if (!minimum) return null;
  if (jobMin >= minimum) return 100;
  if (jobMax >= minimum) return 75;
  const shortfall = (minimum - jobMax) / minimum;
  return shortfall <= 0.1 ? 40 : 0;
}

function salaryExplanation(minimum: number, jobMin: number, jobMax: number, score: number | null) {
  if (score === null) return 'Set a minimum salary preference to compare compensation ranges.';
  if (score >= 100) return `Listed range ($${Math.round(jobMin / 1000)}k–$${Math.round(jobMax / 1000)}k) meets your $${Math.round(minimum / 1000)}k minimum.`;
  if (score >= 70) return `The listed range overlaps your $${Math.round(minimum / 1000)}k minimum; verify the final offer.`;
  if (score > 0) return `The range is close to, but below, your $${Math.round(minimum / 1000)}k minimum.`;
  return `Listed range ($${Math.round(jobMin / 1000)}k–$${Math.round(jobMax / 1000)}k) is below your $${Math.round(minimum / 1000)}k minimum.`;
}

function hasTokenOverlap(left: string, right: string) {
  if (!left || !right) return false;
  if (left.includes(right) || right.includes(left)) return true;
  const leftTokens = new Set(meaningfulTokens(left));
  return meaningfulTokens(right).some((token) => leftTokens.has(token));
}

function meaningfulTokens(value: string) {
  return normalize(value).split(/\s+/).filter((token) => token.length > 2 && !['the', 'and', 'for', 'with', 'engineer', 'developer'].includes(token));
}

function contains(text: string, value: string) {
  const term = normalize(value);
  return Boolean(term && text.includes(term));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();
}

function formatYears(years: number) {
  return `${Math.round(years * 10) / 10} year${years === 1 ? '' : 's'}`;
}

export function keywordMatches(text: string, keyword: string) {
  const normalizedText = normalize(text);
  if (contains(normalizedText, keyword)) return true;
  const aliases = keywordAliases[normalize(keyword)] ?? [];
  return aliases.some((alias) => contains(normalizedText, alias));
}