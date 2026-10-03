import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine, ArrowRight, BadgeCheck, BookOpenText, BriefcaseBusiness, CalendarDays,
  Check, CheckCircle2, ChevronDown, ClipboardList, Clock3, FileText, LayoutDashboard, LockKeyhole, LogOut,
  Mail, MapPin, MessageSquareText, Search, ShieldCheck, Sparkles, Target, TrendingUp,
  Bell, Building2, Copy, Flag, Plus, ScanSearch, Settings, Trash2, Upload, UserRound, Users, WandSparkles, Bookmark, type LucideIcon,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { aiService, type EmploymentType, type ExperienceLevel, type JobMatch, type ResumeAnalysis, type SkillGapItem, type WorkplaceMode } from './lib/ai';
import { analyzeResumeText, extractResumeText, validateResumeFile } from './lib/resume';
import { databasePolicySummary, isSupabaseConfigured, supabase } from './lib/supabase';
import { analyzeAtsCompatibility } from './lib/ats';
import { matchJobToCandidate, type ExplainableJobMatch } from './lib/matching';
import { compareResumeToJobDescription, isJobDescriptionReport, type JobDescriptionReport } from './lib/jobDescription';
import { analyzeSkillGaps, buildCareerRoadmap } from './lib/skillGaps';
import './CareerWorkspace.css';
import './CareerEnhancements.css';
import './AIConsent.css';
import './AtsMatching.css';
import './FormControls.css';
import './JobSearchAnalyzer.css';

type Section = 'dashboard' | 'resume' | 'ats' | 'jobs' | 'match' | 'job-description' | 'gap' | 'roadmap' | 'tailor' | 'cover' | 'interview' | 'applications' | 'notifications' | 'admin' | 'profile' | 'settings';
type ApplicationStatus = 'Saved' | 'Applied' | 'Shortlisted' | 'Interview' | 'Selected' | 'Rejected';
type Candidate = {
  fullName: string;
  email: string;
  role: string;
  location: string;
  summary: string;
  preferredWorkplace: WorkplaceMode | 'Any';
  preferredEmploymentType: EmploymentType | 'Any';
  minimumSalary: number;
};
type TrackedApplication = { id: string; title: string; company: string; status: ApplicationStatus; applicationDate: string; jobUrl: string; notes: string; interviewDate: string; followUpDate: string; category: string; favorite: boolean; updatedAt: string };
type WorkspaceNotification = { id: string; title: string; message: string; kind: 'match' | 'follow-up' | 'interview' | 'roadmap' | 'resume'; createdAt: string; read: boolean };
type NavigationItem = { id: Section; label: string; icon: LucideIcon; group?: string };
type JobFilters = {
  title: string;
  location: string;
  workplace: WorkplaceMode | 'Any';
  experienceLevel: ExperienceLevel | 'Any';
  salaryMin: string;
  salaryMax: string;
  skill: string;
  employmentType: EmploymentType | 'Any';
  postedWithin: 'Any' | '1' | '7' | '30';
};

const initialJobFilters: JobFilters = {
  title: '', location: '', workplace: 'Any', experienceLevel: 'Any', salaryMin: '', salaryMax: '',
  skill: '', employmentType: 'Any', postedWithin: 'Any',
};

const navigation: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Workspace' },
  { id: 'resume', label: 'Resume analysis', icon: FileText },
  { id: 'ats', label: 'ATS compatibility', icon: ScanSearch },
  { id: 'jobs', label: 'Job search', icon: BriefcaseBusiness, group: 'Job search' },
  { id: 'match', label: 'Job match', icon: Target },
  { id: 'job-description', label: 'Job description analyzer', icon: ClipboardList },
  { id: 'gap', label: 'Skill gaps', icon: TrendingUp, group: 'Career growth' },
  { id: 'roadmap', label: 'Learning roadmap', icon: BookOpenText },
  { id: 'tailor', label: 'Tailored resume', icon: WandSparkles },
  { id: 'cover', label: 'Cover letter', icon: Mail },
  { id: 'interview', label: 'Interview prep', icon: MessageSquareText },
  { id: 'applications', label: 'Applications', icon: CalendarDays },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'admin', label: 'Admin panel', icon: ShieldCheck, group: 'Administration' },
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const sampleAnalysis = aiService.analyzeResume();
const sampleJobs = aiService.getJobMatches();
const sampleRoadmap = aiService.getRoadmap();
const statuses: ApplicationStatus[] = ['Saved', 'Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];
const defaultCandidate: Candidate = {
  fullName: sampleAnalysis.name,
  email: 'aarav.mehta.dev@gmail.com',
  role: 'Full Stack Developer',
  location: 'United States',
  summary: 'Product-minded developer interested in building useful, accessible software.',
  preferredWorkplace: 'Remote',
  preferredEmploymentType: 'Full-time',
  minimumSalary: 110000,
};

function readStored<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(`talenthunt:${key}`);
    if (!saved) return fallback;
    const parsed: unknown = JSON.parse(saved);
    if (Array.isArray(fallback)) return (Array.isArray(parsed) ? parsed : fallback) as T;
    return { ...fallback, ...(parsed as object) } as T;
  } catch {
    return fallback;
  }
}

function PasswordRecoveryScreen(props: { onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setPending(true);
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) setError(updateError.message);
    else props.onComplete();
  };
  return <main className="auth-screen"><section className="auth-card-new"><div className="auth-brand-new"><span className="career-brand-mark">T</span><div><strong>TalentHUNT</strong><small>CAREER STUDIO</small></div></div><p className="section-kicker">ACCOUNT SECURITY</p><h1>Choose a new password</h1><p className="auth-description">Use at least 8 characters. Your password is handled by Supabase Auth.</p><form className="auth-form-new" onSubmit={submit}><label>New password<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button button-primary auth-submit-new" disabled={pending}>{pending ? 'Updating…' : 'Update password'} <ArrowRight size={16} /></button></form></section></main>;
}

function LandingPage(props: { onSignIn: () => void; onDemo: () => void }) {
  const features = [
    ['01', 'AI Resume Analysis', 'Turn your resume into a clear, evidence-based profile.'],
    ['02', 'Smart Job Matching', 'See which opportunities align with your skills and preferences.'],
    ['03', 'Skill Gap Analysis', 'Understand what to learn next for the role you want.'],
    ['04', 'Career Roadmap', 'Move from today’s foundation to a practical next milestone.'],
    ['05', 'Resume Tailoring', 'Create an ATS-friendly draft without inventing qualifications.'],
    ['06', 'Interview Preparation', 'Practice role-specific questions with constructive feedback.'],
    ['07', 'Application Tracking', 'Keep every saved role, follow-up, and interview in view.'],
  ];
  return <main className="landing-page"><nav className="landing-nav"><button className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><span className="career-brand-mark">T</span><span><strong>TalentHUNT</strong><small>CAREER STUDIO</small></span></button><div className="landing-nav-links"><a href="#how-it-works">How it works</a><a href="#features">Features</a><a href="#faq">FAQ</a></div><div className="landing-nav-actions"><button className="landing-login" onClick={props.onSignIn}>Sign in</button><button className="button button-primary" onClick={props.onDemo}>Explore demo <ArrowRight size={15} /></button></div></nav><section className="landing-hero"><div className="landing-hero-copy"><p className="section-kicker">YOUR CAREER, IN FOCUS</p><h1>Your Resume. Your Skills. <em>Your Next Opportunity.</em></h1><p className="landing-subtitle">TalentHUNT AI analyzes your resume, finds relevant opportunities, identifies skill gaps, prepares you for interviews, and helps you manage your entire job search.</p><div className="landing-hero-actions"><button className="button button-primary" onClick={props.onSignIn}>Build my career workspace <ArrowRight size={16} /></button><button className="landing-text-action" onClick={props.onDemo}>See the sample workspace <Sparkles size={16} /></button></div><div className="landing-proof"><span><CheckCircle2 size={15} />Evidence-first suggestions</span><span><ShieldCheck size={15} />Private by design</span></div></div><div className="landing-hero-visual" aria-label="TalentHUNT career dashboard preview"><div className="landing-orbit orbit-a" /><div className="landing-orbit orbit-b" /><div className="landing-preview-card"><div className="preview-topline"><span /><span /><span /></div><p className="section-kicker">CAREER READINESS</p><strong>Make your next move clearer.</strong><div className="preview-score"><span>ATS fit</span><b>92</b><div><i style={{ width: '92%' }} /></div></div><div className="preview-lines"><span /><span /><span /><span /></div></div><div className="landing-float-card"><CheckCircle2 size={16} /><span><strong>3 roles worth exploring</strong><small>Matched to your evidence</small></span></div></div></section><section id="how-it-works" className="landing-section landing-process"><div className="landing-section-heading"><p className="section-kicker">HOW IT WORKS</p><h2>From scattered effort to a focused search.</h2><p>One calm workspace for the decisions that move your career forward.</p></div><div className="process-grid"><div><span>01</span><strong>Understand your profile</strong><p>Upload your resume and review what the parser found.</p></div><div><span>02</span><strong>Find your fit</strong><p>Compare roles, requirements, skill gaps, and match factors.</p></div><div><span>03</span><strong>Take the next step</strong><p>Build a roadmap, prepare, tailor, and track your applications.</p></div></div></section><section id="features" className="landing-section"><div className="landing-section-heading"><p className="section-kicker">THE CAREER STUDIO</p><h2>Everything you need to keep momentum.</h2></div><div className="feature-grid">{features.map(([number, title, description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section><section className="landing-section landing-testimonials"><div className="landing-section-heading"><p className="section-kicker">A BETTER SEARCH FEELS DIFFERENT</p><h2>Less guesswork. More useful progress.</h2></div><div className="testimonial-grid"><blockquote>“The gap analysis gave me a realistic order for what to learn instead of another overwhelming list.”<cite>Early-career software developer</cite></blockquote><blockquote>“I could see exactly which parts of my resume supported a role before I spent time applying.”<cite>Product-minded engineer</cite></blockquote><blockquote>“The tracker made follow-ups visible without turning the search into another full-time job.”<cite>Career switcher</cite></blockquote></div></section><section id="faq" className="landing-section landing-faq"><div className="landing-section-heading"><p className="section-kicker">FAQ</p><h2>Clear expectations from the start.</h2></div><div className="faq-grid"><details open><summary>Does TalentHUNT invent resume qualifications?</summary><p>No. Suggestions and drafts are constrained to detected evidence and clearly marked for review.</p></details><details><summary>Can I try it without connecting an account?</summary><p>Yes. Explore the local demo with sample data. Account features use Supabase Auth when configured.</p></details><details><summary>Are the job listings live?</summary><p>The current workspace uses attributed sample listings until a licensed live job source is connected.</p></details><details><summary>Is my resume stored?</summary><p>Local parsing keeps text in memory. Authenticated AI requests go through secured Edge Functions and follow provider retention terms.</p></details></div></section><section className="landing-cta"><p className="section-kicker">READY WHEN YOU ARE</p><h2>Make the next step specific.</h2><p>Bring your resume, your questions, and the role you want to grow into.</p><button className="button button-white" onClick={props.onSignIn}>Enter your workspace <ArrowRight size={16} /></button></section><footer className="landing-footer"><span>TalentHUNT · CAREER STUDIO</span><span>Evidence first. Progress always.</span></footer></main>;
}

function AuthScreen(props: { onDemo: () => void; onBack: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!supabase) {
      setError('Authentication is not available until the Supabase project URL and publishable/anon key are configured.');
      return;
    }
    setPending(true);
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, career_goal: role }, emailRedirectTo: window.location.origin },
        });
        if (authError) throw authError;
        if (!data.session) setMessage('Account created. Check your email for the confirmation link, then sign in.');
      } else if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      } else {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (authError) throw authError;
        setMessage('If an account exists for that email, a password reset link is on its way.');
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to complete authentication.');
    } finally {
      setPending(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) return setError('Configure Supabase before using Google sign-in.');
    setError('');
    setPending(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
      if (authError) { setError(authError.message); setPending(false); }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Google sign-in could not start.');
      setPending(false);
    }
  };

  return <main className="auth-screen">
    <section className="auth-card-new">
      <button className="auth-back-link" type="button" onClick={props.onBack}><ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to overview</button>
      <div className="auth-brand-new"><span className="career-brand-mark">T</span><div><strong>TalentHUNT</strong><small>CAREER STUDIO</small></div></div>
      <p className="section-kicker">YOUR CAREER, IN FOCUS</p>
      <h1>{mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}</h1>
      <p className="auth-description">{mode === 'forgot' ? 'We’ll email you a secure password reset link.' : 'Sign in to your private career workspace and pick up where you left off.'}</p>
      {isSupabaseConfigured ? <>
        {mode !== 'forgot' && <button type="button" className="google-button" onClick={signInWithGoogle} disabled={pending}><span className="google-mark">G</span>Continue with Google</button>}
        {mode !== 'forgot' && <div className="auth-divider"><span>or continue with email</span></div>}
        <form className="auth-form-new" onSubmit={submit}>
          {mode === 'signup' && <><label>Full name<input required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" /></label><label>Career goal<input value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Product designer" /></label></>}
          <label>Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          {mode !== 'forgot' && <label>Password<input required type="password" minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>}
          {mode === 'login' && <button className="forgot-link" type="button" onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}>Forgot password?</button>}
          {error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-success" role="status">{message}</p>}
          <button className="button button-primary auth-submit-new" disabled={pending}>{pending ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'} <ArrowRight size={16} /></button>
        </form>
        {mode !== 'forgot' && <p className="auth-switch">{mode === 'signup' ? 'Already have an account?' : 'New to TalentHUNT?'} <button type="button" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); setMessage(''); }}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</button></p>}
        {mode === 'forgot' && <button className="auth-switch-button" onClick={() => setMode('login')}>Back to sign in</button>}
      </> : <div className="setup-needed"><LockKeyhole size={20} /><strong>Connect your Supabase project</strong><p>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your local environment, then enable email authentication. Secure account access is disabled until then.</p></div>}
      <div className="auth-privacy"><ShieldCheck size={14} /> Protected with Supabase Auth. Never place a service-role key in a browser app.</div>
      {!isSupabaseConfigured && <button type="button" className="demo-entry" onClick={props.onDemo}>Explore local demo <ArrowRight size={14} /></button>}
    </section>
  </main>;
}

