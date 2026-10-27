// The digital twin's brain.
//
// Prototype: a keyword router over src/data/profile.js so the UI works with no backend.
// Production: set REACT_APP_TWIN_API_URL to a serverless endpoint (e.g. a Cloudflare Worker
// that calls the Claude API with your uploaded documents as context). The UI only depends on
// askTwin()'s contract: (question, history) => Promise<{ text, expression, followups }>.

import { person, education, experience, projects, skills, passions } from '../data/profile';

const API_URL = process.env.REACT_APP_TWIN_API_URL;

// Short, Petersen-style prompts. The first three show before anything is asked; after each answer
// the twin suggests three follow-ups the visitor hasn't asked yet.
const QUESTION_POOL = [
  'Favorite project?',
  "What's your background?",
  'What drives you?',
  'What are you working on now?',
  "What's your tech stack?",
  'Tell me about DayPilot',
  'How did you win the hackathon?',
  'How do I reach you?',
];

export const suggestedQuestions = QUESTION_POOL.slice(0, 3);

export function pickFollowups(asked) {
  const fresh = QUESTION_POOL.filter((q) => !asked.includes(q));
  return (fresh.length >= 3 ? fresh : QUESTION_POOL).slice(0, 3);
}

export async function askTwin(question, history = []) {
  if (API_URL) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history }),
    });
    if (!res.ok) throw new Error(`twin api ${res.status}`);
    return res.json();
  }
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
  return mockAnswer(question);
}

const isZh = (s) => /[一-鿿]/.test(s);

const intents = [
  {
    id: 'projects',
    match: /project|built|build|favorite|作品|项目|做过/i,
    en: () =>
      `My favorites right now: ${projects
        .filter((p) => p.featured)
        .map((p) => `${p.title} (${p.subtitle})`)
        .join(', ')}. DayPilot plans your day from your calendar, location and health data; LabMind turns microscopy into next-step lab decisions. Want details on one?`,
    zh: () =>
      `最近最喜欢的项目是 DayPilot（结合日历、位置和健康数据帮你排一天的日程智能体）、LabMind（把显微图像变成下一步实验决策的智能体）和 Peeko（黑客松第一名，走神后一键追上课堂）。想听哪个细节？`,
    expression: 'smile',
  },
  {
    id: 'background',
    match: /background|education|school|study|usc|leeds|背景|学历|学校|教育/i,
    en: () =>
      `I'm doing my ${education[0].degree} at USC (${education[0].detail}), graduating Dec 2026, after a ${education[1].degree} at Leeds. I've worked on payments security, distributed edge systems, SoC performance tooling and, most recently, production AI agents, so I like moving between layers.`,
    zh: () =>
      `我现在在 USC 读计算机硕士（GPA 3.85），2026 年 12 月毕业；本科是英国利兹大学计算机一等学位。做过支付安全、分布式边缘系统、SoC 性能分析工具，最近在做生产环境的 AI 智能体，喜欢在系统的不同层之间切换。`,
    expression: 'smile',
  },
  {
    id: 'experience',
    match: /work|intern|job|experience|company|实习|工作|经历/i,
    en: () =>
      `Most recently: ${experience[0].role} at ${experience[0].company}, where I built a Gemini payroll agent that raised timecard recognition accuracy from 71.4% to 98.1%. Before that I was at ${experience
        .slice(1)
        .map((e) => e.company)
        .join(', ')}.`,
    zh: () =>
      `最近在 Mulholland 做 Applied AI Engineer：做了一个 Gemini 工资单智能体，把考勤卡识别准确率从 71.4% 提到 98.1%。之前在上海 SmartLogic（SoC 建模）、亿米康和中国移动支付实习过。`,
    expression: 'smile',
  },
  {
    id: 'passion',
    match: /passion|love|drive|motivat|why|热爱|喜欢|动力/i,
    en: () => `Three things: ${passions.join('; ')}.`,
    zh: () => `三件事：把繁琐的流程自动化；做真正有人用的东西；从 0 到 1 去探索陌生领域，不确定性里才有成长。`,
    expression: 'smile',
  },
  {
    id: 'skills',
    match: /skill|stack|tech|language|技能|技术栈/i,
    en: () =>
      Object.entries(skills)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · '),
    zh: () => `主要用 Python / TypeScript / Java / C++ / Go，做 LLM 智能体、RAG、微调，也做 AWS / GCP 上的后端和基础设施。`,
    expression: 'think',
  },
  {
    id: 'contact',
    match: /contact|email|linkedin|hire|reach|联系|邮箱/i,
    en: () => `Easiest is email (${person.email}) or LinkedIn. I'm open to Applied AI / LLM / SWE roles!`,
    zh: () => `可以发邮件 ${person.email}，或者在 LinkedIn 找我～正在找 AI / LLM / 软件工程岗位！`,
    expression: 'smile',
  },
];

function mockAnswer(question) {
  const zh = isZh(question);
  const q = question.toLowerCase();
  const project = projects.find((p) => q.includes(p.title.toLowerCase()) || q.includes(p.id));
  if (project) {
    return { text: `${project.title}: ${project.blurb}`, expression: 'smile' };
  }
  if (/hackathon|peeko|黑客松/i.test(question)) {
    const peeko = projects.find((p) => p.id === 'peeko');
    return { text: `${peeko.title} won 1st place at USC Build4SC. ${peeko.blurb}`, expression: 'smile' };
  }
  const intent = intents.find((i) => i.match.test(question));
  if (intent) {
    return { text: zh ? intent.zh() : intent.en(), expression: intent.expression };
  }
  return {
    text: zh
      ? '这个问题我的原型大脑还答不上来 (>_<) 等我读完所有资料就可以啦。先问问我的项目或经历？'
      : "My prototype brain can't answer that one yet (>_<) Once I've read all of Astrid's notes I will. Try asking about projects or experience?",
    expression: 'think',
  };
}
