export type ResumeAnalysis = {
  name: string;
  contact: string;
  education: string[];
  skills: string[];
  skillCategories: { languages: string[]; frameworks: string[]; tools: string[] };
  experience: Array<{ role: string; tenure: string; summary: string }>;
  internships: string[];
  projects: string[];
  certifications: string[];
  achievements: string[];
  interests: string[];
  atsScore: number;
};

export type WorkplaceMode = 'Remote' | 'Hybrid' | 'On-site' | 'Flexible';
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
export type ExperienceLevel = 'Entry' | 'Mid' | 'Senior';
export type JobSource = 'platform' | 'external';

export type JobMatch = {
  title: string;
  company: string;
  location: string;
  match: number;
  salary: string;
  salaryMin: number;
  salaryMax: number;
  currency: 'USD';
  employmentType: EmploymentType;
  workplace: WorkplaceMode;
  experienceLevel: ExperienceLevel;
  minimumExperienceYears: number | null;
  postedDaysAgo: number;
  description: string;
  sourceType: JobSource;
  sourceName: string;
  applyUrl?: string;
  educationRequirements: string[];
  requiredSkills: string[];
  requiredTechnologies: string[];
  preferredTechnologies: string[];
  interests: string[];
  tags: string[];
  reasons: string[];
  missing: string[];
};

export type SkillGapItem = {
  name: string;
  bucket: 'Must Learn' | 'Recommended' | 'Nice to Have';
  why: string;
  difficulty: string;
  estimate: string;
  sequence: string;
  project: string;
};

export type RoadmapPhase = {
  phase: string;
  title: string;
  completed: boolean;
};

export type InterviewSet = {
  technical: string[];
  hr: string[];
  project: string[];
  jobSpecific: string[];
};

