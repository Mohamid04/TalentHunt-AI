import type { ResumeAnalysis } from './ai';

const programmingLanguages = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'SQL', 'HTML', 'CSS'];
const frameworks = ['React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express.js', 'Django', 'Flask', 'FastAPI', 'GraphQL', 'TensorFlow', 'PyTorch'];
const tools = ['PostgreSQL', 'MongoDB', 'Redis', 'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Git', 'Linux', 'Figma', 'Excel', 'Power BI', 'Tableau', 'REST APIs', 'Agile'];
const skillCatalog = [...programmingLanguages, ...frameworks, ...tools, 'Product design', 'UX research', 'Machine learning', 'Project management'];

export const supportedResumeExtensions = ['pdf', 'doc', 'docx', 'txt'] as const;
const supportedResumeMimeTypes = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', '']);

export function validateResumeFile(file: File, maxBytes = 8 * 1024 * 1024) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!supportedResumeExtensions.includes(extension as typeof supportedResumeExtensions[number])) {
    throw new Error('Choose a PDF, DOC, DOCX, or plain text resume.');
  }
  if (!supportedResumeMimeTypes.has(file.type)) {
    throw new Error('The file type does not match a supported resume format.');
  }
  if (file.size === 0 || file.size > maxBytes) {
    throw new Error('The resume must be between 1 byte and 8 MB.');
  }
}

export async function extractResumeText(file: File): Promise<string> {
  validateResumeFile(file);
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'txt') return file.text();

  if (extension === 'docx') {
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }

  if (extension === 'pdf') {
    const [{ getDocument, GlobalWorkerOptions }, worker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    GlobalWorkerOptions.workerSrc = worker.default;
    const pdf = await getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ('str' in item ? `${item.str}${'hasEOL' in item && item.hasEOL ? '\n' : ' '}` : '')).join(''));
    }
    return pages.join('\n');
  }

  if (extension === 'doc') {
    throw new Error('Legacy .doc files cannot be parsed safely in this browser-only app. Convert the file to .docx or PDF, then upload it again.');
  }

  throw new Error('Choose a PDF, DOC, DOCX, or plain text resume.');
}

export function analyzeResumeText(text: string): ResumeAnalysis {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const sectionHeading = /^(?:(?:work\s+)?experience|education|academic background|technical skills|skills|projects|certifications?|achievements?|career interests?|interests|professional summary|profile|contact|languages|tools|frameworks(?:\s+(?:&|and)\s+platforms?)?)\s*:?$/i;
  const contentLines = lines.filter((line) => !sectionHeading.test(line));
  const skills = extractRecognizedSkills(normalized);
  const email = normalized.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] ?? '';
  const phone = normalized.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] ?? '';
  const name = lines.find((line) => line.length < 70 && !line.includes('@') && !/resume|curriculum vitae/i.test(line)) ?? '';
  const education = contentLines.filter((line) => /bachelor|master|ph\.?d|b\.?tech|m\.?tech|degree|university|college/i.test(line) && !/certification|certified|license/i.test(line)).slice(0, 8);
  const roleLines = contentLines.filter((line) => /\b(?:engineer|developer|designer|analyst|manager|intern|consultant|specialist|team lead|technical lead)\b/i.test(line)).slice(0, 8);
  const experience = roleLines.map((role) => ({
    role,
    tenure: role.match(/\b\d+\s*(?:years?|months?)\b|\b(?:19|20)\d{2}\s*[-–]\s*(?:present|(?:19|20)\d{2})\b/i)?.[0] ?? 'Dates not detected',
    summary: 'Review the source resume for role details.',
  }));
  const projectLines = contentLines.filter((line) => /\bproject\b|\bbuilt\b|\bcreated\b|\bdeveloped\b|\bdesigned\b/i.test(line)).slice(0, 8);
  const categories = (catalog: string[]) => catalog.filter((skill) => skills.includes(skill));
  const achievements = contentLines.filter((line) => /\b(?:increased|improved|reduced|achieved|awarded|award|won|delivered|saved|recognized|recognised|led)\b|\b\d+\s*%/i.test(line)).slice(0, 8);
  const interests = contentLines.filter((line) => /areas? of interest|interested in|seeking (?:a |an )?(?:role|position)/i.test(line)).slice(0, 6);
  const atsScore = Math.min(96, Math.max(35, 38 + skills.length * 4 + (email ? 5 : 0) + (education.length ? 5 : 0)));

  return {
    name,
    contact: [email, phone].filter(Boolean).join(' • '),
    education,
    skills,
    skillCategories: { languages: categories(programmingLanguages), frameworks: categories(frameworks), tools: categories(tools) },
    experience,
    internships: roleLines.filter((line) => /intern/i.test(line)),
    projects: projectLines,
    certifications: contentLines.filter((line) => /certif|license/i.test(line)).slice(0, 5),
    achievements,
    interests,
    atsScore,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractRecognizedSkills(text: string): string[] {
  const lower = text.replace(/\s+/g, ' ').toLowerCase();
  return skillCatalog.filter((skill) => {
    const pattern = new RegExp(`(^|[^a-z0-9+#.])${escapeRegExp(skill.toLowerCase())}($|[^a-z0-9+#.])`, 'i');
    return pattern.test(lower);
  });
}