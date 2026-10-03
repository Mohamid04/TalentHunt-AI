import { supabase } from './supabase';

export type AiTask = 'parse_resume' | 'analyze_resume' | 'extract_skills' | 'match_job' | 'analyze_skill_gaps' | 'generate_roadmap' | 'improve_resume' | 'generate_cover_letter' | 'generate_interview_questions' | 'evaluate_mock_interview';

async function request<T>(task: AiTask, input: unknown): Promise<T> {
  if (!supabase) throw new Error('Configure Supabase before using the secure AI service.');
  const { data, error } = await supabase.functions.invoke('ai-career', { body: { task, input } });
  if (error) throw new Error(error.message || 'The secure AI service is unavailable.');
  if (!data || typeof data !== 'object' || !('result' in data)) throw new Error('The secure AI service returned an incomplete response.');
  return (data as { result: T }).result;
}

export const careerAi = {
  parseResume: <T>(resumeText: string) => request<T>('parse_resume', { resumeText }),
  analyzeResume: <T>(resumeText: string) => request<T>('analyze_resume', { resumeText }),
  extractSkills: <T>(resumeText: string) => request<T>('extract_skills', { resumeText }),
  matchJob: <T>(candidate: unknown, job: unknown) => request<T>('match_job', { candidate, job }),
  analyzeSkillGaps: <T>(candidate: unknown, job: unknown) => request<T>('analyze_skill_gaps', { candidate, job }),
  generateRoadmap: <T>(candidate: unknown, job: unknown, gaps: unknown) => request<T>('generate_roadmap', { candidate, job, gaps }),
  improveResume: <T>(resume: unknown, job: unknown) => request<T>('improve_resume', { resume, job }),
  generateCoverLetter: <T>(resume: unknown, job: unknown) => request<T>('generate_cover_letter', { resume, job }),
  generateInterviewQuestions: <T>(resume: unknown, job: unknown) => request<T>('generate_interview_questions', { resume, job }),
  evaluateMockInterview: <T>(question: string, answer: string, job: unknown) => request<T>('evaluate_mock_interview', { question, answer, job }),
};
