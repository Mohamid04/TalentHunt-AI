import type { JobMatch, ResumeAnalysis, RoadmapPhase, SkillGapItem } from './ai';
import { keywordMatches } from './matching';

type SkillBucket = SkillGapItem['bucket'];

const learningGuides: Record<string, Omit<SkillGapItem, 'name' | 'bucket'>> = {
  'Node.js': { why: 'Listed as a required technology for this role; backend JavaScript supports server-side application features.', difficulty: 'Medium', estimate: '2–3 weeks', sequence: 'Start with runtime basics, modules, async/await, and error handling; then connect a small API.', project: 'Build a small task API with validated CRUD endpoints and tests.' },
  'Express.js': { why: 'Common route and middleware framework that can support the role’s API work; preferred rather than mandatory here.', difficulty: 'Medium', estimate: '1–2 weeks', sequence: 'Learn routing and middleware, then validation, error handling, and tests.', project: 'Add authenticated routes and input validation to a sample REST service.' },
  MongoDB: { why: 'Listed as a preferred document database for this role; learn it if it aligns with your target teams.', difficulty: 'Medium', estimate: '10–14 days', sequence: 'Practice document modeling and CRUD, then indexes and basic aggregation.', project: 'Model and query sample profiles and saved roles with a few focused indexes.' },
  Docker: { why: 'Listed as a preferred deployment technology; it can help package and run the example application consistently.', difficulty: 'Medium', estimate: 'About 1 week', sequence: 'Learn images and containers, then write a Dockerfile and a simple compose setup.', project: 'Containerize a small API and document local run steps.' },
  'System Design': { why: 'A useful optional topic for discussing trade-offs and service boundaries; not a required keyword in this role.', difficulty: 'Hard', estimate: '3–4 weeks', sequence: 'Start with API boundaries and data flows, then scaling, caching, and reliability basics.', project: 'Sketch a job-search service architecture and explain the trade-offs.' },
  'API development': { why: 'Explicitly listed as a required capability. Show evidence through a real API, integration, or project if you have one.', difficulty: 'Medium', estimate: '2–3 weeks', sequence: 'Review HTTP and REST fundamentals, then validation, status codes, error handling, and tests.', project: 'Build or document a small REST API using a language you already know.' },
  'End-to-end delivery': { why: 'The role asks for end-to-end delivery. Connect relevant UI, data, and service work only when supported by your experience.', difficulty: 'Medium', estimate: '2–4 weeks', sequence: 'Map one user flow, then implement or document each layer and a basic test.', project: 'Create a small feature from UI through API and persistence, or document a verified example.' },
  'UI systems': { why: 'This required role skill usually involves reusable interface patterns and consistent components.', difficulty: 'Medium', estimate: '1–2 weeks', sequence: 'Audit repeated UI patterns, define tokens, then compose and document reusable components.', project: 'Build a small accessible component set with usage examples.' },
  'Responsive design': { why: 'This required skill helps interfaces remain usable across screen sizes.', difficulty: 'Easy–Medium', estimate: 'About 1 week', sequence: 'Practice fluid layout, breakpoints, keyboard access, and testing narrow viewports.', project: 'Make one existing page work on phone, tablet, and desktop; note what changed.' },
  'Product analytics': { why: 'This is a required product skill; start with clear user outcomes and responsible event measurement.', difficulty: 'Medium', estimate: '1–2 weeks', sequence: 'Define a product question, choose minimal events, then interpret a small sample funnel.', project: 'Write an event plan and sample funnel analysis for a portfolio app.' },
  'User experience': { why: 'This required skill includes understanding user needs and usability; UI or product-design work may provide related evidence.', difficulty: 'Medium', estimate: '2–3 weeks', sequence: 'Practice task flows and usability reviews, then apply findings to a small iteration.', project: 'Run a small usability review and document observed issues and changes.' },
  GraphQL: { why: 'Listed as a required technology for this role.', difficulty: 'Medium', estimate: '1–2 weeks', sequence: 'Learn schemas and queries, then resolvers, errors, and client integration.', project: 'Expose a small read-only project catalog through a GraphQL endpoint.' },
  'REST APIs': { why: 'Listed as a required technology for this role.', difficulty: 'Easy–Medium', estimate: '1–2 weeks', sequence: 'Review resources, HTTP methods, status codes, validation, and API documentation.', project: 'Design and test a concise REST API for a small app.' },
  AWS: { why: 'This is a preferred cloud platform for the role. Learn deployment basics only if they fit your goals.', difficulty: 'Medium', estimate: '2–4 weeks', sequence: 'Start with cloud concepts and one service; add permissions and deployment practices carefully.', project: 'Deploy a small application using a low-cost/free-tier plan and document cleanup.' },
  'Cloud deployment': { why: 'Preferred role topic for delivering software to a cloud environment.', difficulty: 'Medium', estimate: '2–4 weeks', sequence: 'Learn build artifacts, environment configuration, deployment, logging, and rollback basics.', project: 'Write a deployment guide and deploy a non-sensitive demo application.' },
  'Design systems': { why: 'A useful adjacent skill for reusable UI work; treat it as optional unless the job description requires it.', difficulty: 'Medium', estimate: '1–2 weeks', sequence: 'Organize tokens, component variants, accessibility states, and concise usage documentation.', project: 'Document a small accessible button, form, and navigation component set.' },
};

