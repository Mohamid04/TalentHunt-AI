import type { JobMatch, ResumeAnalysis } from './ai';
import { keywordMatches } from './matching';

export type AtsStructureCheck = { label: string; present: boolean; note: string };
export type AtsKeyword = { keyword: string; kind: 'Required' | 'Preferred' };
export type AtsReport = {
  score: number;
  scoreLabel: string;
  wordCount: number;
  structure: AtsStructureCheck[];
  missingKeywords: AtsKeyword[];
  weakSections: string[];
  formattingIssues: string[];
  skillRelevance: { percent: number; matched: string[]; missing: string[] };
  experienceRelevance: { percent: number | null; note: string };
  suggestions: string[];
};

const standardSectionPatterns: Record<string, RegExp> = {
  Summary: /\b(summary|professional profile|career objective|about me)\b/i,
  Skills: /\b(skills|technical skills|core competencies|technologies)\b/i,
  Experience: /\b(experience|employment|work history|professional background)\b/i,
  Education: /\b(education|academic background|qualifications)\b/i,
  Projects: /\b(projects|selected work|portfolio)\b/i,
  Certifications: /\b(certifications|licenses|credentials)\b/i,
};

export function analyzeAtsCompatibility(text: string, analysis: ResumeAnalysis, job: JobMatch): AtsReport {
  const normalizedText = text.toLowerCase();
  const normalizedSkills = analysis.skills.map(normalize);
  const hasKeyword = (keyword: string) => keywordMatches(normalizedText, keyword) || normalizedSkills.some((skill) => keywordMatches(skill, keyword));
  const matched = [...new Set([...job.requiredSkills, ...job.requiredTechnologies].filter(hasKeyword))];
  const missingRequired = [...new Set([...job.requiredSkills, ...job.requiredTechnologies])]
    .filter((keyword) => !hasKeyword(keyword))
    .map((keyword) => ({ keyword, kind: 'Required' as const }));
  const missingPreferred = job.preferredTechnologies.filter((keyword) => !hasKeyword(keyword))
    .map((keyword) => ({ keyword, kind: 'Preferred' as const }));

  const structure: AtsStructureCheck[] = [
    { label: 'Name', present: Boolean(analysis.name.trim()), note: analysis.name ? 'A name was detected.' : 'No name was detected in the resume text.' },
    { label: 'Contact details', present: Boolean(analysis.contact.trim()), note: analysis.contact ? 'Contact information was detected.' : 'Add a professional email and phone number if appropriate.' },
    { label: 'Professional summary', present: standardSectionPatterns.Summary.test(text), note: standardSectionPatterns.Summary.test(text) ? 'A summary/profile heading was detected.' : 'A concise professional summary is optional, but can help establish relevance quickly.' },
    { label: 'Skills', present: analysis.skills.length > 0, note: analysis.skills.length ? `${analysis.skills.length} known skills were detected.` : 'No recognized skills were detected.' },
    { label: 'Experience', present: analysis.experience.length > 0, note: analysis.experience.length ? `${analysis.experience.length} role lines were detected.` : 'No work experience entries were detected.' },
    { label: 'Education', present: analysis.education.length > 0, note: analysis.education.length ? `${analysis.education.length} education lines were detected.` : 'No education lines were detected.' },
    { label: 'Projects', present: analysis.projects.length > 0, note: analysis.projects.length ? `${analysis.projects.length} project-related lines were detected.` : 'Projects are optional; include relevant work if you have it.' },
    { label: 'Certifications', present: analysis.certifications.length > 0, note: analysis.certifications.length ? `${analysis.certifications.length} credential lines were detected.` : 'Certifications are optional; do not add any you have not earned.' },
  ];

  const sectionHeadingCount = Object.values(standardSectionPatterns).filter((pattern) => pattern.test(text)).length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const longLines = text.split(/\r?\n/).filter((line) => line.trim().length > 180).length;
  const bulletLines = text.split(/\r?\n/).filter((line) => /^\s*(?:[-*•▪]|\d+[.)])\s+/.test(line)).length;
  const quantifiedEvidence = /\b\d+(?:\.\d+)?\s*(?:%|percent\b|users\b|customers\b|hours\b|days\b|weeks\b|months\b|years\b|k\+?\b|million\b)/i.test(text);

  const weakSections = structure.filter((item) => !item.present && ['Professional summary', 'Skills', 'Experience', 'Education'].includes(item.label)).map((item) => item.label);
  const formattingIssues: string[] = [];
  if (sectionHeadingCount < 3) formattingIssues.push('Few standard section headings were detected; use clear headings such as Skills, Experience, and Education.');
  if (longLines > 0) formattingIssues.push(`${longLines} unusually long line${longLines === 1 ? '' : 's'} may be harder to scan; consider concise bullets.`);
  if (analysis.experience.length > 0 && bulletLines === 0) formattingIssues.push('No bullet-formatted lines were detected; concise bullets can improve readability.');
  if (wordCount > 0 && wordCount < 150) formattingIssues.push('The extracted resume is very short; confirm that no sections were omitted during parsing.');
  if (wordCount > 1200) formattingIssues.push('The extracted resume is lengthy; prioritize the most relevant details.');
  if (text.includes('\uFFFD')) formattingIssues.push('Replacement characters were found in extracted text; check for encoding or PDF extraction issues.');
  if (formattingIssues.length === 0) formattingIssues.push('No obvious text-level formatting issues were detected. Visual layout cannot be verified from extracted text.');

  const relevantTokens = [...job.requiredSkills, ...job.requiredTechnologies].map(normalize).filter((token) => token.length > 2);
  const experienceText = [...analysis.experience.map((item) => `${item.role} ${item.summary}`), ...analysis.internships, ...analysis.projects].join(' ').toLowerCase();
  const relevantExperienceKeywords = relevantTokens.filter((token) => keywordMatches(experienceText, token));
  const experienceRelevance = analysis.experience.length || analysis.internships.length || analysis.projects.length
    ? {
        percent: relevantTokens.length ? Math.round((relevantExperienceKeywords.length / relevantTokens.length) * 100) : null,
        note: relevantExperienceKeywords.length
          ? `${relevantExperienceKeywords.length} target-role skill keyword${relevantExperienceKeywords.length === 1 ? '' : 's'} also appear in experience, internship, or project text.`
          : 'Experience or project entries were detected, but none of the selected role keywords were found in their text. Review for relevant work without adding unsupported claims.',
      }
    : { percent: null, note: 'Add your real work, internship, or project history to assess experience relevance.' };

  const requiredKeywordCount = job.requiredSkills.length + job.requiredTechnologies.length;
  const keywordScore = requiredKeywordCount ? (matched.length / requiredKeywordCount) * 100 : 50;
  const digitsInContact = analysis.contact.replace(/\D/g, '').length;
  const contactScore = (analysis.name ? 34 : 0) + (analysis.contact.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i) ? 33 : 0) + (digitsInContact >= 8 ? 33 : 0);
  const requiredSections = structure.filter((item) => ['Name', 'Contact details', 'Skills', 'Experience', 'Education'].includes(item.label));
  const structureScore = (requiredSections.filter((item) => item.present).length / requiredSections.length) * 100;
  const formattingScore = Math.max(0, 100 - formattingIssues.filter((issue) => !issue.startsWith('No obvious')).length * 18);
  const evidenceScore = quantifiedEvidence ? 100 : (analysis.achievements.length ? 70 : 35);
  const score = Math.round(contactScore * 0.15 + structureScore * 0.25 + keywordScore * 0.3 + formattingScore * 0.15 + evidenceScore * 0.15);

  const suggestions = [
    ...(!analysis.contact.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i) ? ['Add a professional email address to the contact section.'] : []),
    ...weakSections.map((section) => `Add a clearly labeled ${section.toLowerCase()} section if you have relevant, accurate information.`),
    ...(missingRequired.length ? ['Review missing role keywords and include them only when your experience genuinely supports them.'] : []),
    ...(!quantifiedEvidence ? ['Where accurate, describe outcomes with real numbers or observable results; never invent metrics.'] : []),
    ...(formattingIssues.some((issue) => issue.includes('bullet-formatted')) ? ['Use concise, easy-to-scan bullets for experience and projects.'] : []),
  ];

  return {
    score,
    scoreLabel: score >= 80 ? 'Strong text match' : score >= 60 ? 'Good foundation' : 'Needs review',
    wordCount,
    structure,
    missingKeywords: [...missingRequired, ...missingPreferred],
    weakSections,
    formattingIssues,
    skillRelevance: {
      percent: requiredKeywordCount ? Math.round((matched.length / requiredKeywordCount) * 100) : 0,
      matched,
      missing: missingRequired.map((item) => item.keyword),
    },
    experienceRelevance,
    suggestions: suggestions.length ? suggestions : ['Keep the content accurate and tailor its emphasis to the selected role.'],
  };
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();
}