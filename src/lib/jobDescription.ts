import type { ResumeAnalysis } from './ai';
import { extractRecognizedSkills } from './resume';
import { estimateExperienceYears, keywordMatches } from './matching';

export type EducationCompatibility = {
  status: 'match' | 'possible' | 'missing' | 'not-specified';
  detail: string;
};

export type JobDescriptionReport = {
  title: string;
  overallCompatibility: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchingExperience: string[];
  missingExperience: string[];
  educationCompatibility: EducationCompatibility;
  importantKeywords: string[];
  recommendedImprovements: string[];
};

export function compareResumeToJobDescription(description: string, resume: ResumeAnalysis, resumeText: string, candidateRole = ''): JobDescriptionReport {
  const descriptionSkills = extractRecognizedSkills(description);
  const resumeSkillText = [resumeText, ...resume.skills, ...resume.experience.flatMap((item) => [item.role, item.summary]), ...resume.internships, ...resume.projects].join(' ').toLowerCase();
  const matchedSkills = descriptionSkills.filter((skill) => keywordMatches(resumeSkillText, skill));
  const missingSkills = descriptionSkills.filter((skill) => !matchedSkills.includes(skill));
  const title = getJobTitle(description);
  const titleTerms = meaningfulTerms(title);
  const experienceEvidence = [
    ...resume.experience.map((item) => `${item.role} · ${item.tenure}: ${item.summary}`),
    ...resume.internships.map((item) => `Internship: ${item}`),
    ...resume.projects.map((item) => `Project: ${item}`),
  ];
  const matchingExperience = experienceEvidence.filter((entry) => titleTerms.some((term) => keywordMatches(entry, term)) || descriptionSkills.some((skill) => keywordMatches(entry, skill)));

  const requestedYears = description.match(/\b(\d+(?:\.\d+)?)\s*\+?\s*years?\b/i);
  const yearsRequired = requestedYears ? Number(requestedYears[1]) : null;
  const yearsAvailable = estimateExperienceYears(resume);
  const missingExperience: string[] = [];
  if (yearsRequired !== null) {
    if (yearsAvailable === null) missingExperience.push(`The description asks for ${yearsRequired}+ years, but resume dates/durations aren’t clear enough to compare.`);
    else if (yearsAvailable < yearsRequired) missingExperience.push(`The description asks for ${yearsRequired}+ years; listed durations total about ${yearsAvailable.toFixed(1)} years (overlap may occur).`);
  }
  if (!matchingExperience.length && (resume.experience.length || resume.internships.length || resume.projects.length)) {
    missingExperience.push('No clearly related experience, internship, or project wording was detected for this description. Review for transferable evidence that is already true.');
  } else if (!resume.experience.length && !resume.internships.length && !resume.projects.length) {
    missingExperience.push('No work, internship, or project details are available to compare.');
  }

  const educationCompatibility = assessEducation(description, resume.education);
  const requiredLines = description.split(/\r?\n/).map((line) => line.trim()).filter((line) => /required|must have|minimum qualifications|preferred|qualifications/i.test(line));
  const extraTerms = requiredLines.flatMap((line) => meaningfulTerms(line)).filter((term) => !descriptionSkills.some((skill) => normalize(skill) === normalize(term)));
  const importantKeywords = [...new Set([...descriptionSkills, ...extraTerms])].slice(0, 18);

  const experienceScore = yearsRequired === null ? null : yearsAvailable === null ? null : Math.min(100, (yearsAvailable / Math.max(yearsRequired, 0.5)) * 100);
  const educationScore = educationCompatibility.status === 'not-specified' ? null : educationCompatibility.status === 'match' ? 100 : educationCompatibility.status === 'possible' ? 60 : 0;
  const titleScore = titleTerms.length ? Math.round((titleTerms.filter((term) => keywordMatches(resumeSkillText, term) || keywordMatches(candidateRole, term)).length / titleTerms.length) * 100) : null;
  const dimensions = [
    { weight: 45, score: descriptionSkills.length ? (matchedSkills.length / descriptionSkills.length) * 100 : null },
    { weight: 25, score: experienceScore },
    { weight: 15, score: educationScore },
    { weight: 15, score: titleScore },
  ].filter((item) => item.score !== null);
  const totalWeight = dimensions.reduce((sum, item) => sum + item.weight, 0);
  const overallCompatibility = totalWeight ? Math.round(dimensions.reduce((sum, item) => sum + (item.score ?? 0) * item.weight, 0) / totalWeight) : 0;

  const recommendedImprovements = [
    ...(missingSkills.length ? [`Build or verify experience with ${missingSkills.slice(0, 5).join(', ')}. Add these terms to the resume only after they accurately describe your skills.`] : []),
    ...missingExperience,
    ...(educationCompatibility.status === 'missing' ? ['Review whether the listed education requirement has an accepted equivalent; do not claim a credential you have not earned.'] : []),
    ...(importantKeywords.length ? ['Use relevant wording from the description where it truthfully matches your existing work, projects, or skills.'] : []),
  ];

  return {
    title,
    overallCompatibility,
    matchedSkills,
    missingSkills,
    matchingExperience,
    missingExperience,
    educationCompatibility,
    importantKeywords,
    recommendedImprovements: recommendedImprovements.length ? recommendedImprovements : ['Your resume has evidence for the detected requirements. Review the source details and tailor emphasis without changing the facts.'],
  };
}