export const aiService = {
  analyzeResume: (): ResumeAnalysis => ({
    name: 'Aarav Mehta',
    contact: 'aarav.mehta.dev@gmail.com • +1 (415) 555-0142',
    education: ['B.Tech in Computer Science, IIT Delhi', 'AWS Cloud Practitioner'],
    skills: ['Python', 'JavaScript', 'React', 'TypeScript', 'SQL', 'Node.js', 'REST APIs'],
    skillCategories: {
      languages: ['Python', 'JavaScript', 'TypeScript', 'SQL'],
      frameworks: ['React', 'Node.js'],
      tools: ['REST APIs'],
    },
    experience: [
      {
        role: 'Frontend Engineer Intern',
        tenure: '6 months',
        summary: 'Built responsive dashboards and improved conversion by 18% using React and TypeScript.',
      },
      {
        role: 'Web Developer',
        tenure: '1 year',
        summary: 'Developed SEO-friendly landing pages and integrated analytics-driven UX improvements.',
      },
    ],
    internships: ['Frontend Engineer Intern · 6 months'],
    projects: [
      'TalentHUNT AI career platform prototype',
      'Smart Attendance Analytics dashboard',
      'AI-powered resume feedback tool',
    ],
    certifications: ['Google UX Design', 'AWS Cloud Practitioner'],
    achievements: ['Improved conversion by 18% through dashboard enhancements.'],
    interests: ['Full-stack product engineering', 'AI-powered career tools', 'Remote-first SaaS'],
    atsScore: 92,
  }),

  getJobMatches: (): JobMatch[] => [
    {
      title: 'Frontend Engineer',
      company: 'Northstar Labs',
      location: 'United States',
      match: 88,
      salary: '$120k - $145k',
      salaryMin: 120000,
      salaryMax: 145000,
      currency: 'USD',
      employmentType: 'Full-time',
      workplace: 'Remote',
      experienceLevel: 'Entry',
      minimumExperienceYears: 1,
      postedDaysAgo: 2,
      description: 'Build accessible product interfaces, partner with design and backend teams, and improve user experiences through reliable React components and responsive layouts.',
      sourceType: 'platform',
      sourceName: 'TalentHUNT sample board',
      educationRequirements: ['computer science', 'software engineering'],
      requiredSkills: ['UI systems', 'responsive design'],
      requiredTechnologies: ['React', 'TypeScript'],
      preferredTechnologies: ['Node.js', 'AWS'],
      interests: ['frontend', 'product engineering', 'user interface'],
      tags: ['React', 'TypeScript', 'UI Systems'],
      reasons: ['React matched', 'TypeScript matched', 'Portfolio aligns with product work', 'Remote preference supported'],
      missing: ['Node.js', 'Design system ownership', 'AWS experience'],
    },
    {
      title: 'Full Stack Developer',
      company: 'AstraWorks',
      location: 'New York, NY',
      match: 84,
      salary: '$115k - $138k',
      salaryMin: 115000,
      salaryMax: 138000,
      currency: 'USD',
      employmentType: 'Full-time',
      workplace: 'Hybrid',
      experienceLevel: 'Mid',
      minimumExperienceYears: 2,
      postedDaysAgo: 5,
      description: 'Own features across the application stack, design and integrate APIs, and collaborate with product teams to ship maintainable web services.',
      sourceType: 'external',
      sourceName: 'AstraWorks Careers · sample feed',
      educationRequirements: ['computer science', 'software engineering'],
      requiredSkills: ['end-to-end delivery', 'API development'],
      requiredTechnologies: ['Node.js', 'React', 'SQL'],
      preferredTechnologies: ['Docker', 'Express.js', 'MongoDB'],
      interests: ['full stack', 'product engineering', 'web applications'],
      tags: ['Node.js', 'React', 'SQL'],
      reasons: ['Python and JavaScript experience align', 'SQL matched', 'B.Tech requirement matched', 'Projects support end-to-end delivery'],
      missing: ['Docker', 'Express.js', 'MongoDB'],
    },
    {
      title: 'Product Engineer',
      company: 'Signal Forge',
      location: 'Austin, TX',
      match: 79,
      salary: '$110k - $130k',
      salaryMin: 110000,
      salaryMax: 130000,
      currency: 'USD',
      employmentType: 'Full-time',
      workplace: 'On-site',
      experienceLevel: 'Mid',
      minimumExperienceYears: 2,
      postedDaysAgo: 11,
      description: 'Connect product analytics, APIs, and user experience. Work with a cross-functional team to test and deliver improvements to a data-informed product.',
      sourceType: 'external',
      sourceName: 'Signal Forge Careers · sample feed',
      educationRequirements: [],
      requiredSkills: ['product analytics', 'user experience'],
      requiredTechnologies: ['REST APIs', 'GraphQL'],
      preferredTechnologies: ['system design', 'cloud deployment'],
      interests: ['product', 'analytics', 'user experience'],
      tags: ['Analytics', 'UX', 'API'],
      reasons: ['Strong UX background', 'API integration experience', 'Product thinking evident'],
      missing: ['GraphQL', 'System design', 'Cloud deployment'],
    },
  ],

  getSkillGaps: (): SkillGapItem[] => [
    {
      name: 'Node.js',
      bucket: 'Must Learn',
      why: 'Required to build server-side application logic and APIs for full stack roles.',
      difficulty: 'Medium',
      estimate: '2-3 weeks',
      sequence: 'Learn async patterns, modules, and Express integration first.',
      project: 'Build a task management API with authentication and CRUD operations.',
    },
    {
      name: 'Express.js',
      bucket: 'Must Learn',
      why: 'Framework knowledge is critical for route handling, middleware, and API structure.',
      difficulty: 'Medium',
      estimate: '1-2 weeks',
      sequence: 'Start with routing, middleware, and validation patterns before API development.',
      project: 'Create a REST API for a job board or note-taking app.',
    },
    {
      name: 'MongoDB',
      bucket: 'Recommended',
      why: 'Commonly used in product teams for document-based storage and flexible schemas.',
      difficulty: 'Medium',
      estimate: '10-14 days',
      sequence: 'Learn CRUD, indexing, and aggregation after basic backend setup.',
      project: 'Store user profiles, saved jobs, and notes in a document database.',
    },
    {
      name: 'Docker',
      bucket: 'Recommended',
      why: 'Essential for containerized development and deployment consistency.',
      difficulty: 'Medium',
      estimate: '1 week',
      sequence: 'Start with Dockerfiles, compose files, and deployment basics.',
      project: 'Containerize a full-stack app and learn local deployment workflows.',
    },
    {
      name: 'System Design',
      bucket: 'Nice to Have',
      why: 'Helps with architecture discussions and scalable thinking during interviews.',
      difficulty: 'Hard',
      estimate: '3-4 weeks',
      sequence: 'Study API design, scaling, databases, and caching principles.',
      project: 'Design a scalable job-matching service with queues and caching.',
    },
  ],

  getRoadmap: (): RoadmapPhase[] => [
    { phase: 'Phase 1', title: 'JavaScript Fundamentals', completed: true },
    { phase: 'Phase 2', title: 'React and Component Design', completed: true },
    { phase: 'Phase 3', title: 'Node.js + Express', completed: false },
    { phase: 'Phase 4', title: 'MongoDB + REST APIs', completed: false },
    { phase: 'Phase 5', title: 'Full Stack Project', completed: false },
    { phase: 'Phase 6', title: 'Job Applications', completed: false },
  ],

  getInterviewPrep: (): InterviewSet => ({
    technical: [
      'Explain the difference between props and state in React.',
      'How do you optimize a component to avoid unnecessary re-renders?',
      'What are common SQL joins and when would you use them?',
      'How do you secure an API endpoint with authentication and validation?',
    ],
    hr: [
      'Tell me about yourself.',
      'What are your strengths and what would you like to improve?',
      'What are your career goals for the next two years?',
      'Why do you want to join this company?',
    ],
    project: [
      'Walk me through your resume project and the key decisions you made.',
      'What trade-offs did you consider while building the product?',
      'How would you improve this project if you had more time?',
      'What metrics would you track to validate adoption?',
    ],
    jobSpecific: [
      'How would you design a responsive dashboard for job match recommendations?',
      'What metrics would you use to measure candidate-job compatibility?',
      'Describe how you would reduce friction in the application workflow.',
      'How would you optimize the user experience for job search and filtering?',
    ],
  }),
};
