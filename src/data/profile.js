// Single source of truth for the site AND the digital twin's knowledge.
// Content comes from Project_list.md and the resume parts in learn_ai_managed_resume-project/wanrong-xie
// (only figures the notes there mark as sourced; unsourced numbers stay off the site). Edit here and every page updates.

export const person = {
  name: 'Astrid Xie',
  nameZh: '谢婉蓉',
  intro: "I'm Astrid, a developer, researcher, and creative builder.",
  location: 'Los Angeles, CA',
  email: 'wanrongxie7@gmail.com',
  linkedin: 'https://www.linkedin.com/in/wanrong-astrid-xie',
  github: 'https://github.com/Kioberry',
};

export const currently = [
  'M.S. CS @ USC Viterbi, graduating Dec 2026',
  'Focused on backend systems and AI development',
  'Build4SC Hackathon winner',
];

export const education = [
  {
    school: 'University of Southern California',
    degree: 'M.S. Computer Science',
    detail: 'GPA 3.85 / 4.0',
    place: 'Los Angeles, CA',
    period: 'Jan 2025 – Dec 2026',
  },
  {
    school: 'University of Leeds',
    degree: 'B.S. Computer Science, First Class Honours',
    detail: 'GPA 3.7 / 4.0',
    place: 'Leeds, UK',
    period: 'Sep 2020 – Jun 2024',
  },
];

export const experience = [
  {
    company: 'Mulholland',
    role: 'Applied AI Engineer',
    period: 'Aug 2026 – Oct 2026',
    years: '2026',
    bullets: [
      'Built a production Gemini-powered payroll agent for nearly 50 client accounts that transcribes timecards, replays client rules and human corrections, and flags ambiguous cases, raising recognition accuracy from 71.4% to 98.1%.',
      'Built an AI-assisted supplier workflow: Gemini photo-to-field suggestions, real-time validation and buyer review, replacing an email-and-spreadsheet process with account-free vendor submission in 500-row batches.',
    ],
    tags: ['Gemini', 'Agents', 'Human-in-the-loop'],
  },
  {
    company: 'Shanghai SmartLogic Technology',
    role: 'SoC System Modeling Intern',
    period: 'May 2026 – Aug 2026',
    years: '2026',
    bullets: [
      'Built TraceViewer end to end for SoC trace monitoring and replay, rendering trillion-scale trends across modules; first-look diagnosis went from about 30 minutes to 5.',
      'Built a merge-request review agent that cut the average bug-fix cycle from 2 days to 5 minutes.',
      'Automated offline npm dependency packaging and publishing for the internal network: days of prep down to about 20 minutes.',
    ],
    tags: ['Python', 'TypeScript', 'Agents', 'CI/CD'],
  },
  {
    company: 'Yimikang Technology Group',
    role: 'Software Engineer Intern, R&D',
    period: 'Jun 2024 – Aug 2024',
    years: '2024',
    bullets: [
      'Helped restore 200+ FSU devices simultaneously during a flood emergency, coordinating 10+ stakeholders to prevent major financial loss.',
      'Built a Python data center cooling simulator that streamed real-time data to an ML model, cutting peak energy consumption by about 20%.',
      'Owned the Go ingestion layer of a distributed edge data collection system (device → gateway → backend).',
    ],
    tags: ['Go', 'Python', 'Kafka', 'ML'],
  },
  {
    company: 'China Mobile Payment',
    role: 'Software Engineer Intern, Platform & Security',
    period: 'Jun 2022 – Aug 2022',
    years: '2022',
    bullets: [
      'Redesigned the authentication microservice with JWT and a Redis revocation blacklist, keeping Redis off the hot request path.',
      'Built a security monitoring dashboard that helps keep payment infrastructure safe for millions of users.',
    ],
    tags: ['Java', 'Spring Boot', 'Redis', 'Security'],
  },
];