function assessEducation(description: string, education: string[]): EducationCompatibility {
  const degreeTerms = description.match(/\b(?:bachelor(?:'s)?|b\.?s\.?|master(?:'s)?|m\.?s\.?|ph\.?d\.?|doctorate|associate(?:'s)? degree|degree|diploma)\b/gi) ?? [];
  const fieldTerms = description.match(/\b(?:computer science|computer engineering|software engineering|information technology|data science|mathematics|business administration)\b/gi) ?? [];
  if (!degreeTerms.length && !fieldTerms.length) return { status: 'not-specified', detail: 'No explicit education requirement was detected in this description.' };
  const educationText = education.join(' ').toLowerCase();
  const matchedFields = fieldTerms.filter((term) => educationText.includes(term.toLowerCase()));
  const degreeMatch = degreeTerms.some((term) => educationText.includes(term.toLowerCase()));
  if (degreeMatch && (!fieldTerms.length || matchedFields.length)) {
    return { status: 'match', detail: `Education text matches the listed credential/field${matchedFields.length ? `: ${matchedFields.join(', ')}` : ''}.` };
  }
  if (matchedFields.length) return { status: 'possible', detail: `A related field was detected (${matchedFields.join(', ')}); verify whether it meets the employer’s exact degree requirement.` };
  if (education.length && /equivalent|related field|or experience/i.test(description)) {
    return { status: 'possible', detail: 'The description allows an equivalent or related background; compare your actual education and experience with the employer’s criteria.' };
  }
  return { status: 'missing', detail: `No matching education requirement was detected in the listed education: ${education.join(', ') || 'none provided'}.` };
}

function getJobTitle(description: string) {
  const firstLine = description.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? '';
  const labeled = description.match(/(?:job description|job title|role|position|title)\s*:\s*([^\r\n]+)/i)?.[1];
  const candidate = (labeled ?? firstLine).replace(/^(job description|job title|role|position|title)\s*:\s*/i, '').trim();
  return candidate.length <= 100 ? candidate : 'Pasted job description';
}

function meaningfulTerms(value: string) {
  return normalize(value).split(/\s+/).filter((term) => term.length > 3 && !['must', 'have', 'with', 'from', 'that', 'this', 'years', 'experience', 'required', 'preferred', 'minimum', 'qualification', 'qualifications', 'requirement', 'requirements', 'ability', 'strong', 'excellent', 'responsibilities', 'skills', 'skill', 'work', 'role'].includes(term));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();
}

export function isJobDescriptionReport(value: unknown): value is JobDescriptionReport {
  if (!value || typeof value !== 'object') return false;
  const report = value as Record<string, unknown>;
  const education = report.educationCompatibility as Record<string, unknown> | undefined;
  const validEducationStatus = ['match', 'possible', 'missing', 'not-specified'].includes(String(education?.status));
  const stringList = (item: unknown) => Array.isArray(item) && item.every((entry) => typeof entry === 'string');
  return typeof report.overallCompatibility === 'number'
    && report.overallCompatibility >= 0
    && report.overallCompatibility <= 100
    && typeof report.title === 'string'
    && stringList(report.matchedSkills)
    && stringList(report.missingSkills)
    && stringList(report.matchingExperience)
    && stringList(report.missingExperience)
    && stringList(report.importantKeywords)
    && stringList(report.recommendedImprovements)
    && validEducationStatus
    && typeof education?.detail === 'string';
}