function AppNotice(props: { isDemo: boolean }) {
  return (
    <div className="workspace-notice" role="status">
      <Sparkles size={16} />
      <span><strong>{props.isDemo ? 'Local demo workspace.' : 'Authenticated career workspace.'}</strong> PDF/DOCX/TXT parsing runs in-browser; legacy DOC uses an authenticated, non-persistent Edge Function. Sample jobs and coaching are illustrative, not live AI results.</span>
    </div>
  );
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function extractLegacyDocText(file: File) {
  if (!supabase) throw new Error('Legacy DOC parsing requires a configured Supabase project. Convert this file to DOCX or PDF in demo mode.');
  const form = new FormData();
  form.append('file', file);
  const { data, error } = await supabase.functions.invoke('parse-legacy-doc', { body: form });
  if (error) throw new Error('Legacy DOC parsing requires the authenticated parse-legacy-doc Edge Function to be deployed. Convert this file to DOCX or PDF if it is not available.');
  if (typeof data?.text !== 'string') throw new Error('The DOC parser returned no resume text. Try DOCX or PDF.');
  return data.text;
}

export default function CareerWorkspace() {
  const [session, setSession] = useState<Session | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [demoAccess, setDemoAccess] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [section, setSection] = useState<Section>('dashboard');
  const [candidate, setCandidate] = useState<Candidate>(() => readStored('candidate', defaultCandidate));
  const [analysis, setAnalysis] = useState<ResumeAnalysis>(sampleAnalysis);
  const [resumeText, setResumeText] = useState('');
  const [resumeName, setResumeName] = useState('Sample candidate profile');
  const [hasUploadedResume, setHasUploadedResume] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<'sample' | 'local' | 'ai'>('sample');
  const [uploadError, setUploadError] = useState('');
  const [search, setSearch] = useState('');
  const [jobFilters, setJobFilters] = useState<JobFilters>(initialJobFilters);
  const [jobDescription, setJobDescription] = useState('');
  const [jobDescriptionName, setJobDescriptionName] = useState('');
  const [jobDescriptionReport, setJobDescriptionReport] = useState<JobDescriptionReport | null>(null);
  const [jobDescriptionSource, setJobDescriptionSource] = useState<'local' | 'ai' | null>(null);
  const [jobDescriptionError, setJobDescriptionError] = useState('');
  const [isJobDescriptionProcessing, setIsJobDescriptionProcessing] = useState(false);
  const [isJobDescriptionAIProcessing, setIsJobDescriptionAIProcessing] = useState(false);
  const [applications, setApplications] = useState<TrackedApplication[]>(() => readStored<Partial<TrackedApplication>[]>('users:demo:applications', []).map(normalizeApplication));
  const [savedCategories, setSavedCategories] = useState<string[]>(() => readStored('users:demo:categories', ['Wishlist']));
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>(() => readStored('users:demo:notifications', []));
  const [completedRoadmap, setCompletedRoadmap] = useState<string[]>(() => readStored('users:demo:roadmap', { completed: sampleRoadmap.filter((step) => step.completed).map((step) => step.phase) }).completed);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [tailoredText, setTailoredText] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [interviewAnswer, setInterviewAnswer] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [toast, setToast] = useState('');
  const storageOwner = session?.user.id ?? 'demo';
  const hydratedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const applySession = (nextSession: Session | null) => {
      setSession(nextSession);
      if (!nextSession) {
        hydratedUserId.current = null;
        setCandidate(readStored('candidate', defaultCandidate));
        setAnalysis(sampleAnalysis);
        setAnalysisSource('sample');
        setResumeName('Sample candidate profile');
        setResumeText('');
        setHasUploadedResume(false);
        setApplications(readStored<Partial<TrackedApplication>[]>('users:demo:applications', []).map(normalizeApplication));
        setSavedCategories(readStored('users:demo:categories', ['Wishlist']));
        setNotifications(readStored('users:demo:notifications', []));
        setCompletedRoadmap(readStored('users:demo:roadmap', { completed: sampleRoadmap.filter((step) => step.completed).map((step) => step.phase) }).completed);
        setTailoredText('');
        setCoverLetter('');
        setInterviewAnswer('');
        setJobDescription('');
        setJobDescriptionName('');
        setJobDescriptionReport(null);
        setJobDescriptionSource(null);
        return;
      }
      if (hydratedUserId.current === nextSession.user.id) return;
      hydratedUserId.current = nextSession.user.id;
      const metadata = nextSession.user.user_metadata as Record<string, unknown>;
      setCandidate({
        fullName: typeof metadata.full_name === 'string' ? metadata.full_name : typeof metadata.name === 'string' ? metadata.name : defaultCandidate.fullName,
        email: nextSession.user.email ?? '',
        role: typeof metadata.career_goal === 'string' ? metadata.career_goal : defaultCandidate.role,
        location: typeof metadata.preferred_location === 'string' ? metadata.preferred_location : '',
        summary: typeof metadata.summary === 'string' ? metadata.summary : '',
        preferredWorkplace: ['Remote', 'Hybrid', 'On-site', 'Flexible'].includes(String(metadata.preferred_workplace)) ? metadata.preferred_workplace as WorkplaceMode : 'Any',
        preferredEmploymentType: ['Full-time', 'Part-time', 'Contract', 'Internship'].includes(String(metadata.preferred_employment_type)) ? metadata.preferred_employment_type as EmploymentType : 'Any',
        minimumSalary: typeof metadata.minimum_salary === 'number' ? metadata.minimum_salary : 0,
      });
      setAnalysis({ name: '', contact: '', education: [], skills: [], skillCategories: { languages: [], frameworks: [], tools: [] }, experience: [], internships: [], projects: [], certifications: [], achievements: [], interests: [], atsScore: 0 });
      setAnalysisSource('local');
      setResumeName('No resume imported');
      setResumeText('');
      setHasUploadedResume(false);
      setApplications(readStored<Partial<TrackedApplication>[]>(`users:${nextSession.user.id}:applications`, []).map(normalizeApplication));
      setSavedCategories(readStored(`users:${nextSession.user.id}:categories`, ['Wishlist']));
      setNotifications(readStored(`users:${nextSession.user.id}:notifications`, []));
      setCompletedRoadmap(readStored(`users:${nextSession.user.id}:roadmap`, { completed: [] }).completed);
      setTailoredText('');
      setCoverLetter('');
      setInterviewAnswer('');
      setJobDescription('');
      setJobDescriptionName('');
      setJobDescriptionReport(null);
      setJobDescriptionSource(null);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      applySession(nextSession);
      setAuthReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      applySession(data.session);
      setAuthReady(true);
    }).catch(() => {
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const jobs = useMemo(() => sampleJobs.map((job) => matchJobToCandidate(job, candidate, analysis, resumeText)), [analysis, candidate, resumeText]);
  const filteredJobs = jobs.filter((job) => matchesJobFilters(job, search, jobFilters));
  const selectedJob = jobs.find((job) => jobId(job) === selectedJobId) ?? jobs[0];
  const roadmap = useMemo(() => buildCareerRoadmap(selectedJob, analysis, resumeText || buildResumeTextFromAnalysis(analysis)), [analysis, resumeText, selectedJob]);
  const skillPlan = useMemo(() => analyzeSkillGaps(selectedJob, analysis, resumeText || buildResumeTextFromAnalysis(analysis)), [analysis, resumeText, selectedJob]);
  const interviewPrep = useMemo(() => buildInterviewQuestions(selectedJob, analysis), [analysis, selectedJob]);
  const applicationCount = applications.filter((item) => item.status !== 'Saved').length;
  const savedCount = applications.filter((item) => item.status === 'Saved').length;
  const interviewCount = applications.filter((item) => item.status === 'Interview').length;
  const shortlistedCount = applications.filter((item) => item.status === 'Shortlisted').length;
  const selectedCount = applications.filter((item) => item.status === 'Selected').length;
  const roadmapProgress = roadmap.length ? Math.round((roadmap.filter((step) => completedRoadmap.includes(step.phase)).length / roadmap.length) * 100) : 0;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  useEffect(() => {
    const ownerKey = `users:${storageOwner}:notifications`;
    const createdAt = new Date().toLocaleDateString();
    const generated: WorkspaceNotification[] = [
      ...(jobs.length ? [{ id: `matches:${jobs.length}`, title: 'New matching jobs', message: `${jobs.length} roles are ready to review for your current profile.`, kind: 'match' as const }] : []),
      ...applications.filter((item) => item.followUpDate).map((item) => ({ id: `follow-up:${item.id}:${item.followUpDate}`, title: 'Application follow-up', message: `Follow up with ${item.company} about ${item.title} on ${item.followUpDate}.`, kind: 'follow-up' as const })),
      ...applications.filter((item) => item.interviewDate).map((item) => ({ id: `interview:${item.id}:${item.interviewDate}`, title: 'Interview date saved', message: `${item.title} at ${item.company} has an interview on ${item.interviewDate}.`, kind: 'interview' as const })),
      ...completedRoadmap.map((phase) => ({ id: `roadmap:${phase}`, title: 'Roadmap milestone', message: `${phase} is marked complete. Keep building toward your target role.`, kind: 'roadmap' as const })),
      ...((!hasUploadedResume || analysis.atsScore < 80) ? [{ id: 'resume:improvement', title: 'Resume improvement', message: hasUploadedResume ? 'Review your ATS findings and strengthen the evidence in your resume.' : 'Upload a resume to unlock personalized improvement suggestions.', kind: 'resume' as const }] : []),
    ].map((item) => ({ ...item, createdAt, read: false }));
    const timeout = window.setTimeout(() => {
      setNotifications((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        const additions = generated.filter((item) => !existingIds.has(item.id));
        if (!additions.length) return current;
        const next = [...additions, ...current].slice(0, 50);
        localStorage.setItem(`talenthunt:${ownerKey}`, JSON.stringify(next));
        return next;
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [analysis.atsScore, applications, completedRoadmap, hasUploadedResume, jobs, storageOwner]);
  const unreadNotificationCount = notifications.filter((item) => !item.read).length;

  const chooseJob = (job: JobMatch) => {
    setSelectedJobId(jobId(job));
    setTailoredText('');
    setCoverLetter('');
  };

  const trackJob = (job: JobMatch, status: ApplicationStatus) => {
    const id = jobId(job);
    const next = applications.filter((item) => item.id !== id);
    const existing = applications.find((item) => item.id === id);
    const applicationDate = new Date().toISOString().slice(0, 10);
    const updatedAt = new Date().toLocaleDateString();
    next.unshift(normalizeApplication({ ...existing, id, title: job.title, company: job.company, status, applicationDate: existing?.applicationDate || applicationDate, jobUrl: existing?.jobUrl || job.applyUrl || '', favorite: status === 'Saved' ? true : existing?.favorite ?? false, updatedAt }));
    setApplications(next);
    localStorage.setItem(`talenthunt:users:${storageOwner}:applications`, JSON.stringify(next));
    notify(status === 'Saved' ? 'Job saved to your tracker.' : `Moved to ${status}.`);
  };

  const applyToJob = (job: JobMatch) => {
    trackJob(job, 'Applied');
    if (job.applyUrl?.startsWith('https://')) {
      window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
    } else {
      notify(`${job.sourceType === 'platform' ? 'Platform sample' : 'External sample'}: tracked locally; no employer submission or live apply link is connected.`);
    }
  };

  const updateTrackedApplication = (application: TrackedApplication, status: ApplicationStatus) => {
    const next = applications.filter((item) => item.id !== application.id);
    next.unshift({ ...application, status, updatedAt: new Date().toLocaleDateString() });
    setApplications(next);
    localStorage.setItem(`talenthunt:users:${storageOwner}:applications`, JSON.stringify(next));
  };

  const editTrackedApplication = (application: TrackedApplication, changes: Partial<TrackedApplication>) => {
    const next = applications.map((item) => item.id === application.id ? { ...item, ...changes, updatedAt: new Date().toLocaleDateString() } : item);
    setApplications(next);
    localStorage.setItem(`talenthunt:users:${storageOwner}:applications`, JSON.stringify(next));
  };

  const removeSavedJob = (job: JobMatch) => {
    const next = applications.filter((item) => item.id !== jobId(job));
    setApplications(next);
    localStorage.setItem(`talenthunt:users:${storageOwner}:applications`, JSON.stringify(next));
    notify('Job removed from saved roles.');
  };

  const addSavedCategory = (category: string) => {
    const value = category.trim();
    if (!value || savedCategories.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    const next = [...savedCategories, value];
    setSavedCategories(next);
    localStorage.setItem(`talenthunt:users:${storageOwner}:categories`, JSON.stringify(next));
  };

  const markNotificationsRead = () => {
    const next = notifications.map((item) => ({ ...item, read: true }));
    setNotifications(next);
    localStorage.setItem(`talenthunt:users:${storageOwner}:notifications`, JSON.stringify(next));
  };

  const processResume = async (file?: File) => {
    if (!file) return;
    setUploadError('');
    setIsProcessing(true);
    try {
      validateResumeFile(file);
      const extension = file.name.split('.').pop()?.toLowerCase();
      const text = extension === 'doc' ? await extractLegacyDocText(file) : await extractResumeText(file);
      if (text.trim().length < 40) throw new Error('No readable text was found. If this is a scanned PDF, try a text-based PDF or paste your resume text.');
      const result = analyzeResumeText(text);
      setResumeText(text);
      setAnalysis(result);
      setAnalysisSource('local');
      setResumeName(file.name);
      setHasUploadedResume(true);
      if (result.name) setCandidate((current) => ({ ...current, fullName: result.name }));
      if (result.contact) setCandidate((current) => ({ ...current, email: result.contact.split(' • ')[0].includes('@') ? result.contact.split(' • ')[0] : current.email }));
      notify('Resume text extracted. Review the parsed profile for accuracy.');
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Unable to read this resume.');
    } finally {
      setIsProcessing(false);
    }
  };

  const runAIAnalysis = async () => {
    if (!session || !supabase || !resumeText) return;
    setIsAIProcessing(true);
    setUploadError('');
    try {
      const { data, error } = await supabase.functions.invoke('analyze-resume', { body: { resumeText } });
      if (error) throw new Error('AI analysis is not available. Deploy the analyze-resume Edge Function and configure its server-side provider key.');
      if (!data || typeof data !== 'object' || !data.skillCategories) throw new Error('The AI service returned an incomplete resume analysis.');
      setAnalysis({ ...(data as Omit<ResumeAnalysis, 'atsScore'>), atsScore: analyzeResumeText(resumeText).atsScore });
      setAnalysisSource('ai');
      notify('AI resume analysis complete. Review each extracted detail.');
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'AI analysis failed.');
    } finally {
      setIsAIProcessing(false);
    }
  };

  const runLocalJobDescriptionAnalysis = () => {
    const description = jobDescription.trim();
    if (description.length < 40) {
      setJobDescriptionError('Paste or upload at least 40 characters of job description.');
      return;
    }
    if (!hasUploadedResume && analysisSource !== 'sample') {
      setJobDescriptionError('Upload your resume before comparing it with a job description.');
      return;
    }
    setJobDescriptionError('');
    const sourceText = resumeText || buildResumeTextFromAnalysis(analysis);
    setJobDescriptionReport(compareResumeToJobDescription(description, analysis, sourceText, candidate.role));
    setJobDescriptionSource('local');
  };

  const processJobDescriptionFile = async (file?: File) => {
    if (!file) return;
    setJobDescriptionError('');
    setIsJobDescriptionProcessing(true);
    try {
      validateResumeFile(file);
      const text = await extractResumeText(file);
      if (text.trim().length < 40) throw new Error('No readable job-description text was found. Use a text-based PDF, DOCX, or TXT file.');
      setJobDescription(text);
      setJobDescriptionName(file.name);
      setJobDescriptionReport(null);
      setJobDescriptionSource(null);
    } catch (error) {
      setJobDescriptionError(error instanceof Error ? error.message : 'Unable to read this job description.');
    } finally {
      setIsJobDescriptionProcessing(false);
    }
  };

  const runAIJobDescriptionAnalysis = async () => {
    if (!session || !supabase || !resumeText || !hasUploadedResume) {
      setJobDescriptionError('AI comparison requires an authenticated account and an uploaded resume.');
      return;
    }
    setIsJobDescriptionAIProcessing(true);
    setJobDescriptionError('');
    try {
      const { data, error } = await supabase.functions.invoke('analyze-job-description', {
        body: { resumeText, jobDescription: jobDescription.trim() },
      });
      if (error) throw new Error('AI comparison is unavailable. Deploy the analyze-job-description Edge Function and configure its provider secret.');
      if (!isJobDescriptionReport(data)) throw new Error('The AI comparison returned an incomplete report.');
      setJobDescriptionReport(data);
      setJobDescriptionSource('ai');
    } catch (error) {
      setJobDescriptionError(error instanceof Error ? error.message : 'AI job-description comparison failed.');
    } finally {
      setIsJobDescriptionAIProcessing(false);
    }
  };

  const generateTailoredResume = () => {
    setTailoredText(buildTailoredResumeText(candidate, analysis, resumeText, selectedJob));
    setSection('tailor');
  };

  const generateCoverLetter = () => {
    setCoverLetter(buildCoverLetter(candidate, analysis, selectedJob));
    setSection('cover');
  };

  const toggleRoadmapStep = (phase: string) => {
    const next = completedRoadmap.includes(phase) ? completedRoadmap.filter((item) => item !== phase) : [...completedRoadmap, phase];
    setCompletedRoadmap(next);
    localStorage.setItem(`talenthunt:users:${storageOwner}:roadmap`, JSON.stringify({ completed: next }));
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (session && supabase) {
      const { error } = await supabase.auth.updateUser({ data: {
        full_name: candidate.fullName,
        career_goal: candidate.role,
        preferred_location: candidate.location,
        summary: candidate.summary,
        preferred_workplace: candidate.preferredWorkplace,
        preferred_employment_type: candidate.preferredEmploymentType,
        minimum_salary: candidate.minimumSalary,
      } });
      if (error) { notify(error.message); return; }
    } else {
      localStorage.setItem('talenthunt:candidate', JSON.stringify(candidate));
    }
    setProfileSaved(true);
    notify(session ? 'Profile saved to your account.' : 'Profile saved on this device.');
  };

  const signOut = async () => {
    if (session && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) { notify(error.message); return; }
    } else {
      setResumeText('');
      setHasUploadedResume(false);
      setAnalysis(sampleAnalysis);
      setAnalysisSource('sample');
      setResumeName('Sample candidate profile');
      setTailoredText('');
      setCoverLetter('');
      setJobDescription('');
      setJobDescriptionName('');
      setJobDescriptionReport(null);
      setJobDescriptionSource(null);
    }
    setDemoAccess(false);
    setSection('dashboard');
  };

  const atsText = resumeText || (analysisSource === 'sample' ? buildResumeTextFromAnalysis(analysis) : '');
  const atsReport = analyzeAtsCompatibility(atsText, analysis, selectedJob);
  const heading = navigation.find((item) => item.id === section)?.label ?? 'Overview';

  if (!authReady) return <main className="auth-screen"><div className="auth-card-new auth-loading"><span className="career-brand-mark">T</span><p>Checking your secure session…</p></div></main>;
  if (passwordRecovery && session) return <PasswordRecoveryScreen onComplete={() => { setPasswordRecovery(false); setSection('dashboard'); }} />;
  if (!session && !demoAccess && showLanding) return <LandingPage onSignIn={() => setShowLanding(false)} onDemo={() => setDemoAccess(true)} />;
  if (!session && !demoAccess) return <AuthScreen onDemo={() => setDemoAccess(true)} onBack={() => setShowLanding(true)} />;

  return (
    <div className="career-app">
      <aside className="career-sidebar">
        <button className="career-brand" type="button" onClick={() => setSection('dashboard')}>
          <span className="career-brand-mark">T</span><span><strong>TalentHUNT</strong><small>CAREER STUDIO</small></span>
        </button>
        <div className="sidebar-profile">
          <div className="sidebar-avatar">{candidate.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
          <div><strong>{candidate.fullName || 'Your profile'}</strong><small>{candidate.role}</small></div>
        </div>
        <nav className="career-nav" aria-label="Career workspace navigation">
          {navigation.map((item, index) => {
            const Icon = item.icon;
            return <div key={item.id}>
              {item.group && <p className="nav-group">{item.group}</p>}
              {!item.group && index === 1 && null}
              <button type="button" className={`career-nav-item ${section === item.id ? 'active' : ''}`} onClick={() => setSection(item.id)}>
                <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>
                {item.id === 'applications' && applications.length > 0 && <small>{applications.length}</small>}
                {item.id === 'notifications' && unreadNotificationCount > 0 && <small>{unreadNotificationCount}</small>}
              </button>
            </div>;
          })}
        </nav>
        <div className="sidebar-footer"><ShieldCheck size={15} /><span>Resume text is cleared from app memory on logout</span></div>
      </aside>

      <main className="career-main">
        <header className="career-topbar">
          <div className="breadcrumb">Career workspace <span>/</span> <strong>{heading}</strong></div>
          <div className="topbar-user"><span className={`demo-indicator ${session ? 'authenticated-indicator' : ''}`} /> {session ? session.user.email : 'Demo mode'} <div className="mini-avatar">{candidate.fullName.slice(0, 1).toUpperCase()}</div><button className="logout-button" type="button" onClick={signOut} aria-label="Log out"><LogOut size={15} /></button></div>
        </header>
        <div className="career-content">
          <AppNotice isDemo={!session} />
          {toast && <div className="toast-message" role="status">{toast}</div>}
          <div className="page-heading">
            <div><p className="section-kicker">YOUR CAREER, IN FOCUS</p><h1>{heading}</h1><p className="page-subtitle">A practical career companion, from your resume to your next opportunity.</p></div>
            {section !== 'resume' && <button className="button button-primary" onClick={() => setSection('resume')}><Upload size={16} /> Upload resume</button>}
          </div>

          {section === 'dashboard' && <Dashboard
            candidate={candidate} analysis={analysis} resumeName={resumeName} hasUploadedResume={hasUploadedResume}
            jobs={jobs} applications={applications} savedCount={savedCount} applicationCount={applicationCount}
            interviewCount={interviewCount} shortlistedCount={shortlistedCount} selectedCount={selectedCount}
            currentSkills={skillPlan.currentSkills} missingSkills={[...skillPlan.mustLearn, ...skillPlan.recommended].map((item) => item.name)} roadmapProgress={roadmapProgress} setSection={setSection} />}

          {section === 'resume' && <ResumeSection analysis={analysis} name={resumeName} hasUploaded={hasUploadedResume} source={analysisSource}
            isProcessing={isProcessing} isAIProcessing={isAIProcessing} canUseAI={Boolean(session && supabase)} error={uploadError} onAIAnalysis={runAIAnalysis} onFile={processResume} onPaste={(text) => {
              if (text.trim().length < 40) { setUploadError('Paste at least 40 characters so there is enough text to analyze.'); return; }
              setUploadError(''); setResumeText(text); setAnalysis(analyzeResumeText(text)); setAnalysisSource('local'); setResumeName('Pasted resume text'); setHasUploadedResume(true); notify('Resume text analyzed locally.');
            }} />}

          {section === 'ats' && <AtsSection report={atsReport} jobs={jobs} selectedJob={selectedJob} hasResume={hasUploadedResume} isSample={analysisSource === 'sample'} onChooseJob={chooseJob} onUpload={() => setSection('resume')} />}

          {section === 'jobs' && <JobsSection jobs={filteredJobs} search={search} setSearch={setSearch} filters={jobFilters} setFilters={setJobFilters} applications={applications} onTrack={trackJob} onRemove={removeSavedJob} onApply={applyToJob} onSelect={(job) => { chooseJob(job); setSection('match'); }} />}

          {section === 'match' && <MatchSection jobs={jobs} selectedJob={selectedJob} selectedJobId={selectedJobId}
            onChoose={chooseJob} onTailor={generateTailoredResume} onCoverLetter={generateCoverLetter} onTrack={trackJob} />}

          {section === 'job-description' && <JobDescriptionSection
            resumeReady={hasUploadedResume || analysisSource === 'sample'} isSample={analysisSource === 'sample'} canUseAI={Boolean(session && supabase)}
            text={jobDescription} fileName={jobDescriptionName} report={jobDescriptionReport} source={jobDescriptionSource}
            error={jobDescriptionError} isProcessing={isJobDescriptionProcessing} isAIProcessing={isJobDescriptionAIProcessing}
            onTextChange={(text) => { setJobDescription(text); setJobDescriptionError(''); setJobDescriptionReport(null); setJobDescriptionSource(null); }}
            onFile={processJobDescriptionFile} onAnalyze={runLocalJobDescriptionAnalysis} onAIAnalyze={runAIJobDescriptionAnalysis} />}

          {section === 'gap' && <SkillGapSection jobs={jobs} selectedJob={selectedJob} selectedJobId={selectedJobId} analysis={analysis} resumeText={resumeText || buildResumeTextFromAnalysis(analysis)} isSample={analysisSource === 'sample'} onChoose={chooseJob} />}

          {section === 'roadmap' && <RoadmapSection steps={roadmap} completed={completedRoadmap} targetRole={selectedJob.title} currentSkills={analysis.skills} onToggle={toggleRoadmapStep} />}

          {section === 'tailor' && <DraftSection title="Tailored resume draft" description={`A truthful, editable draft for ${selectedJob.title} at ${selectedJob.company}.`} text={tailoredText} setText={setTailoredText} onGenerate={generateTailoredResume} onDownload={() => downloadText('tailored-resume.txt', tailoredText)} emptyMessage="Choose a job match to create a focused draft from your existing resume." />}

          {section === 'cover' && <DraftSection title="Cover letter draft" description={`Personalize this starting point for ${selectedJob.company}. Add specific examples before sending.`} text={coverLetter} setText={setCoverLetter} onGenerate={generateCoverLetter} onDownload={() => downloadText('cover-letter.txt', coverLetter)} emptyMessage="Choose a recommended job to create a cover letter draft." />}

          {section === 'interview' && <InterviewSection job={selectedJob} questions={interviewPrep} answer={interviewAnswer} setAnswer={setInterviewAnswer} />}

          {section === 'applications' && <ApplicationsSection applications={applications} onChange={updateTrackedApplication} onEdit={editTrackedApplication} categories={savedCategories} onAddCategory={addSavedCategory} />}

          {section === 'notifications' && <NotificationsSection notifications={notifications} onMarkRead={markNotificationsRead} />}

          {section === 'admin' && <AdminSection />}

          {section === 'profile' && <ProfileSection candidate={candidate} setCandidate={setCandidate} onSubmit={saveProfile} saved={profileSaved} />}

          {section === 'settings' && <ProfileSection candidate={candidate} setCandidate={setCandidate} onSubmit={saveProfile} saved={profileSaved} />}
        </div>
      </main>
    </div>
  );
}

function jobId(job: Pick<JobMatch, 'title' | 'company'>) { return `${job.company}::${job.title}`; }

function buildResumeTextFromAnalysis(analysis: ResumeAnalysis) {
  return [analysis.name, analysis.contact, 'Career interests', ...analysis.interests, 'Skills', ...analysis.skills, 'Experience', ...analysis.experience.map((item) => `${item.role} ${item.tenure} ${item.summary}`), 'Education', ...analysis.education, 'Projects', ...analysis.projects, 'Certifications', ...analysis.certifications, 'Achievements', ...analysis.achievements].filter(Boolean).join('\n');
}

function buildTailoredResumeText(candidate: Candidate, analysis: ResumeAnalysis, resumeText: string, job: JobMatch) {
  const targetTerms = [...job.tags, ...job.requiredSkills, ...job.requiredTechnologies, ...job.preferredTechnologies].map((term) => term.toLowerCase());
  const matchesTarget = (value: string) => targetTerms.some((term) => value.toLowerCase().includes(term));
  const matchingSkills = analysis.skills.filter(matchesTarget);
  const orderedExperience = [...analysis.experience].sort((left, right) => Number(matchesTarget(right.role + right.summary)) - Number(matchesTarget(left.role + left.summary)));
  const orderedProjects = [...analysis.projects].sort((left, right) => Number(matchesTarget(right)) - Number(matchesTarget(left)));
  const skills = [...new Set([...matchingSkills, ...analysis.skills])];
  const experience = orderedExperience.length
    ? orderedExperience.map((item) => `- ${item.role} | ${item.tenure}\n  ${item.summary}`).join('\n')
    : '- No experience entries were detected in the parsed resume.';
  const projects = orderedProjects.length ? orderedProjects.map((project) => `- ${project}`).join('\n') : '- No projects were detected in the parsed resume.';
  const originalEvidence = resumeText.trim() ? `\n\nSOURCE EVIDENCE FOR REVIEW\n${resumeText.trim()}` : '';
  return `${candidate.fullName}\n${candidate.email}\n${candidate.location}\n\nTARGET ROLE\n${job.title} at ${job.company}\n\nPROFESSIONAL SUMMARY\n${candidate.summary || 'Review and replace this summary with an accurate statement from your resume.'}\n\nCORE SKILLS\n${skills.join(' | ') || 'No skills were detected.'}\n\nPROFESSIONAL EXPERIENCE\n${experience}\n\nSELECTED PROJECTS\n${projects}\n\nEDUCATION\n${analysis.education.map((item) => `- ${item}`).join('\n') || '- No education entries were detected in the parsed resume.'}\n\nCERTIFICATIONS\n${analysis.certifications.map((item) => `- ${item}`).join('\n') || '- No certifications were detected in the parsed resume.'}\n\nACHIEVEMENTS\n${analysis.achievements.map((item) => `- ${item}`).join('\n') || '- No achievements were detected in the parsed resume.'}${originalEvidence}\n\nTAILORING NOTES\nRelevant detected keywords are placed earlier for ATS scanning. Experience and projects are reordered by evidence overlap with the selected role. Review every line: this draft only uses detected profile details and does not add qualifications.`;
}

function buildCoverLetter(candidate: Candidate, analysis: ResumeAnalysis, job: JobMatch) {
  const targetTerms = [...job.tags, ...job.requiredSkills, ...job.requiredTechnologies].map((term) => term.toLowerCase());
  const matchingSkills = analysis.skills.filter((skill) => targetTerms.some((term) => skill.toLowerCase().includes(term)));
  const matchingExperience = analysis.experience.find((item) => targetTerms.some((term) => `${item.role} ${item.summary}`.toLowerCase().includes(term)));
  const evidence = matchingExperience?.summary ?? analysis.projects.find((project) => targetTerms.some((term) => project.toLowerCase().includes(term)));
  const requirements = [...job.requiredSkills, ...job.requiredTechnologies].join(', ') || 'the requirements listed for this role';
  return `Dear Hiring Team at ${job.company},\n\nI am writing to apply for the ${job.title} position. I am interested in the opportunity to contribute to ${job.company} using my experience with ${matchingSkills.slice(0, 4).join(', ') || 'the skills shown in my resume'}.\n\nMy background includes ${evidence || 'projects and experience described in my resume'}. This is relevant to the role's focus on ${requirements}.\n\n${candidate.summary || 'I would welcome the opportunity to discuss how my background aligns with this role.'}\n\nThank you for your consideration. I would welcome the opportunity to discuss how my verified experience could support the team at ${job.company}.\n\nSincerely,\n${candidate.fullName}\n${candidate.email}\n\nReview and personalize this draft with specific examples from your resume before sending. It does not add skills, experience, education, certifications, or achievements.`;
}

type InterviewQuestions = Record<string, string[]>;
type MockEvaluation = { relevance: number; technicalAccuracy: number; communication: number; completeness: number; strengths: string[]; improvements: string[] };

function buildInterviewQuestions(job: JobMatch, analysis: ResumeAnalysis): InterviewQuestions {
  const project = analysis.projects[0] ?? 'a project from your resume';
  const framework = job.requiredTechnologies.find((item) => /react|angular|vue|node|django|flask|fastapi|graphql/i.test(item)) ?? 'the framework used in your strongest project';
  const database = job.requiredTechnologies.find((item) => /sql|mongo|postgres|redis|database/i.test(item)) ?? 'the data store used in your experience';
  const api = job.requiredTechnologies.find((item) => /api|graphql|rest/i.test(item)) ?? 'an API integration from your experience';
  const tool = job.preferredTechnologies[0] ?? analysis.skillCategories.tools[0] ?? 'your development tools';
  return {
    Programming: [`Explain a programming decision you made in ${project}.`, 'How would you test and debug a change without changing behavior elsewhere?'],
    Frameworks: [`How would you structure a maintainable ${framework} feature for this role?`, 'Describe a framework trade-off you have actually encountered.'],
    Databases: [`How would you model and query data with ${database}?`, 'Describe a data-quality or performance issue you have handled, if one appears in your experience.'],
    APIs: [`How would you design or consume ${api} for a reliable user flow?`, 'How do you handle validation, authentication, errors, and versioning in an API?'],
    Tools: [`How have you used ${tool}, or a comparable tool, in work you can demonstrate?`, 'Which development workflow helps you keep changes reviewable and reliable?'],
    HR: ['Tell me about yourself.', 'What are your strengths?', 'What is one skill you are actively improving?', 'What are your career goals for the next two years?'],
    Projects: analysis.projects.length ? analysis.projects.slice(0, 4).map((item) => `Walk me through ${item}: what did you build, what was your contribution, and what would you improve?`) : [`Walk me through ${project} and the decisions you made.`],
    'Job-specific': [`Why are you interested in the ${job.title} role at ${job.company}?`, `How would you approach the responsibilities described for ${job.title}?`, `Which part of this role's requirements is closest to your verified experience, and what evidence supports it?`],
  };
}

function evaluateMockAnswer(answer: string, question: string, job: JobMatch): MockEvaluation {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const lowerAnswer = answer.toLowerCase();
  const roleTerms = [...job.requiredSkills, ...job.requiredTechnologies, ...job.tags].filter((term) => lowerAnswer.includes(term.toLowerCase()));
  const technicalTerms = ['because', 'trade-off', 'tradeoff', 'test', 'validate', 'debug', 'api', 'database', 'component', 'performance', 'security', 'accessibility'].filter((term) => lowerAnswer.includes(term));
  const hasStructure = /\b(situation|context|approach|action|result|outcome|impact|learned)\b/i.test(answer);
  const hasSpecificity = /\b\d+(?:\.\d+)?\s*(?:%|users?|customers?|days?|months?|years?)\b/i.test(answer);
  const relevance = Math.min(100, 35 + roleTerms.length * 18 + (lowerAnswer.includes(question.split(' ')[0].toLowerCase()) ? 8 : 0));
  const technicalAccuracy = Math.min(100, 42 + technicalTerms.length * 10 + (roleTerms.length ? 12 : 0));
  const communication = Math.min(100, 45 + (words.length >= 45 ? 25 : words.length >= 25 ? 15 : 0) + (hasStructure ? 20 : 0));
  const completeness = Math.min(100, 35 + (words.length >= 60 ? 25 : words.length >= 30 ? 15 : 0) + (hasStructure ? 20 : 0) + (hasSpecificity ? 15 : 0));
  return {
    relevance,
    technicalAccuracy,
    communication,
    completeness,
    strengths: [
      roleTerms.length ? `You connected the answer to ${roleTerms.slice(0, 3).join(', ')}.` : 'You started with a direct response to the prompt.',
      hasStructure ? 'Your answer included a clear explanation or outcome.' : words.length >= 25 ? 'Your answer had enough detail to build on.' : 'You kept the response focused.',
    ],
    improvements: [
      !roleTerms.length ? 'Tie the answer to one requirement or technology from this role.' : '',
      !hasStructure ? 'Use a simple context, action, and result structure.' : '',
      !hasSpecificity ? 'Add one accurate example, result, or observable outcome.' : '',
      words.length < 30 ? 'Expand the reasoning so the interviewer can follow your contribution.' : '',
    ].filter(Boolean),
  };
}

function Dashboard(props: {
  candidate: Candidate; analysis: ResumeAnalysis; resumeName: string; hasUploadedResume: boolean; jobs: ExplainableJobMatch[];
  applications: TrackedApplication[]; savedCount: number; applicationCount: number; interviewCount: number; shortlistedCount: number; selectedCount: number;
  currentSkills: string[]; missingSkills: string[]; roadmapProgress: number; setSection: (section: Section) => void;
}) {
  const stats = [
    { label: 'Suggested roles', value: props.jobs.length.toString(), note: 'Based on your career goal', icon: BriefcaseBusiness, color: 'lavender' },
    { label: 'Saved roles', value: props.savedCount.toString(), note: 'Keep your shortlist close', icon: Bookmark, color: 'mint' },
    { label: 'Applications', value: props.applicationCount.toString(), note: 'Tracked in your pipeline', icon: SendIcon, color: 'blue' },
    { label: 'Interviews', value: props.interviewCount.toString(), note: 'Prepare with practice prompts', icon: MessageSquareText, color: 'peach' },
    { label: 'Shortlisted', value: props.shortlistedCount.toString(), note: 'Roles moving forward', icon: Target, color: 'lavender' },
    { label: 'Selected', value: props.selectedCount.toString(), note: 'Offers or accepted roles', icon: BadgeCheck, color: 'mint' },
  ];
  const bestMatches = [...props.jobs].sort((a, b) => b.match - a.match).slice(0, 3);
  const recentActivity = [...props.applications].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 5);
  const statusCounts = statuses.map((status) => ({ status, count: props.applications.filter((item) => item.status === status).length }));
  const bestJob = bestMatches[0];
  const nextAction = !props.hasUploadedResume ? { label: 'Analyze your resume', note: 'Start with evidence so every recommendation is grounded.', target: 'resume' as Section } : props.missingSkills.length ? { label: 'Close your next skill gap', note: `${props.missingSkills[0]} is the first requirement to review.`, target: 'gap' as Section } : props.applications.length === 0 ? { label: 'Save your first role', note: 'Keep a promising opportunity visible in your application journey.', target: 'jobs' as Section } : { label: 'Prepare for your next conversation', note: 'Use role-specific prompts to turn your evidence into confident answers.', target: 'interview' as Section };
  return <>
    <section className="welcome-card">
      <div><span className="welcome-pill"><Sparkles size={14} /> YOUR NEXT STEP</span><h2>Good to see you, {props.candidate.fullName.split(' ')[0]}.</h2><p>{props.hasUploadedResume ? `Your ${props.resumeName} is parsed locally. Review the extracted skills, then explore relevant roles.` : 'Start with a resume review. We’ll use the skills we can extract to organize your job search.'}</p>
        <button className="button button-white" onClick={() => props.setSection(props.hasUploadedResume ? 'jobs' : 'resume')}>{props.hasUploadedResume ? 'Explore job matches' : 'Analyze my resume'} <ArrowRight size={16} /></button>
      </div>
      <div className="welcome-art" aria-hidden="true"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-center"><Sparkles size={28} /></div><span className="art-star star-a">✦</span><span className="art-star star-b">✧</span></div>
    </section>
    <div className="stat-grid">{stats.map(({ label, value, note, icon: Icon, color }) => <article className="stat-card" key={label}><span className={`stat-icon ${color}`}><Icon size={17} /></span><span className="stat-label">{label}</span><strong>{value}</strong><small>{note}</small></article>)}</div>
    <section className="assistant-briefing surface-card"><div className="assistant-briefing-icon"><Sparkles size={20} /></div><div className="assistant-briefing-copy"><p className="section-kicker">YOUR CAREER ASSISTANT</p><h2>{bestJob ? `${bestJob.title} at ${bestJob.company} is your strongest current fit.` : 'Your next career step starts with evidence.'}</h2><p>{bestJob ? `${bestJob.match}% fit based on your profile. ${bestJob.matchedSkills.length ? `${bestJob.matchedSkills.slice(0, 3).join(', ')} support the match.` : 'Review the role requirements before applying.'}` : 'Upload a resume to unlock personalized job guidance.'}</p></div><div className="assistant-next-step"><span>NEXT BEST ACTION</span><strong>{nextAction.label}</strong><small>{nextAction.note}</small><button className="text-button" onClick={() => props.setSection(nextAction.target)}>Open guidance <ArrowRight size={15} /></button></div></section>
    <div className="dashboard-insights"><section className="surface-card"><div className="card-heading"><div><p className="section-kicker">CURRENT PROFILE</p><h2>Skills in evidence</h2></div><button className="text-button" onClick={() => props.setSection('resume')}>Review <ArrowRight size={15} /></button></div><div className="tags-wrap">{props.currentSkills.length ? props.currentSkills.slice(0, 10).map((skill) => <span className="skill-chip" key={skill}>{skill}</span>) : <span className="empty-note">Upload a resume to detect skills.</span>}</div></section><section className="surface-card"><div className="card-heading"><div><p className="section-kicker">TARGET ROLE GAPS</p><h2>Skills to review</h2></div><button className="text-button" onClick={() => props.setSection('gap')}>Explore <ArrowRight size={15} /></button></div><div className="tags-wrap">{props.missingSkills.length ? props.missingSkills.slice(0, 8).map((skill) => <span className="skill-chip missing-chip" key={skill}>{skill}</span>) : <span className="ats-good">No explicit gaps detected.</span>}</div></section><section className="surface-card dashboard-readiness"><div className="card-heading"><div><p className="section-kicker">ROADMAP PROGRESS</p><h2>{props.roadmapProgress}% complete</h2></div><BookOpenText size={19} className="heading-icon" /></div><div className="progress-track"><span style={{ width: `${props.roadmapProgress}%` }} /></div><button className="text-button" onClick={() => props.setSection('roadmap')}>Open roadmap <ArrowRight size={15} /></button></section></div>
    <div className="content-grid dashboard-grid">
      <section className="surface-card">
        <div className="card-heading"><div><p className="section-kicker">OPPORTUNITIES</p><h2>Top job matches</h2></div><button className="text-button" onClick={() => props.setSection('jobs')}>See all <ArrowRight size={15} /></button></div>
        <div className="dashboard-jobs">{bestMatches.map((job) => <div className="dashboard-job" key={jobId(job)}><div className="company-monogram">{job.company.slice(0, 1)}</div><div className="dashboard-job-copy"><strong>{job.title}</strong><span>{job.company} · {job.workplace} · {job.location}</span><small>{job.matchedSkills.length ? `✓ ${job.matchedSkills.slice(0, 2).join(', ')}` : '⚠ No required skills detected yet'}</small><small>{job.factors.find((item) => item.key === 'experience')?.explanation}</small></div><span className="match-score">{job.match}% match</span></div>)}</div>
      </section>
      <section className="surface-card career-progress-card">
        <div className="card-heading"><div><p className="section-kicker">CAREER READINESS</p><h2>Profile snapshot</h2></div><BadgeCheck size={20} className="heading-icon" /></div>
        <div className="readiness-row"><div className="readiness-ring" style={{ '--progress': `${props.analysis.atsScore}%` } as React.CSSProperties}><strong>{props.analysis.atsScore}</strong><small>/100</small></div><div><strong>{props.hasUploadedResume ? 'Resume reviewed' : 'Sample profile'}</strong><p>{props.analysis.skills.length} skills currently listed</p></div></div>
        <div className="tags-wrap">{props.analysis.skills.slice(0, 6).map((skill) => <span className="skill-chip" key={skill}>{skill}</span>)}</div>
        <button className="text-button progress-link" onClick={() => props.setSection('resume')}>Review profile details <ArrowRight size={15} /></button>
      </section>
    </div>
    <div className="dashboard-bottom-grid"><section className="surface-card"><div className="card-heading"><div><p className="section-kicker">PIPELINE ACTIVITY</p><h2>Application activity</h2></div><button className="text-button" onClick={() => props.setSection('applications')}>Open tracker <ArrowRight size={15} /></button></div><div className="activity-bars">{statusCounts.map(({ status, count }) => <div className="activity-bar" key={status}><span>{status}</span><div className="progress-track"><span style={{ width: `${props.applications.length ? (count / props.applications.length) * 100 : 0}%` }} /></div><strong>{count}</strong></div>)}</div></section><section className="surface-card"><div className="card-heading"><div><p className="section-kicker">RECENT ACTIVITY</p><h2>Latest updates</h2></div></div>{recentActivity.length ? <div className="recent-activity">{recentActivity.map((item) => <div key={item.id}><span className="activity-dot" /><div><strong>{item.title}</strong><small>{item.company} moved to {item.status}</small></div><time>{item.updatedAt}</time></div>)}</div> : <p className="empty-note">Save a role or track an application to see activity here.</p>}</section></div>
    <section className="surface-card journey-card"><div className="card-heading"><div><p className="section-kicker">YOUR PATH</p><h2>From resume to ready</h2></div></div><div className="journey-steps">{[
      ['01', 'Analyze resume', 'Extract your experience and skills', 'resume'], ['02', 'Find your fit', 'Compare against sample roles', 'jobs'], ['03', 'Close skill gaps', 'Plan focused learning', 'gap'], ['04', 'Get interview-ready', 'Practice role-specific prompts', 'interview'],
    ].map(([number, title, note, target]) => <button className="journey-step" key={number} onClick={() => props.setSection(target as Section)}><span>{number}</span><strong>{title}</strong><small>{note}</small><ArrowRight size={15} /></button>)}</div></section>
  </>;
}

function SendIcon(props: { size: number }) { return <ArrowRight size={props.size} />; }

function ResumeSection(props: { analysis: ResumeAnalysis; name: string; hasUploaded: boolean; source: 'sample' | 'local' | 'ai'; isProcessing: boolean; isAIProcessing: boolean; canUseAI: boolean; error: string; onAIAnalysis: () => void; onFile: (file?: File) => void; onPaste: (text: string) => void }) {
  const [showPaste, setShowPaste] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [allowAI, setAllowAI] = useState(false);
  return <div className="section-stack">
    <section className="upload-banner surface-card"><div className="upload-icon"><Upload size={22} /></div><div className="upload-copy"><h2>{props.hasUploaded ? 'Resume imported' : 'Start with your resume'}</h2><p>{props.hasUploaded ? `${props.name} · processed ${props.name.toLowerCase().endsWith('.doc') ? 'by the authenticated Supabase function' : 'locally in your browser'}` : 'PDF, DOCX, and TXT are parsed in your browser. Legacy DOC uses the authenticated, non-persistent Supabase Edge Function.'}</p></div><label className={`button button-primary ${props.isProcessing ? 'button-disabled' : ''}`}><Upload size={16} />{props.isProcessing ? 'Reading file…' : props.hasUploaded ? 'Replace resume' : 'Choose a file'}<input className="visually-hidden" type="file" accept=".pdf,.doc,.docx,.txt" disabled={props.isProcessing} onChange={(event) => { props.onFile(event.target.files?.[0]); setAllowAI(false); event.currentTarget.value = ''; }} /></label></section>
    {props.canUseAI && props.hasUploaded && <section className="ai-consent-card surface-card"><label><input type="checkbox" checked={allowAI} onChange={(event) => setAllowAI(event.target.checked)} /><span><strong>Optional AI analysis</strong><small>When you opt in, the extracted resume text is sent to the AI provider configured for this Supabase project. It is not saved by this app. Review the provider’s data terms before continuing.</small></span></label><button className="button button-outline" disabled={!allowAI || props.isAIProcessing} onClick={props.onAIAnalysis}><Sparkles size={15} />{props.isAIProcessing ? 'Analyzing…' : 'Analyze with AI'}</button></section>}
    {props.error && <div className="inline-error" role="alert">{props.error}</div>}
    <button className="text-button" onClick={() => setShowPaste(!showPaste)}>{showPaste ? 'Hide text input' : 'Prefer to paste your resume text?'} <ChevronDown size={14} /></button>
    {showPaste && <section className="surface-card paste-card"><label htmlFor="resume-paste">Resume text</label><textarea id="resume-paste" value={pastedText} onChange={(event) => setPastedText(event.target.value)} placeholder="Paste resume content here…" rows={8} /><button className="button button-primary" onClick={() => { props.onPaste(pastedText); setAllowAI(false); }}>Analyze pasted text <ArrowRight size={15} /></button></section>}
    <section className="surface-card"><div className="card-heading"><div><p className="section-kicker">EXTRACTED PROFILE</p><h2>{props.hasUploaded ? 'Review before using' : 'Example profile preview'}</h2></div><span className={`source-pill ${props.source === 'ai' ? 'source-real' : ''}`}>{props.source === 'ai' ? 'AI-assisted · review results' : props.hasUploaded ? 'Local parser' : 'Sample data'}</span></div><p className="muted-copy">Local extraction is heuristic. PDF/DOCX/TXT are parsed in-browser; legacy DOC and optional AI analysis use authenticated, non-persistent Supabase Edge Functions. Scanned PDFs need OCR.</p>
      <div className="resume-identity"><span><strong>Name</strong>{props.analysis.name || 'Not detected'}</span><span><strong>Contact</strong>{props.analysis.contact || 'Not detected'}</span></div>
      <div className="resume-analysis-grid">
        <InfoGroup title="Programming languages" empty="None detected." isEmpty={!props.analysis.skillCategories.languages.length}><div className="tags-wrap">{props.analysis.skillCategories.languages.map((skill) => <span className="skill-chip" key={skill}>{skill}</span>)}</div></InfoGroup>
        <InfoGroup title="Frameworks & platforms" empty="None detected." isEmpty={!props.analysis.skillCategories.frameworks.length}><div className="tags-wrap">{props.analysis.skillCategories.frameworks.map((skill) => <span className="skill-chip" key={skill}>{skill}</span>)}</div></InfoGroup>
        <InfoGroup title="Tools & technical skills" empty="None detected." isEmpty={!props.analysis.skillCategories.tools.length}><div className="tags-wrap">{props.analysis.skillCategories.tools.map((skill) => <span className="skill-chip" key={skill}>{skill}</span>)}</div></InfoGroup>
        <InfoGroup title="Education" empty="No education lines detected." isEmpty={!props.analysis.education.length}><ul className="detail-list">{props.analysis.education.map((item) => <li key={item}>{item}</li>)}</ul></InfoGroup>
        <InfoGroup title="Work experience" empty="No role titles detected." isEmpty={!props.analysis.experience.length}><ul className="detail-list">{props.analysis.experience.map((item) => <li key={item.role}><strong>{item.role}</strong><span>{item.tenure} · {item.summary}</span></li>)}</ul></InfoGroup>
        <InfoGroup title="Internships" empty="No internship lines detected." isEmpty={!props.analysis.internships.length}><ul className="detail-list">{props.analysis.internships.map((item) => <li key={item}>{item}</li>)}</ul></InfoGroup>
        <InfoGroup title="Projects" empty="No project lines detected." isEmpty={!props.analysis.projects.length}><ul className="detail-list">{props.analysis.projects.map((item) => <li key={item}>{item}</li>)}</ul></InfoGroup>
        <InfoGroup title="Certifications" empty="No certification lines detected." isEmpty={!props.analysis.certifications.length}><ul className="detail-list">{props.analysis.certifications.map((item) => <li key={item}>{item}</li>)}</ul></InfoGroup>
        <InfoGroup title="Achievements" empty="No achievements detected." isEmpty={!props.analysis.achievements.length}><ul className="detail-list">{props.analysis.achievements.map((item) => <li key={item}>{item}</li>)}</ul></InfoGroup>
        <InfoGroup title="Career interests" empty="No career interests detected." isEmpty={!props.analysis.interests.length}><ul className="detail-list">{props.analysis.interests.map((item) => <li key={item}>{item}</li>)}</ul></InfoGroup>
      </div>
    </section>
  </div>;
}

function AtsSection(props: { report: ReturnType<typeof analyzeAtsCompatibility>; jobs: ExplainableJobMatch[]; selectedJob: JobMatch; hasResume: boolean; isSample: boolean; onChooseJob: (job: JobMatch) => void; onUpload: () => void }) {
  if (!props.hasResume && !props.isSample) return <section className="surface-card empty-state"><ScanSearch size={26} /><h2>Upload a resume to run an ATS review</h2><p>The report checks extracted text and compares role-specific keywords. It won’t invent missing credentials.</p><button className="button button-primary" onClick={props.onUpload}><Upload size={15} />Go to resume analysis</button></section>;
  const requiredMissing = props.report.missingKeywords.filter((item) => item.kind === 'Required');
  const preferredMissing = props.report.missingKeywords.filter((item) => item.kind === 'Preferred');
  return <div className="section-stack">
    <section className="ats-hero surface-card">
      <div className="ats-score-ring" style={{ '--ats-score': `${props.report.score}%` } as React.CSSProperties}><div><strong>{props.report.score}</strong><small>/100</small></div></div>
      <div className="ats-summary"><p className="section-kicker">ATS COMPATIBILITY ESTIMATE {props.isSample && '· SAMPLE'}</p><h2>{props.report.scoreLabel}</h2><p>Text-based estimate from contact info, structure, role keywords, readability, and evidence—not a score from a specific ATS vendor. Visual layout cannot be evaluated from extracted text.</p><span>{props.report.wordCount} words reviewed · {props.selectedJob.title} at {props.selectedJob.company}</span></div>
      <label className="ats-role-picker">Compare with<select value={jobId(props.selectedJob)} onChange={(event) => { const job = props.jobs.find((item) => jobId(item) === event.target.value); if (job) props.onChooseJob(job); }}>{props.jobs.map((job) => <option key={jobId(job)} value={jobId(job)}>{job.title} · {job.company}</option>)}</select></label>
    </section>
    <div className="ats-grid">
      <section className="surface-card ats-panel"><div className="card-heading"><div><p className="section-kicker">DOCUMENT STRUCTURE</p><h2>Resume structure</h2></div><span className="source-pill">{props.report.structure.filter((item) => item.present).length}/{props.report.structure.length} detected</span></div><ul className="ats-check-list">{props.report.structure.map((item) => <li key={item.label} className={item.present ? 'ats-pass' : 'ats-missing'}><span>{item.present ? '✓' : '○'}</span><div><strong>{item.label}</strong><small>{item.note}</small></div></li>)}</ul></section>
      <section className="surface-card ats-panel"><div className="card-heading"><div><p className="section-kicker">ROLE KEYWORDS</p><h2>Missing keywords</h2></div><span className="source-pill">{props.report.skillRelevance.percent}% skill relevance</span></div><div className="keyword-groups"><div><strong>Found in your resume</strong>{props.report.skillRelevance.matched.length ? <div className="tags-wrap">{props.report.skillRelevance.matched.map((keyword) => <span className="skill-chip ats-found" key={keyword}>✓ {keyword}</span>)}</div> : <p className="ats-empty">No selected-role keywords detected yet.</p>}</div><div><strong>Required but not detected</strong>{requiredMissing.length ? <div className="tags-wrap">{requiredMissing.map((item) => <span className="skill-chip ats-warning" key={item.keyword}>⚠ {item.keyword}</span>)}</div> : <p className="ats-empty">No missing required keywords detected.</p>}</div>{preferredMissing.length > 0 && <div><strong>Preferred, not required</strong><div className="tags-wrap">{preferredMissing.map((item) => <span className="skill-chip" key={item.keyword}>{item.keyword}</span>)}</div></div>}</div><p className="ats-caution">Only add a keyword when it accurately reflects skills or experience you can support.</p></section>
      <section className="surface-card ats-panel"><div className="card-heading"><div><p className="section-kicker">RELEVANCE</p><h2>Skill & experience fit</h2></div></div><div className="relevance-item"><span>Skills</span><strong>{props.report.skillRelevance.percent}%</strong><div className="progress-track"><span style={{ width: `${props.report.skillRelevance.percent}%` }} /></div></div><div className="relevance-item"><span>Experience evidence</span><strong>{props.report.experienceRelevance.percent === null ? '—' : `${props.report.experienceRelevance.percent}%`}</strong><p>{props.report.experienceRelevance.note}</p></div></section>
      <section className="surface-card ats-panel"><div className="card-heading"><div><p className="section-kicker">CONTENT REVIEW</p><h2>Weak sections</h2></div></div>{props.report.weakSections.length ? <ul className="ats-text-list">{props.report.weakSections.map((item) => <li key={item}>{item} was not detected in the resume text.</li>)}</ul> : <p className="ats-good">Core Skills, Experience, and Education content was detected.</p>}<h3>Formatting issues</h3><ul className="ats-text-list">{props.report.formattingIssues.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="surface-card ats-panel ats-suggestions"><div className="card-heading"><div><p className="section-kicker">NEXT STEPS</p><h2>Improvement suggestions</h2></div><ShieldCheck size={18} className="heading-icon" /></div><ul className="ats-text-list">{props.report.suggestions.map((item) => <li key={item}>{item}</li>)}</ul><p className="ats-caution">No achievements, degrees, skills, or work history have been added by this analysis.</p></section>
    </div>
  </div>;
}

function JobDescriptionSection(props: {
  resumeReady: boolean; isSample: boolean; canUseAI: boolean; text: string; fileName: string;
  report: JobDescriptionReport | null; source: 'local' | 'ai' | null; error: string;
  isProcessing: boolean; isAIProcessing: boolean; onTextChange: (text: string) => void;
  onFile: (file?: File) => void; onAnalyze: () => void; onAIAnalyze: () => void;
}) {
  const [allowAI, setAllowAI] = useState(false);
  return <div className="section-stack">
    <section className="jd-input-card surface-card">
      <div className="card-heading"><div><p className="section-kicker">RESUME ↔ JOB DESCRIPTION</p><h2>Compare a role with your evidence</h2></div>{props.source && <span className={`source-pill ${props.source === 'ai' ? 'source-real' : ''}`}>{props.source === 'ai' ? 'AI-assisted · review' : 'Local analysis'}</span>}</div>
      <p className="muted-copy">Paste or upload a job description. The local comparison checks extracted keywords and resume evidence. No missing qualification is added to your resume.</p>
      <label className="jd-upload-label"><Upload size={15} />{props.isProcessing ? 'Reading description…' : props.fileName ? `Loaded: ${props.fileName}` : 'Upload PDF, DOCX, or TXT'}<input className="visually-hidden" type="file" accept=".pdf,.docx,.txt" disabled={props.isProcessing} onChange={(event) => { props.onFile(event.target.files?.[0]); setAllowAI(false); event.currentTarget.value = ''; }} /></label>
      <label className="jd-text-label" htmlFor="job-description-text">Job description text</label>
      <textarea id="job-description-text" className="jd-textarea" value={props.text} onChange={(event) => { props.onTextChange(event.target.value); setAllowAI(false); }} placeholder={'Paste the complete job description here…\n\nInclude responsibilities, required skills, education, and experience for a more useful comparison.'} rows={11} />
      <div className="jd-input-footer"><span>{props.text.length.toLocaleString()} characters</span><button className="button button-primary" disabled={props.text.trim().length < 40 || !props.resumeReady} onClick={props.onAnalyze}><Search size={15} />Compare locally</button></div>
      {!props.resumeReady && <p className="inline-error">Upload a resume before comparing job requirements to your profile.</p>}
      {props.error && <p className="inline-error" role="alert">{props.error}</p>}
      {props.canUseAI && !props.isSample && props.resumeReady && <div className="jd-ai-consent"><label><input type="checkbox" checked={allowAI} onChange={(event) => setAllowAI(event.target.checked)} /><span><strong>Optional AI comparison</strong><small>With your consent, both the resume text and job description will be sent to the AI provider configured for this Supabase project. Review provider data terms first; this app does not store the request.</small></span></label><button className="button button-outline" disabled={!allowAI || props.isAIProcessing || props.text.trim().length < 40} onClick={props.onAIAnalyze}><Sparkles size={15} />{props.isAIProcessing ? 'Comparing…' : 'Compare with AI'}</button></div>}
      {props.isSample && <p className="jd-sample-note">Sample resume profile is active. Upload your own resume for a personal comparison.</p>}
    </section>
    {props.report && <section className="section-stack jd-results">
      <div className="jd-score-card surface-card"><div className="jd-score-circle"><strong>{props.report.overallCompatibility}%</strong><small>compatibility</small></div><div><p className="section-kicker">JOB COMPATIBILITY {props.isSample && '· SAMPLE PROFILE'}</p><h2>{props.report.title || 'Pasted job description'}</h2><p>Compared against the current resume profile using {props.source === 'ai' ? 'AI-assisted analysis' : 'local keyword and evidence checks'}.</p></div></div>
      <div className="jd-result-grid">
        <section className="surface-card jd-result-card"><div className="card-heading"><h2>Matched skills</h2><span className="jd-positive-count">{props.report.matchedSkills.length} found</span></div>{props.report.matchedSkills.length ? <div className="tags-wrap">{props.report.matchedSkills.map((skill) => <span className="skill-chip ats-found" key={skill}>✓ {skill}</span>)}</div> : <p className="empty-note">No recognized matching skills found yet.</p>}</section>
        <section className="surface-card jd-result-card"><div className="card-heading"><h2>Missing skills</h2><span className="source-pill">Review only</span></div>{props.report.missingSkills.length ? <div className="tags-wrap">{props.report.missingSkills.map((skill) => <span className="skill-chip ats-warning" key={skill}>• {skill}</span>)}</div> : <p className="ats-good">No recognized skill gaps detected.</p>}</section>
        <section className="surface-card jd-result-card"><div className="card-heading"><h2>Matching experience</h2></div>{props.report.matchingExperience.length ? <ul className="ats-text-list">{props.report.matchingExperience.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="empty-note">No matching resume experience was detected.</p>}</section>
        <section className="surface-card jd-result-card"><div className="card-heading"><h2>Missing experience</h2></div>{props.report.missingExperience.length ? <ul className="ats-text-list">{props.report.missingExperience.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="ats-good">No explicit experience gap was detected.</p>}</section>
        <section className="surface-card jd-result-card"><div className="card-heading"><h2>Education compatibility</h2><span className={`education-status education-${props.report.educationCompatibility.status}`}>{props.report.educationCompatibility.status.replace('-', ' ')}</span></div><p className="jd-detail-copy">{props.report.educationCompatibility.detail}</p></section>
        <section className="surface-card jd-result-card"><div className="card-heading"><h2>Important keywords</h2></div>{props.report.importantKeywords.length ? <div className="tags-wrap">{props.report.importantKeywords.map((keyword) => <span className="skill-chip" key={keyword}>{keyword}</span>)}</div> : <p className="empty-note">No high-signal keywords were extracted.</p>}</section>
        <section className="surface-card jd-result-card jd-recommendations"><div className="card-heading"><h2>Recommended improvements</h2><ShieldCheck size={18} className="heading-icon" /></div><ul className="ats-text-list">{props.report.recommendedImprovements.map((item) => <li key={item}>{item}</li>)}</ul><p className="ats-caution">Use these as review prompts. Do not claim skills, education, achievements, or experience you do not have.</p></section>
      </div>
    </section>}
  </div>;
}

function InfoGroup(props: { title: string; empty: string; isEmpty?: boolean; children: React.ReactNode }) { return <div className="info-group"><h3>{props.title}</h3>{props.isEmpty ? <p className="empty-note">{props.empty}</p> : props.children}</div>; }

function MatchBreakdown(props: { factors: ExplainableJobMatch['factors'] }) {
  return <div className="factor-grid">{props.factors.map((item) => <div className={`factor-item factor-${item.status}`} key={item.key}><span className="factor-mark">{item.status === 'match' ? '✓' : item.status === 'gap' ? '⚠' : item.status === 'partial' ? '◐' : '—'}</span><div><strong>{item.label}<small>{item.score === null ? 'Not scored' : `${item.score}% · ${item.weight}% weight`}</small></strong><p>{item.explanation}</p></div></div>)}</div>;
}

function matchesJobFilters(job: JobMatch, search: string, filters: JobFilters) {
  const searchable = `${job.title} ${job.company} ${job.location} ${job.workplace} ${job.tags.join(' ')} ${job.requiredSkills.join(' ')} ${job.requiredTechnologies.join(' ')} ${job.description}`.toLowerCase();
  const query = search.trim().toLowerCase();
  const skillText = [...job.tags, ...job.requiredSkills, ...job.requiredTechnologies, ...job.preferredTechnologies].join(' ').toLowerCase();
  const minSalary = Number(filters.salaryMin) || 0;
  const maxSalary = Number(filters.salaryMax) || 0;
  const postedLimit = filters.postedWithin === 'Any' ? null : Number(filters.postedWithin);
  return (!query || searchable.includes(query))
    && (!filters.title || job.title.toLowerCase().includes(filters.title.toLowerCase()))
    && (!filters.location || `${job.location} ${job.workplace}`.toLowerCase().includes(filters.location.toLowerCase()))
    && (filters.workplace === 'Any' || job.workplace === filters.workplace)
    && (filters.experienceLevel === 'Any' || job.experienceLevel === filters.experienceLevel)
    && (!minSalary || job.salaryMax >= minSalary)
    && (!maxSalary || job.salaryMin <= maxSalary)
    && (!filters.skill || skillText.includes(filters.skill.toLowerCase()))
    && (filters.employmentType === 'Any' || job.employmentType === filters.employmentType)
    && (postedLimit === null || job.postedDaysAgo <= postedLimit);
}

function formatPostedDate(days: number) {
  if (days === 0) return 'Posted today';
  if (days === 1) return 'Posted yesterday';
  return `Posted ${days} days ago`;
}

function JobsSection(props: {
  jobs: ExplainableJobMatch[]; search: string; setSearch: (value: string) => void;
  filters: JobFilters; setFilters: (filters: JobFilters) => void;
  applications: TrackedApplication[]; onTrack: (job: JobMatch, status: ApplicationStatus) => void;
  onRemove: (job: JobMatch) => void;
  onApply: (job: JobMatch) => void; onSelect: (job: JobMatch) => void;
}) {
  const updateFilter = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => props.setFilters({ ...props.filters, [key]: value });
  const clearFilters = () => { props.setSearch(''); props.setFilters(initialJobFilters); };
  return <div className="section-stack">
    <div className="jobs-toolbar"><label className="search-field"><Search size={17} /><input aria-label="Search jobs" placeholder="Search job titles, companies, descriptions, or skills…" value={props.search} onChange={(event) => props.setSearch(event.target.value)} /></label><span className="source-pill">{props.jobs.length} sample results</span></div>
    <section className="surface-card job-filter-panel"><div className="job-filter-heading"><div><p className="section-kicker">REFINE RESULTS</p><h2>Job filters</h2></div><button className="text-button" onClick={clearFilters}>Clear all</button></div>
      <div className="job-filter-grid">
        <label>Job title<input value={props.filters.title} onChange={(event) => updateFilter('title', event.target.value)} placeholder="e.g. Frontend Engineer" /></label>
        <label>Location<input value={props.filters.location} onChange={(event) => updateFilter('location', event.target.value)} placeholder="City, state, or country" /></label>
        <label>Work arrangement<select value={props.filters.workplace} onChange={(event) => updateFilter('workplace', event.target.value as JobFilters['workplace'])}><option>Any</option><option>Remote</option><option>Hybrid</option><option>On-site</option><option>Flexible</option></select></label>
        <label>Experience level<select value={props.filters.experienceLevel} onChange={(event) => updateFilter('experienceLevel', event.target.value as JobFilters['experienceLevel'])}><option>Any</option><option>Entry</option><option>Mid</option><option>Senior</option></select></label>
        <div className="salary-filter"><span>Annual salary (USD)</span><div><label><input aria-label="Minimum salary" type="number" min="0" step="5000" value={props.filters.salaryMin} onChange={(event) => updateFilter('salaryMin', event.target.value)} placeholder="Min" /></label><span>to</span><label><input aria-label="Maximum salary" type="number" min="0" step="5000" value={props.filters.salaryMax} onChange={(event) => updateFilter('salaryMax', event.target.value)} placeholder="Max" /></label></div></div>
        <label>Skills or technologies<input value={props.filters.skill} onChange={(event) => updateFilter('skill', event.target.value)} placeholder="e.g. Python, React" /></label>
        <label>Employment type<select value={props.filters.employmentType} onChange={(event) => updateFilter('employmentType', event.target.value as JobFilters['employmentType'])}><option>Any</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></label>
        <label>Date posted<select value={props.filters.postedWithin} onChange={(event) => updateFilter('postedWithin', event.target.value as JobFilters['postedWithin'])}><option value="Any">Any time</option><option value="1">Past 24 hours</option><option value="7">Past 7 days</option><option value="30">Past 30 days</option></select></label>
      </div>
    </section>
    <div className="job-source-note"><span className="source-type-badge platform-source">Platform listing</span><span>TalentHUNT catalog sample</span><span className="source-type-badge external-source">External source</span><span>Sample partner feed, attributed on each card. No live job API is connected.</span></div>
    {props.jobs.length === 0 && <section className="surface-card empty-state"><Search size={24} /><h2>No jobs match these filters</h2><p>Adjust the search or clear filters to see the available sample listings.</p></section>}
    <div className="job-results">{props.jobs.map((job) => {
      const app = props.applications.find((item) => item.id === jobId(job));
      return <article className="job-result surface-card" key={jobId(job)}>
        <div className="job-company-row"><div className="company-monogram">{job.company.slice(0, 1)}</div><div><span className="company-name">{job.company}</span><span className="job-location"><MapPin size={13} /> {job.workplace} · {job.location}</span></div><span className="match-score">{job.match}% match</span></div>
        <div className="job-source-row"><span className={`source-type-badge ${job.sourceType === 'platform' ? 'platform-source' : 'external-source'}`}>{job.sourceType === 'platform' ? 'Platform listing' : 'External source'}</span><span>{job.sourceName}</span><small>{formatPostedDate(job.postedDaysAgo)}</small></div>
        <h2>{job.title}</h2>
        <div className="job-meta"><span>{job.salary || 'Salary not listed'}</span><span>{job.employmentType}</span><span>{job.experienceLevel} · {job.minimumExperienceYears === null ? 'Experience not specified' : `${job.minimumExperienceYears}+ years`}</span></div>
        <p className="job-description">{job.description}</p>
        <div className="tags-wrap">{job.tags.map((tag) => <span className="skill-chip" key={tag}>{tag}</span>)}</div>
        <div className="job-keyword-reasons">
          {job.matchedSkills.map((skill) => <p className="job-reason good" key={`matched-${skill}`}><CheckCircle2 size={14} /> {skill} matched in your profile</p>)}
          {job.missingSkills.map((skill) => <p className="job-reason warning" key={`missing-${skill}`}>⚠ {skill} required keyword not detected</p>)}
          {job.matchedPreferredTechnologies.map((skill) => <p className="job-reason good" key={`preferred-match-${skill}`}><CheckCircle2 size={14} /> {skill} preferred skill found</p>)}
          {job.missingPreferredTechnologies.map((skill) => <p className="job-reason warning" key={`preferred-${skill}`}>⚠ {skill} preferred, not detected</p>)}
        </div>
        <details className="match-explanation" open><summary>How this match was calculated</summary><MatchBreakdown factors={job.factors} /><p className="muted-copy">{job.sourceType === 'platform' ? 'Platform sample record' : 'External sample listing'}; not a live vacancy. Matching is keyword/profile fit, not a hiring prediction.</p></details>
        <div className="job-actions"><button className="button button-subtle" onClick={() => app?.status === 'Saved' ? props.onRemove(job) : props.onTrack(job, 'Saved')}><Bookmark size={15} />{app?.status === 'Saved' ? 'Remove saved' : 'Save job'}</button><button className="button button-outline" onClick={() => props.onSelect(job)}>See full match <ArrowRight size={15} /></button><button className="button button-primary" onClick={() => props.onApply(job)}>{app?.status === 'Applied' ? 'Applied · tracked' : 'Apply'} <ArrowRight size={15} /></button></div>
      </article>;
    })}</div>
  </div>;
}

function MatchSection(props: { jobs: ExplainableJobMatch[]; selectedJob: ExplainableJobMatch; selectedJobId: string; onChoose: (job: JobMatch) => void; onTailor: () => void; onCoverLetter: () => void; onTrack: (job: JobMatch, status: ApplicationStatus) => void }) {
  const fitReasons = props.selectedJob.factors.filter((item) => item.score !== null && item.score >= 70).slice(0, 4);
  const gaps = [...props.selectedJob.missingSkills, ...props.selectedJob.missingPreferredTechnologies];
  const experienceNote = props.selectedJob.factors.find((item) => item.key === 'experience')?.explanation ?? 'Review the role requirements against your verified experience.';
  return <div className="section-stack"><section className="surface-card"><div className="card-heading"><div><p className="section-kicker">ROLE COMPARISON</p><h2>Choose a sample role</h2></div><span className="source-pill">Illustrative comparison</span></div><div className="role-select-list">{props.jobs.map((job) => <button key={jobId(job)} className={`role-option ${jobId(job) === (props.selectedJobId || jobId(props.selectedJob)) ? 'selected' : ''}`} onClick={() => props.onChoose(job)}><span className="company-monogram">{job.company[0]}</span><span><strong>{job.title}</strong><small>{job.company} · {job.workplace} · {job.location}</small></span><span className="match-score">{job.match}%</span></button>)}</div></section>
    <section className="match-overview surface-card"><div className="match-summary"><span className="match-large">{props.selectedJob.match}<small>%</small></span><div><p className="section-kicker">MULTI-FACTOR JOB MATCH</p><h2>{props.selectedJob.title}</h2><p>{props.selectedJob.company} · {props.selectedJob.workplace} · {props.selectedJob.location} · {props.selectedJob.salary}</p></div></div><div className="fit-answer-grid"><div><p className="section-kicker">WHY THIS FITS</p><ul className="assistant-list">{fitReasons.length ? fitReasons.map((item) => <li key={item.key}><CheckCircle2 size={14} />{item.explanation}</li>) : <li><Target size={14} />Review the factor breakdown to understand this role before applying.</li>}</ul></div><div><p className="section-kicker">WHAT YOU ARE MISSING</p><ul className="assistant-list">{gaps.length ? gaps.slice(0, 5).map((gap) => <li key={gap}><TrendingUp size={14} />{gap} is not currently supported by your resume evidence.</li>) : <li><CheckCircle2 size={14} />No explicit requirement gaps were detected.</li>}</ul></div><div><p className="section-kicker">HOW TO BECOME ELIGIBLE</p><p className="assistant-copy">{experienceNote} Use the Skill Gap plan to learn missing requirements and record a truthful project before claiming new evidence.</p></div><div><p className="section-kicker">HOW TO APPLY</p><p className="assistant-copy">Review the tailored resume, personalize the cover letter, confirm the job link, then track the application and follow-up date.</p></div></div><MatchBreakdown factors={props.selectedJob.factors} /><div className="notice-callout"><ShieldCheck size={17} /><p>Unknown profile details are excluded rather than treated as a mismatch. Only add missing qualifications to your resume if you can verify them.</p></div><div className="job-actions"><button className="button button-subtle" onClick={props.onTailor}><WandSparkles size={15} />Improve resume</button><button className="button button-outline" onClick={props.onCoverLetter}><Mail size={15} />Draft cover letter</button><button className="button button-primary" onClick={() => props.onTrack(props.selectedJob, 'Applied')}>Track application</button></div></section></div>;
}

function SkillGapSection(props: { jobs: ExplainableJobMatch[]; selectedJob: JobMatch; selectedJobId: string; analysis: ResumeAnalysis; resumeText: string; isSample: boolean; onChoose: (job: JobMatch) => void }) {
  const plan = analyzeSkillGaps(props.selectedJob, props.analysis, props.resumeText);
  const empty = !plan.mustLearn.length && !plan.recommended.length && !plan.niceToHave.length;
  return <div className="section-stack">
    <section className="surface-card skill-gap-target"><div><p className="section-kicker">PERSONALIZED LEARNING PRIORITIES</p><h2>Target Role: {props.selectedJob.title}</h2><p>Gaps are based on this role’s requirements and skills detected in your current resume evidence.</p></div><label>Compare with<select aria-label="Skill gap target role" value={jobId(props.selectedJob)} onChange={(event) => { const job = props.jobs.find((item) => jobId(item) === event.target.value); if (job) props.onChoose(job); }}>{props.jobs.map((job) => <option key={jobId(job)} value={jobId(job)}>{job.title} · {job.company}</option>)}</select></label></section>
    <section className="surface-card skill-gap-current"><div className="card-heading"><div><p className="section-kicker">CURRENT PROFILE</p><h2>Skills found in your resume</h2></div><span className="source-pill">{plan.currentSkills.length} detected</span></div>{plan.currentSkills.length ? <div className="tags-wrap">{plan.currentSkills.map((skill) => <span className="skill-chip current-skill" key={skill}><CheckCircle2 size={12} />{skill}</span>)}</div> : <p className="empty-note">No current skills detected. Review the resume analysis for extraction results.</p>}</section>
    {props.isSample && <p className="skill-gap-sample-note">Using the illustrative sample resume and job listing. Upload your own resume to personalize these gaps.</p>}
    <section className="section-intro-card surface-card"><TrendingUp size={22} /><div><h2>Learn in priority order—not just for keywords.</h2><p>Required skills are marked Must Learn; employer-preferred skills are Recommended. Nice to Have topics are optional adjacent suggestions. A missing term only means it wasn’t found in the current text.</p></div></section>
    {empty ? <section className="surface-card empty-state"><CheckCircle2 size={25} /><h2>No explicit skill gaps detected</h2><p>The role’s listed skills and technologies appear in your resume evidence. Confirm the examples reflect work you can discuss.</p></section> : <div className="skill-gap-groups">
      <SkillGapGroup title="Must Learn" description="Required role skills not found in your resume text." items={plan.mustLearn} />
      <SkillGapGroup title="Recommended" description="Preferred role skills not found; useful but not stated as mandatory." items={plan.recommended} />
      <SkillGapGroup title="Nice to Have" description="Optional related capabilities based on this target role." items={plan.niceToHave} />
    </div>}
    <div className="notice-callout"><ShieldCheck size={17} /><p>Suggestions and durations are estimates. Practice projects are learning prompts, not work you can claim until you have actually completed them.</p></div>
  </div>;
}

function SkillGapGroup(props: { title: SkillGapItem['bucket']; description: string; items: SkillGapItem[] }) {
  const [expanded, setExpanded] = useState(true);
  return <section className={`surface-card skill-gap-group priority-group-${props.title.toLowerCase().replaceAll(' ', '-')}`}>
    <button className="skill-gap-group-header" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><span><strong>{props.title}</strong><small>{props.description}</small></span><span className="skill-gap-count">{props.items.length} skills <ChevronDown size={15} /></span></button>
    {expanded && (props.items.length ? <div className="gap-list">{props.items.map((item, index) => <article className="gap-card" key={item.name}><div className="gap-number">{String(index + 1).padStart(2, '0')}</div><div className="gap-content"><div className="gap-heading"><h3>{item.name}</h3><span className="priority-tag">{item.difficulty}</span></div><p>{item.why}</p><div className="gap-plan-grid"><div><strong>Recommended learning sequence</strong><span>{item.sequence}</span></div><div><strong>Suggested project</strong><span>{item.project}</span></div></div></div><span className="time-estimate"><Clock3 size={14} />{item.estimate}</span></article>)}</div> : <p className="empty-note skill-gap-empty">No {props.title.toLowerCase()} gaps detected for this target role.</p>)}
  </section>;
}

function RoadmapSection(props: { steps: { phase: string; title: string; completed: boolean }[]; completed: string[]; targetRole: string; currentSkills: string[]; onToggle: (phase: string) => void }) {
  const doneCount = props.steps.filter((step) => props.completed.includes(step.phase)).length;
  return <div className="section-stack"><section className="roadmap-target surface-card"><div><p className="section-kicker">PERSONALIZED ROADMAP</p><h2>{props.targetRole}</h2><p>Built from your current profile and the selected role requirements.</p></div><div><strong>Current skills</strong><div className="tags-wrap">{props.currentSkills.length ? props.currentSkills.slice(0, 8).map((skill) => <span className="skill-chip" key={skill}>{skill}</span>) : <span className="empty-note">No skills detected yet</span>}</div></div></section><section className="roadmap-progress surface-card"><div><p className="section-kicker">YOUR LEARNING PLAN</p><h2>{doneCount} of {props.steps.length} steps complete</h2></div><div className="progress-track"><span style={{ width: `${doneCount / props.steps.length * 100}%` }} /></div></section><div className="roadmap-list">{props.steps.map((step, index) => { const done = props.completed.includes(step.phase); return <article className={`roadmap-item surface-card ${done ? 'completed' : ''}`} key={step.phase}><button aria-label={`${done ? 'Mark incomplete' : 'Mark complete'}: ${step.title}`} className="step-check" onClick={() => props.onToggle(step.phase)}>{done && <Check size={16} />}</button><span className="roadmap-phase">{step.phase}</span><div><h2>{step.title}</h2><p>{index === 0 ? 'Use your detected skills as the foundation and confirm what you can demonstrate.' : index === 3 ? 'Complete the project honestly and keep a short record of the evidence you can discuss.' : index === 4 ? 'Practice answers using real examples from your experience.' : 'Work through this step, then mark it complete when you can demonstrate the result.'}</p></div><ArrowRight size={16} /></article>; })}</div></div>;
}

function DraftSection(props: { title: string; description: string; text: string; setText: (value: string) => void; onGenerate: () => void; onDownload: () => void; emptyMessage: string }) {
  const [copied, setCopied] = useState(false);
  const copyDraft = async () => {
    if (!props.text) return;
    try {
      await navigator.clipboard.writeText(props.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return <div className="section-stack"><section className="section-intro-card surface-card"><WandSparkles size={22} /><div><h2>{props.title}</h2><p>{props.description}</p></div><button className="button button-primary" onClick={props.onGenerate}><Sparkles size={15} />{props.text ? 'Regenerate draft' : 'Create draft'}</button></section><section className="surface-card draft-card"><div className="card-heading"><div><p className="section-kicker">EDIT BEFORE YOU USE</p><h2>Working draft</h2></div>{props.text && <div className="job-actions draft-actions"><button className="button button-outline" onClick={() => void copyDraft()}><Copy size={15} />{copied ? 'Copied' : 'Copy'}</button><button className="button button-outline" onClick={props.onDownload}><ArrowDownToLine size={15} />Download .txt</button></div>}</div><textarea className="draft-editor" aria-label={props.title} placeholder={props.emptyMessage} value={props.text} onChange={(event) => props.setText(event.target.value)} rows={18} /><p className="editor-footnote"><ShieldCheck size={14} />Review all claims and personalize the draft. This evidence-only draft does not add qualifications.</p></section></div>;
}

function InterviewSection(props: { job: JobMatch; questions: InterviewQuestions; answer: string; setAnswer: (answer: string) => void }) {
  const wordCount = props.answer.trim() ? props.answer.trim().split(/\s+/).length : 0;
  const mockQuestions = [...(props.questions['Job-specific'] ?? []), ...(props.questions.Projects ?? []), ...(props.questions.Technical ?? [])];
  const [mockIndex, setMockIndex] = useState(0);
  const [mockFeedback, setMockFeedback] = useState<MockEvaluation | null>(null);
  const currentMockQuestion = mockQuestions[mockIndex % mockQuestions.length];
  const submitMockAnswer = () => {
    if (!props.answer.trim()) return;
    setMockFeedback(evaluateMockAnswer(props.answer, currentMockQuestion, props.job));
  };
  const nextMockQuestion = () => {
    setMockIndex((index) => index + 1);
    setMockFeedback(null);
    props.setAnswer('');
  };
  return <div className="section-stack"><section className="section-intro-card surface-card"><MessageSquareText size={22} /><div><p className="section-kicker">{props.job.title} · {props.job.company}</p><h2>Practice out loud, then reflect.</h2><p>Questions are grounded in this role's requirements and the projects detected in your resume.</p></div></section><section className="mock-interview-card surface-card"><div className="card-heading"><div><p className="section-kicker">AI MOCK INTERVIEW</p><h2>Question {mockIndex + 1}</h2></div><span className="source-pill">{mockFeedback ? 'Feedback ready' : 'Interviewer'}</span></div><p className="mock-question">{currentMockQuestion}</p><textarea aria-label="Mock interview answer" value={props.answer} onChange={(event) => { props.setAnswer(event.target.value); setMockFeedback(null); }} rows={7} placeholder="Answer as if you were speaking to the interviewer..." />{mockFeedback ? <div className="mock-feedback"><div className="mock-score-grid">{[['Relevance', mockFeedback.relevance], ['Technical accuracy', mockFeedback.technicalAccuracy], ['Communication', mockFeedback.communication], ['Completeness', mockFeedback.completeness]].map(([label, score]) => <div key={String(label)}><span>{label}</span><strong>{score}</strong><div className="progress-track"><span style={{ width: `${score}%` }} /></div></div>)}</div><div className="mock-feedback-columns"><div><strong>What worked</strong><ul>{mockFeedback.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div><div><strong>Next improvement</strong><ul>{mockFeedback.improvements.length ? mockFeedback.improvements.map((item) => <li key={item}>{item}</li>) : <li>Keep this level of specificity and connect it to a measurable outcome.</li>}</ul></div></div><button className="button button-primary" onClick={nextMockQuestion}>Next question <ArrowRight size={15} /></button></div> : <button className="button button-primary" disabled={!props.answer.trim()} onClick={submitMockAnswer}>Evaluate answer <Sparkles size={15} /></button>}</section><div className="interview-columns"><div className="section-stack">{Object.entries(props.questions).map(([category, questions]) => <section className="surface-card question-card" key={category}><div className="card-heading"><h2>{category} questions</h2><span className="source-pill">Practice</span></div><ol>{questions.map((question) => <li key={question}>{question}</li>)}</ol></section>)}</div><section className="surface-card answer-card"><div className="card-heading"><div><p className="section-kicker">YOUR PRACTICE</p><h2>Draft an answer</h2></div><span className="word-count">{wordCount} words</span></div><label htmlFor="practice-answer">Pick a question and write a response</label><textarea id="practice-answer" value={props.answer} onChange={(event) => props.setAnswer(event.target.value)} rows={10} placeholder="Use a concrete example. Explain the situation, your actions, and the result…" /><div className="answer-feedback"><strong>Self-review prompts</strong><p>{wordCount < 40 ? 'Add more detail: aim to explain the context, what you did, and the outcome.' : 'Good length. Check that your answer includes a specific example and a clear result.'}</p><ul><li>Is the example accurate and specific?</li><li>Did you explain your own contribution?</li><li>Did you share a measurable or observable outcome?</li></ul></div></section></div></div>;
}

function ApplicationsSection(props: { applications: TrackedApplication[]; onChange: (application: TrackedApplication, status: ApplicationStatus) => void; onEdit: (application: TrackedApplication, changes: Partial<TrackedApplication>) => void; categories: string[]; onAddCategory: (category: string) => void }) {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [newCategory, setNewCategory] = useState('');
  const visibleApplications = categoryFilter === 'All' ? props.applications : props.applications.filter((item) => item.category === categoryFilter);
  const createCategory = () => { props.onAddCategory(newCategory); setNewCategory(''); };
  return <div className="section-stack"><section className="section-intro-card surface-card"><CalendarDays size={22} /><div><h2>Keep every next step visible.</h2><p>Update each opportunity as you move through your search. Changes are saved on this device.</p></div><span className="source-pill">{visibleApplications.length} tracked</span><label className="category-filter">Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All</option>{props.categories.map((category) => <option key={category}>{category}</option>)}</select></label><div className="category-create"><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="New category" /><button className="button button-outline" onClick={createCategory} disabled={!newCategory.trim()}><Plus size={14} />Add</button></div><div className="view-toggle"><button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}><LayoutDashboard size={14} />Kanban</button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><ClipboardList size={14} />List</button></div></section>{visibleApplications.length === 0 ? <section className="surface-card empty-state"><BriefcaseBusiness size={25} /><h2>Your tracker is ready</h2><p>Save a suggested role or mark one as applied to start your pipeline.</p></section> : view === 'kanban' ? <div className="application-kanban">{statuses.map((status) => <section className="application-column" key={status}><div className="application-column-heading"><h2>{status}</h2><span>{visibleApplications.filter((item) => item.status === status).length}</span></div>{visibleApplications.filter((item) => item.status === status).map((application) => <article className="application-card surface-card" key={application.id}><div><strong>{application.title}</strong><span>{application.company}</span></div><select aria-label={`Status for ${application.title}`} value={application.status} onChange={(event) => props.onChange(application, event.target.value as ApplicationStatus)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select><select aria-label={`Category for ${application.title}`} value={application.category} onChange={(event) => props.onEdit(application, { category: event.target.value })}>{props.categories.map((category) => <option key={category}>{category}</option>)}</select><small>Applied {application.applicationDate || 'not dated'}</small>{application.jobUrl && <a href={application.jobUrl} target="_blank" rel="noreferrer">Open job link</a>}{application.interviewDate && <small>Interview: {application.interviewDate}</small>}{application.followUpDate && <small>Follow up: {application.followUpDate}</small>}{application.notes && <p>{application.notes}</p>}</article>)}</section>)}</div> : <div className="application-table-wrap surface-card"><table className="application-table"><thead><tr><th>Role</th><th>Company</th><th>Status</th><th>Category</th><th>Application date</th><th>Job URL</th><th>Interview date</th><th>Follow-up date</th><th>Notes</th></tr></thead><tbody>{visibleApplications.map((application) => <tr key={application.id}><td><strong>{application.title}</strong></td><td>{application.company}</td><td><select aria-label={`Status for ${application.title}`} value={application.status} onChange={(event) => props.onChange(application, event.target.value as ApplicationStatus)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td><td><select aria-label={`Category for ${application.title}`} value={application.category} onChange={(event) => props.onEdit(application, { category: event.target.value })}>{props.categories.map((category) => <option key={category}>{category}</option>)}</select></td><td><input type="date" value={application.applicationDate} onChange={(event) => props.onEdit(application, { applicationDate: event.target.value })} /></td><td><input aria-label={`Job URL for ${application.title}`} value={application.jobUrl} onChange={(event) => props.onEdit(application, { jobUrl: event.target.value })} /></td><td><input type="date" value={application.interviewDate} onChange={(event) => props.onEdit(application, { interviewDate: event.target.value })} /></td><td><input type="date" value={application.followUpDate} onChange={(event) => props.onEdit(application, { followUpDate: event.target.value })} /></td><td><textarea aria-label={`Notes for ${application.title}`} value={application.notes} onChange={(event) => props.onEdit(application, { notes: event.target.value })} rows={2} /></td></tr>)}</tbody></table></div>}</div>;
}

function NotificationsSection(props: { notifications: WorkspaceNotification[]; onMarkRead: () => void }) {
  return <div className="section-stack"><section className="section-intro-card surface-card"><Bell size={22} /><div><p className="section-kicker">CAREER SIGNALS</p><h2>Notifications</h2><p>Matching roles, application dates, roadmap milestones, and resume prompts in one place.</p></div><button className="button button-outline" onClick={props.onMarkRead}>Mark all read</button></section>{props.notifications.length ? <div className="notification-list">{props.notifications.map((notification) => <article className={`notification-item surface-card ${notification.read ? 'read' : ''}`} key={notification.id}><span className={`notification-kind notification-${notification.kind}`}><Bell size={15} /></span><div><strong>{notification.title}</strong><p>{notification.message}</p><small>{notification.createdAt}</small></div>{!notification.read && <span className="unread-dot" aria-label="Unread notification" />}</article>)}</div> : <section className="surface-card empty-state"><Bell size={25} /><h2>You're all caught up</h2><p>New career signals will appear here as your workspace changes.</p></section>}</div>;
}

type AdminJob = JobMatch & { verified: boolean };

function AdminSection() {
  const [jobs, setJobs] = useState<AdminJob[]>(() => sampleJobs.map((job) => ({ ...job, verified: job.sourceType === 'platform' })));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', company: '', location: '' });
  const [categories, setCategories] = useState(['Engineering', 'Design', 'Data', 'Product']);
  const [skills, setSkills] = useState(['React', 'TypeScript', 'Python', 'SQL', 'Node.js']);
  const [newValue, setNewValue] = useState('');
  const users = [{ email: 'aarav.mehta.dev@gmail.com', role: 'Candidate', status: 'Active' }, { email: 'admin@talenthunt.local', role: 'Administrator', status: 'Active' }];
  const companies = [...new Set(jobs.map((job) => job.company))];
  const duplicateReports = jobs.filter((job, index) => jobs.findIndex((candidate) => candidate.title === job.title && candidate.company === job.company) !== index);
  const editJob = (job: AdminJob) => { setEditingId(jobId(job)); setDraft({ title: job.title, company: job.company, location: job.location }); };
  const saveJob = () => {
    if (!draft.title.trim() || !draft.company.trim()) return;
    if (editingId) {
      setJobs((current) => current.map((job) => jobId(job) === editingId ? { ...job, title: draft.title.trim(), company: draft.company.trim(), location: draft.location.trim() || 'Remote' } : job));
    } else {
      setJobs((current) => [...current, { ...sampleJobs[0], title: draft.title.trim(), company: draft.company.trim(), location: draft.location.trim() || 'Remote', sourceName: 'Admin demo catalog', sourceType: 'platform', verified: false }]);
    }
    setEditingId(null);
    setDraft({ title: '', company: '', location: '' });
  };
  const addListValue = (setter: React.Dispatch<React.SetStateAction<string[]>>) => { const value = newValue.trim(); if (value) setter((current) => current.includes(value) ? current : [...current, value]); setNewValue(''); };
  return <div className="section-stack"><section className="admin-banner surface-card"><ShieldCheck size={23} /><div><p className="section-kicker">LOCAL ADMIN DEMO</p><h2>Catalog operations</h2><p>This panel demonstrates the management workflow. Production admin authorization and persistence must be enforced by Supabase policies and server-side roles.</p></div></section><div className="admin-summary-grid"><div className="surface-card"><Users size={18} /><strong>{users.length}</strong><span>Users</span></div><div className="surface-card"><BriefcaseBusiness size={18} /><strong>{jobs.length}</strong><span>Jobs</span></div><div className="surface-card"><Building2 size={18} /><strong>{companies.length}</strong><span>Companies</span></div><div className="surface-card"><Flag size={18} /><strong>{duplicateReports.length}</strong><span>Duplicate reports</span></div></div><section className="surface-card admin-panel"><div className="card-heading"><div><p className="section-kicker">JOB CATALOG</p><h2>{editingId ? 'Edit job' : 'Add job'}</h2></div><span className="source-pill">{jobs.filter((job) => job.verified).length} verified</span></div><div className="admin-job-form"><input placeholder="Job title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /><input placeholder="Company" value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} /><input placeholder="Location" value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /><button className="button button-primary" onClick={saveJob}><Plus size={15} />{editingId ? 'Save changes' : 'Add job'}</button></div><div className="admin-job-list">{jobs.map((job) => <div key={jobId(job)}><div><strong>{job.title}</strong><span>{job.company} · {job.location}</span></div><label className="admin-verify"><input type="checkbox" checked={job.verified} onChange={(event) => setJobs((current) => current.map((item) => jobId(item) === jobId(job) ? { ...item, verified: event.target.checked } : item))} /> Verified</label><button className="icon-button" aria-label={`Edit ${job.title}`} onClick={() => editJob(job)}>Edit</button><button className="icon-button danger" aria-label={`Delete ${job.title}`} onClick={() => setJobs((current) => current.filter((item) => jobId(item) !== jobId(job)))}><Trash2 size={14} /></button></div>)}</div></section><div className="admin-management-grid"><section className="surface-card admin-panel"><div className="card-heading"><div><p className="section-kicker">USERS</p><h2>Manage users</h2></div></div>{users.map((user) => <div className="admin-row" key={user.email}><Users size={15} /><span>{user.email}</span><small>{user.role}</small><select defaultValue={user.status}><option>Active</option><option>Suspended</option></select></div>)}</section><section className="surface-card admin-panel"><div className="card-heading"><div><p className="section-kicker">COMPANIES</p><h2>Company directory</h2></div></div>{companies.map((company) => <div className="admin-row" key={company}><Building2 size={15} /><span>{company}</span><small>{jobs.filter((job) => job.company === company).length} jobs</small></div>)}</section><section className="surface-card admin-panel"><div className="card-heading"><div><p className="section-kicker">CATEGORIES & SKILLS</p><h2>Catalog taxonomy</h2></div></div><div className="tags-wrap">{categories.map((item) => <span className="skill-chip" key={item}>{item}</span>)}{skills.map((item) => <span className="skill-chip ats-found" key={item}>{item}</span>)}</div><div className="admin-add-line"><input value={newValue} onChange={(event) => setNewValue(event.target.value)} placeholder="Add category or skill" /><button className="button button-outline" onClick={() => addListValue(setCategories)}><Plus size={14} />Add category</button><button className="button button-subtle" onClick={() => addListValue(setSkills)}><Plus size={14} />Add skill</button></div></section><section className="surface-card admin-panel"><div className="card-heading"><div><p className="section-kicker">REPORTS</p><h2>Suspicious listings</h2></div></div>{duplicateReports.length ? duplicateReports.map((job) => <div className="admin-row" key={jobId(job)}><Flag size={15} /><span>{job.title} · {job.company}</span><button className="icon-button danger" onClick={() => setJobs((current) => current.filter((item) => item !== job))}><Trash2 size={14} /></button></div>) : <p className="empty-note">No duplicate title/company listings detected.</p>}</section></div></div>;
}

function ProfileSection(props: { candidate: Candidate; setCandidate: (candidate: Candidate) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; saved: boolean }) {
  const update = <K extends keyof Candidate>(field: K, value: Candidate[K]) => props.setCandidate({ ...props.candidate, [field]: value });
  return <div className="section-stack">
    <section className="surface-card">
      <div className="card-heading"><div><p className="section-kicker">YOUR PREFERENCES</p><h2>Candidate profile</h2></div><span className="source-pill">{isSupabaseConfigured ? 'Supabase env detected' : 'Local demo storage'}</span></div>
      <form className="profile-editor" onSubmit={props.onSubmit}>
        <label>Full name<input value={props.candidate.fullName} onChange={(event) => update('fullName', event.target.value)} /></label>
        <label>Email<input type="email" value={props.candidate.email} onChange={(event) => update('email', event.target.value)} /></label>
        <label>Target role<input value={props.candidate.role} onChange={(event) => update('role', event.target.value)} /></label>
        <label>Preferred location<input value={props.candidate.location} onChange={(event) => update('location', event.target.value)} placeholder="City, region, or country" /></label>
        <label>Work arrangement<select value={props.candidate.preferredWorkplace} onChange={(event) => update('preferredWorkplace', event.target.value as Candidate['preferredWorkplace'])}><option>Any</option><option>Remote</option><option>Hybrid</option><option>On-site</option><option>Flexible</option></select></label>
        <label>Employment type<select value={props.candidate.preferredEmploymentType} onChange={(event) => update('preferredEmploymentType', event.target.value as Candidate['preferredEmploymentType'])}><option>Any</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></label>
        <label>Minimum annual salary (USD)<input type="number" min="0" step="1000" value={props.candidate.minimumSalary || ''} onChange={(event) => update('minimumSalary', Number(event.target.value))} placeholder="No minimum" /></label>
        <label className="profile-wide">Professional summary<textarea rows={4} value={props.candidate.summary} onChange={(event) => update('summary', event.target.value)} /></label>
        <div className="profile-wide profile-actions"><button className="button button-primary" type="submit">{props.saved ? 'Saved' : 'Save profile'} <Check size={15} /></button></div>
      </form>
    </section>
    <section className="surface-card privacy-card"><div className="card-heading"><div><p className="section-kicker">PRIVACY NOTES</p><h2>What this demo does—and doesn’t—do</h2></div><ShieldCheck size={20} className="heading-icon" /></div><ul>{databasePolicySummary.map((item) => <li key={item}><CheckCircle2 size={15} />{item}</li>)}</ul><p className="muted-copy">Resume text remains in app memory only for this session. Legacy DOC and consented AI analysis are sent transiently to configured Edge Functions; the AI provider’s own retention terms apply. Profile and application metadata are stored per account in browser local storage.</p></section>
  </div>;
}

function normalizeApplication(application: Partial<TrackedApplication>): TrackedApplication {
  return {
    id: application.id ?? `${application.company ?? 'unknown'}::${application.title ?? 'untitled'}`,
    title: application.title ?? 'Untitled role',
    company: application.company ?? 'Unknown company',
    status: statuses.includes(application.status as ApplicationStatus) ? application.status as ApplicationStatus : 'Saved',
    applicationDate: application.applicationDate ?? application.updatedAt ?? '',
    jobUrl: application.jobUrl ?? '',
    notes: application.notes ?? '',
    interviewDate: application.interviewDate ?? '',
    followUpDate: application.followUpDate ?? '',
    category: application.category ?? 'Wishlist',
    favorite: application.favorite ?? application.status === 'Saved',
    updatedAt: application.updatedAt ?? application.applicationDate ?? '',
  };
}