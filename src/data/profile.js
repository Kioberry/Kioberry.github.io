// Single source of truth for the site AND the digital twin's knowledge.
// Content is pulled from profile/resume.md; edit here and every page updates.

export const person = {
  name: 'Astrid Xie',
  nameZh: '谢婉蓉',
  tagline: 'AI engineer who ships agents that actually get used.',
  location: 'Los Angeles, CA',
  email: 'wanrongxie7@gmail.com',
  linkedin: 'https://www.linkedin.com/in/wanrong-astrid-xie',
  github: 'https://github.com/Kioberry',
};

export const highlights = [
  'M.S. computer science @ USC',
  'SoC modeling intern @ SmartLogic',
  '1st place, USC Build4SC hackathon',
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
    company: 'Shanghai SmartLogic Technology',
    role: 'SoC System Modeling Intern',
    period: 'May 2026 – Present',
    years: '2026–now',
    bullets: [
      'Built TraceViewer end to end for SoC trace monitoring and replay, cutting initial diagnosis from 30 min to 5.',
      'Built a merge-request review agent + Daily Test workflow; bug-fix cycle went from 2 days to 5 minutes.',
      'Automated offline npm dependency packaging and publishing: days of prep down to 20 minutes.',
    ],
    tags: ['C++', 'TypeScript', 'Agents', 'CI/CD'],
  },
  {
    company: 'Yimikang Technology Group',
    role: 'Software Engineer Intern, R&D',
    period: 'Jun 2024 – Aug 2024',
    years: '2024',
    bullets: [
      'Led end-to-end deployment of a distributed edge data collection system in Go (device → gateway → backend).',
      'Built a data-center cooling simulator for ML optimization, cutting peak energy use by 20%.',
      'Shortened the integration cycle by 40% across 10+ stakeholders.',
    ],
    tags: ['Go', 'Python', 'gRPC', 'Distributed'],
  },
  {
    company: 'China Mobile Payment',
    role: 'Software Engineer Intern, Platform & Security',
    period: 'Jun 2022 – Aug 2022',
    years: '2022',
    bullets: [
      'Architected a stateless auth microservice on Spring Boot + MySQL that handled a 3x traffic increase.',
      'Implemented dual-token JWT auth with Redis-backed refresh tokens and BCrypt hashing.',
    ],
    tags: ['Java', 'Spring Boot', 'Redis', 'Security'],
  },
];

// `category` drives the filter chips on the projects page.
// `linkedin` should point at the LinkedIn post for each project; the profile URL is a placeholder.
export const projects = [
  {
    id: 'daypilot',
    title: 'DayPilot',
    subtitle: 'AI life-scheduling agent',
    blurb: 'Production agent on Cloud Run: 12 tools behind one Gemini coordinator, long-term memory with vector search + knowledge graph, and full OpenTelemetry tracing.',
    category: 'agents',
    tags: ['Google ADK', 'Gemini', 'MongoDB', 'MCP'],
    date: 'Jun 2026',
    featured: true,
    palette: ['#b9a4f2', '#f3b6d6'],
    glyph: '◷',
    linkedin: person.linkedin,
  },
  {
    id: 'peeko',
    title: 'Peeko',
    subtitle: '1st place · USC Build4SC',
    blurb: 'Real-time lecture summarization in 12 hours: Deepgram streaming, rolling Claude summaries, and a RAG-grounded “Catch Me Up” button.',
    category: 'agents',
    tags: ['RAG', 'Claude', 'pgvector', 'React'],
    date: 'Apr 2026',
    featured: true,
    palette: ['#8fd3f4', '#c5a3ff'],
    glyph: '✎',
    linkedin: person.linkedin,
  },
  {
    id: 'pokerbench',
    title: 'PokerBench',
    subtitle: 'Fine-tuned LLM for poker',
    blurb: 'QLoRA on 576K decisions with sub-4B models on a single T4. Best model hit 0.842 action accuracy, beating GPT-4o, Gemini and Claude Haiku.',
    category: 'ml',
    tags: ['QLoRA', 'PyTorch', 'HuggingFace'],
    date: 'Dec 2025',
    featured: true,
    palette: ['#f7a8c4', '#ffd6a5'],
    glyph: '♠',
    linkedin: person.linkedin,
  },
  {
    id: 'labmind',
    title: 'LabMind',
    subtitle: 'Autonomous lab optimization',
    blurb: 'Turns raw microscopy into next-batch proposals with Bayesian sampling. Decision time went from hours to under a minute, and success rate rose 31%.',
    category: 'agents',
    tags: ['LangChain', 'Bayesian Opt', 'Next.js'],
    date: 'May 2026',
    palette: ['#a0e7c8', '#b9a4f2'],
    glyph: '⚗',
    linkedin: person.linkedin,
  },
  {
    id: 'jobhunter',
    title: 'Job Hunter',
    subtitle: 'Human-in-the-loop applications',
    blurb: 'An agent scores job fit, Playwright drives Greenhouse/Lever/Workday, and it stops at ambiguous questions for a human to decide.',
    category: 'agents',
    tags: ['Playwright', 'Claude', 'Structured output'],
    date: 'Aug 2026',
    palette: ['#ffd6a5', '#f3b6d6'],
    glyph: '✉',
    linkedin: person.linkedin,
  },
  {
    id: 'smartfridge',
    title: 'SmartFridge',
    subtitle: 'AWS re-architecture',
    blurb: 'Pre-signed S3 uploads, async Lambda + Rekognition with a GPT-4o Vision fallback, and ElastiCache in front of RDS. Latency went from 8s to 2.5s.',
    category: 'systems',
    tags: ['AWS', 'Swift', 'Redis'],
    date: 'Nov 2025',
    palette: ['#8fd3f4', '#a0e7c8'],
    glyph: '❄',
    linkedin: person.linkedin,
  },
  {
    id: 'aliencat',
    title: 'Alien Cat in the Ocean',
    subtitle: 'Procedural ray-marched scene',
    blurb: 'SDF ray marching, 29 superimposed sine waves, Fresnel, caustics and subsurface scattering. LOD tiers raised it from under 10 FPS to 30 FPS on ShaderToy.',
    category: 'graphics',
    tags: ['GLSL', 'WebGL', 'Ray marching'],
    date: 'Apr 2026',
    palette: ['#5b6cff', '#8fd3f4'],
    glyph: '≋',
    linkedin: person.linkedin,
  },
  {
    id: 'elemental',
    title: 'Elemental',
    subtitle: 'Co-op puzzle-combat game',
    blurb: 'Rule-based enemy AI and a timed global “Steam Mode” built on state machines in Unity 2D.',
    category: 'graphics',
    tags: ['Unity', 'C#', 'Game AI'],
    date: 'Dec 2025',
    palette: ['#ff9a8b', '#c5a3ff'],
    glyph: '✦',
    linkedin: person.linkedin,
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