// `category` drives the filter chips on the projects page.
// `thumb`: an image file name in public/projects/ (16:10 works best). `links`: the first one is the main link.
export const projects = [
  {
    id: 'daypilot',
    title: 'DayPilot',
    subtitle: 'Team lead · Google Cloud Rapid Agent Hackathon',
    blurb: 'An AI daily-planning agent that combines your calendar, location and health data each morning to schedule your day. 12 tools behind one Gemini coordinator, long-term memory, full OpenTelemetry tracing.',
    category: 'agents',
    tags: ['Google ADK', 'Gemini', 'MongoDB', 'Cloud Run'],
    date: 'Jul 2026',
    featured: true,
    thumb: 'daypilot.jpg',
    glyph: '◷',
    links: [
      { label: 'Demo', url: 'https://www.youtube.com/watch?v=NF6q8QUmsBw&t=10s' },
      { label: 'GitHub', url: 'https://github.com/hoo01/Daypilot' },
    ],
  },
  {
    id: 'labmind',
    title: 'LabMind',
    subtitle: 'AI agents for lab workflows',
    blurb: 'Turns raw microscopy into next-step experiment decisions: image analysis, Bayesian sampling of 20 candidate conditions per batch, and an 8-state human-in-the-loop pipeline.',
    category: 'agents',
    tags: ['LangChain', 'Bayesian Opt', 'FastAPI', 'Next.js'],
    date: 'May 2026',
    featured: true,
    thumb: 'labmind.jpg',
    glyph: '⚗',
    links: [
      { label: 'Live', url: 'https://labmind-840267766274.us-central1.run.app/' },
      { label: 'Demo', url: 'https://youtu.be/_BhIjSgo9Jo' },
      { label: 'GitHub', url: 'https://github.com/Kioberry/LabMind' },
    ],
  },
  {
    id: 'peeko',
    title: 'Peeko',
    subtitle: '1st place · USC Build4SC',
    blurb: 'A real-time lecture recovery companion that helps students get back on track after zoning out: live summary cards from streamed audio, and one tap to catch up.',
    category: 'agents',
    tags: ['RAG', 'Claude', 'Deepgram', 'pgvector'],
    date: 'Apr 2026',
    featured: true,
    thumb: 'peeko.jpg',
    glyph: '✎',
    links: [
      { label: 'Live', url: 'https://peeko-pink.vercel.app/' },
      { label: 'GitHub', url: 'https://github.com/masibasi/peeko' },
    ],
  },
  {
    id: 'jobhunter',
    title: 'Job Hunter',
    subtitle: 'From job post to tailored application',
    blurb: 'Picks up the job description on a posting, matches it against my experience bank of projects, internships and skills, and generates a resume and cover letter tailored to that role. Runs from a Claude skill or a Chrome extension, with a dashboard that archives every package and tracks each application, plus AI-drafted cold emails.',
    category: 'agents',
    tags: ['Gemini', 'FastAPI', 'Chrome extension', 'Claude skills'],
    date: 'Aug 2026',
    thumb: 'jobhunter.jpg',
    glyph: '✉',
    links: [],
  },
  {
    id: 'pokerbench',
    title: 'PokerBench',
    subtitle: 'Fine-tuned small models for poker',
    blurb: 'QLoRA-fine-tuned small language models for poker decisions. The best, Qwen3-0.6B, reached 0.842 Action Accuracy and 0.829 Exact Match, ahead of zero-shot GPT-4o, Gemini 2.0 Flash and Claude Haiku.',
    category: 'ml',
    tags: ['QLoRA', 'PyTorch', 'HuggingFace'],
    date: 'Dec 2025',
    thumb: 'pokerbench.jpg',
    glyph: '♠',
    links: [{ label: 'GitHub', url: 'https://github.com/Kioberry/PokerBench' }],
  },
  {
    id: 'smartfridge',
    title: 'SmartFridge',
    subtitle: 'iOS fridge manager',
    blurb: 'Turns a fridge photo into a full ingredient inventory, tracks freshness, alerts you before things expire, and suggests meals from what you actually have.',
    category: 'systems',
    tags: ['Swift', 'AWS', 'GPT-4o Vision'],
    date: 'Nov 2025',
    thumb: 'smartfridge.jpg',
    glyph: '❄',
    links: [],
  },
  {
    id: 'aliencat',
    title: 'Alien Cat',
    subtitle: 'GLSL ocean scene',
    blurb: 'A 3D animated scene of an alien cat enjoying music and sunlight in the ocean, rendered with hand-written GLSL ocean and object shaders on ShaderToy.',
    category: 'graphics',
    tags: ['GLSL', 'ShaderToy', 'Ray marching'],
    date: 'Apr 2026',
    thumb: 'aliencat.gif',
    glyph: '≋',
    links: [{ label: 'GitHub', url: 'https://github.com/Kioberry/CSCI580_AlienCat_Project' }],
  },
  {
    id: 'elemental',
    title: 'Elemental',
    subtitle: '2D multiplayer adventure maze',
    blurb: 'A 2D multiplayer adventure maze game, built as a team for USC CSCI 526. Playable in the browser.',
    category: 'graphics',
    tags: ['Unity', 'C#', 'Game design'],
    date: 'Dec 2025',
    thumb: 'elemental.jpg',
    glyph: '✦',
    links: [{ label: 'Play', url: 'https://karthikvenugopal.github.io/main-5-packs-gold/' }],
  },
];

export const projectCategories = [
  { id: 'all', label: 'All' },
  { id: 'agents', label: 'AI Agents' },
  { id: 'ml', label: 'ML' },
  { id: 'systems', label: 'Systems' },
  { id: 'graphics', label: 'Graphics & Games' },
];

export const skills = {
  Languages: 'Python, TypeScript, Java, C++, Go, Swift, SQL, GLSL',
  'AI / LLM': 'Agents (Google ADK, LangChain), RAG, pgvector, QLoRA, PyTorch, Claude & Gemini APIs, MCP',
  'Web & Backend': 'React, Next.js, Node.js, FastAPI, Spring Boot',
  'Cloud & Infra': 'AWS, GCP / Cloud Run, Docker, GitHub Actions, OpenTelemetry, Redis, Kafka',
};

export const passions = [
  'automating the tedious: turning repetitive, error-prone work into autonomous systems',
  'building things people actually use. I care more about impact than perfect architecture',
  'going from zero to one in unfamiliar territory, because the uncertainty is where the learning happens',
];