const roleNiceToHaves: Record<string, string[]> = {
  frontend: ['Design systems', 'Accessibility'],
  'full stack': ['System Design', 'CI/CD'],
  product: ['Product analytics', 'Accessibility'],
};

export type PersonalizedSkillGaps = {
  targetRole: string;
  currentSkills: string[];
  mustLearn: SkillGapItem[];
  recommended: SkillGapItem[];
  niceToHave: SkillGapItem[];
};

export function analyzeSkillGaps(job: JobMatch, resume: ResumeAnalysis, resumeText: string): PersonalizedSkillGaps {
  const evidence = [
    resumeText,
    ...resume.skills,
    ...resume.skillCategories.languages,
    ...resume.skillCategories.frameworks,
    ...resume.skillCategories.tools,
    ...resume.experience.flatMap((item) => [item.role, item.summary]),
    ...resume.internships,
    ...resume.projects,
    ...resume.certifications,
  ].join(' ').toLowerCase();
  const required = unique([...job.requiredSkills, ...job.requiredTechnologies]);
  const preferred = unique(job.preferredTechnologies);
  const missingRequired = required.filter((skill) => !keywordMatches(evidence, skill));
  const missingPreferred = preferred.filter((skill) => !keywordMatches(evidence, skill));
  const extraNiceToHave = Object.entries(roleNiceToHaves)
    .filter(([role]) => job.title.toLowerCase().includes(role))
    .flatMap(([, skills]) => skills)
    .filter((skill) => !required.some((item) => sameSkill(item, skill)) && !preferred.some((item) => sameSkill(item, skill)) && !keywordMatches(evidence, skill));

  return {
    targetRole: job.title,
    currentSkills: unique([...resume.skills, ...resume.skillCategories.languages, ...resume.skillCategories.frameworks, ...resume.skillCategories.tools]),
    mustLearn: missingRequired.map((skill) => makeGap(skill, 'Must Learn')),
    recommended: missingPreferred.map((skill) => makeGap(skill, 'Recommended')),
    niceToHave: unique(extraNiceToHave).map((skill) => makeGap(skill, 'Nice to Have')),
  };
}

function makeGap(name: string, bucket: SkillBucket): SkillGapItem {
  const guide = learningGuides[name] ?? {
    why: `This ${bucket === 'Must Learn' ? 'required' : bucket === 'Recommended' ? 'preferred' : 'optional'} role skill was not detected in the resume text. Confirm the job’s requirement and assess whether it fits your career goals.`,
    difficulty: 'Varies',
    estimate: 'Estimate varies by prior experience',
    sequence: 'Start with the official fundamentals, then practice a small task relevant to this target role.',
    project: `Build or document a small ${name} example. Keep it within your current experience and describe it accurately.`,
  };
  return { name, bucket, ...guide };
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalize(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sameSkill(left: string, right: string) {
  return normalize(left) === normalize(right);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();
}

export function buildCareerRoadmap(job: JobMatch, resume: ResumeAnalysis, resumeText: string): RoadmapPhase[] {
  const plan = analyzeSkillGaps(job, resume, resumeText);
  const currentFoundation = plan.currentSkills.length
    ? `Strengthen ${plan.currentSkills.slice(0, 3).join(', ')}`
    : 'Establish your current skills';
  const requiredSkills = plan.mustLearn.map((item) => item.name);
  const firstLearningBlock = requiredSkills.slice(0, 2).join(' + ') || 'Core role requirements';
  const secondLearningBlock = [...requiredSkills.slice(2), ...plan.recommended.map((item) => item.name)].slice(0, 3).join(' + ') || 'Role-specific practice';
  const project = plan.mustLearn[0]?.project ?? plan.recommended[0]?.project ?? `Build a portfolio project for ${job.title}.`;

  return [
    { phase: 'Phase 1', title: currentFoundation, completed: false },
    { phase: 'Phase 2', title: `Learn ${firstLearningBlock}`, completed: false },
    { phase: 'Phase 3', title: `Practice ${secondLearningBlock}`, completed: false },
    { phase: 'Phase 4', title: `Build proof for ${job.title}`, completed: false },
    { phase: 'Phase 5', title: `Prepare for ${job.title} interviews`, completed: false },
    { phase: 'Phase 6', title: `Apply to ${job.title} roles`, completed: false },
  ].map((step, index) => ({
    ...step,
    completed: index === 0 ? plan.currentSkills.length > 0 : false,
    ...(index === 3 ? { title: `${step.title}: ${project}` } : {}),
  }));
}