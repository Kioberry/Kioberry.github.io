// The digital twin's brain.
//
// Prototype: a keyword router over src/data/profile.js so the UI works with no backend.
// Production: set REACT_APP_TWIN_API_URL to a serverless endpoint (e.g. a Cloudflare Worker
// that calls the Claude API with your uploaded documents as context). The UI only depends on
// askTwin()'s contract: (question, history) => Promise<{ text, expression }>.

import { person, education, experience, projects, skills, passions } from '../data/profile';

const API_URL = process.env.REACT_APP_TWIN_API_URL;

export const suggestedQuestions = [
  { id: 'projects', label: 'tell me about projects', zh: '你做过哪些项目？' },
  { id: 'background', label: "what's your background?", zh: '你的背景是什么？' },
  { id: 'passion', label: "what's your passion?", zh: '你热爱什么？' },
];

export const greeting = {
  text: `Hi! I'm ${person.name.split(' ')[0]}'s digital twin ✦ Ask me anything about my work, projects, or what I'm up to. 你也可以用中文问我～`,
  expression: 'smile',
};

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
    match: /project|built|build|作品|项目|做过/i,
    en: () =>
      `My favorites right now: ${projects
        .filter((p) => p.featured)
        .map((p) => `${p.title} (${p.subtitle})`)
        .join(', ')}. DayPilot is my flagship, a production agent with long-term memory and full tracing. Want details on one?`,
    zh: () =>
      `最近最喜欢的项目是 DayPilot（部署在 Cloud Run 上的日程管理智能体）、Peeko（黑客松第一名，实时课堂总结 + RAG）和 PokerBench（用 QLoRA 微调小模型，打败了 GPT-4o）。想听哪个细节？`,
    expression: 'smile',
  },
  {
    id: 'background',
    match: /background|education|school|study|usc|leeds|背景|学历|学校|教育/i,
    en: () =>
      `I'm doing my ${education[0].degree} at USC (${education[0].detail}), after a ${education[1].degree} at Leeds. Before that I interned in payments security, distributed edge systems, and now SoC performance tooling, so I like moving between layers.`,
    zh: () =>
      `我现在在 USC 读计算机硕士（GPA 3.85），本科是英国利兹大学计算机一等学位。实习做过支付安全、分布式边缘系统，现在在做 SoC 性能分析工具，喜欢在系统的不同层之间切换。`,
    expression: 'smile',
  },
  {
    id: 'experience',
    match: /work|intern|job|experience|company|实习|工作|经历/i,
    en: () =>
      `Most recently: ${experience[0].role} at ${experience[0].company}, where I built TraceViewer and an MR review agent that took bug-fix turnaround from 2 days to 5 minutes. Before that: ${experience
        .slice(1)
        .map((e) => e.company)
        .join(' and ')}.`,
    zh: () =>
      `最近在上海 SmartLogic 做 SoC 建模实习：做了 TraceViewer，还有一个 MR 代码审查智能体，把修 bug 周期从 2 天缩到 5 分钟。之前在亿米康和中国移动支付实习过。`,
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
  const project = projects.find((p) => question.toLowerCase().includes(p.title.toLowerCase().split(' ')[0]));
  if (project) {
    return { text: `${project.title}: ${project.blurb}`, expression: 'smile' };
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
