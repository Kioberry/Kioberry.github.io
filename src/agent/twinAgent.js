// The digital twin's brain.
//
// Goal: answer like Astrid would in a chat, not like a search result. That means
//   - first person, contractions, short messages ("bubbles") instead of one block of text,
//   - a few different ways of saying each thing, and noticing when something was already asked,
//   - several questions in one message get several answers ("What's your stack and how do I reach you?"),
//   - follow-ups like "tell me more" / "why?" / "展开说说" continue the last topic,
//   - honesty: it only uses facts from src/data/profile.js, says so when it doesn't know,
//     and admits it is a twin if asked.
//
// Pacing (thinking time, typing speed, pauses between bubbles) lives in pace.js / useTwinChat.js, not here.
//
// With REACT_APP_TWIN_API_URL set, a real model answers instead (twin-api/: a Cloudflare Worker calling the
// Claude API), streamed bubble by bubble. The rules below stay as the fallback whenever that API can't answer,
// and as the whole twin when the variable isn't set. The UI only depends on askTwin()'s contract:
// (question, history, { onBubble }) => Promise<{ text, bubbles, expression, followups?, topic? }>.

import { person, education, experience, projects, skills, passions } from '../data/profile';
import { readEvents, toBubbles } from './twinStream';

export { toBubbles };

const API_URL = process.env.REACT_APP_TWIN_API_URL;

// Short, Petersen-style prompts. The first three show before anything is asked; after each answer the twin
// suggests three that fit the conversation and haven't been asked yet.
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

const FOLLOWUPS_BY_TOPIC = {
  projects: ['Tell me more', 'Another project?', 'How did you win the hackathon?'],
  project: ['Tell me more', 'Another project?', "What's your tech stack?"],
  hackathon: ['Tell me more', 'Favorite project?', 'What drives you?'],
  background: ['Where have you worked?', 'What drives you?', 'What are you working on now?'],
  experience: ['What did you do at Mulholland?', 'Tell me more', 'What drives you?'],
  company: ['Tell me more', 'Favorite project?', "What's your tech stack?"],
  passion: ['Tell me more', 'Favorite project?', 'What are you working on now?'],
  skills: ['Tell me more', 'Where have you worked?', 'How do I reach you?'],
  now: ['Tell me about Job Hunter', 'How do I reach you?', 'Favorite project?'],
  contact: ['What are you working on now?', 'Favorite project?', 'What drives you?'],
};

export const suggestedQuestions = QUESTION_POOL.slice(0, 3);

export function pickFollowups(asked, topic) {
  const seen = new Set(asked.map((q) => q.toLowerCase()));
  const pool = [...(FOLLOWUPS_BY_TOPIC[topic] || []), ...QUESTION_POOL];
  const fresh = [...new Set(pool)].filter((q) => !seen.has(q.toLowerCase()) || /^(tell me more|another)/i.test(q));
  return (fresh.length >= 3 ? fresh : QUESTION_POOL).slice(0, 3);
}

// ------------------------------------------------------------------------------------------- helpers

const isZh = (s) => /[一-鿿]/.test(s);
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length) % arr.length];
const lower1 = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const article = (w) => (/^[AEIOU]/.test(w) ? 'an' : 'a');
const listing = (xs, and = 'and') => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${and} ${xs[xs.length - 1]}`);

// "Built a thing that..." -> "I built a thing that..."
const firstPerson = (bullet) => `I ${lower1(bullet)}`;

const featured = projects.filter((p) => p.featured);
const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
const projectRe = (p) => new RegExp(`${p.title.replace(/\s+/g, '\\s*')}|\\b${p.id}\\b`, 'i');
const linkWord = (p) => {
  const ls = (p.links || []).map((l) => (l.label === 'GitHub' ? 'GitHub' : l.label.toLowerCase()));
  if (!ls.length) return '';
  return ls.length === 1 ? ` There's a ${ls[0]} link on my Projects page.` : ` There are ${listing(ls)} links on my Projects page.`;
};

// Blurbs are written as captions ("An agent that...", "Turns raw..."); say them like a person would.
export function asSpoken(blurb) {
  const [first, ...rest] = toBubbles(blurb);
  const keepCase = (w) => (/^[A-Z]{2}|^[A-Z][a-z]*[A-Z]/.test(w) ? w : lower1(w));
  let spoken;
  if (/^(An?|The)\s/.test(first)) spoken = `It's ${lower1(first)}`;
  else if (/^[A-Z][a-z]+s\s/.test(first)) spoken = `It ${lower1(first)}`;
  else spoken = `Basically: ${keepCase(first)}`;
  return [spoken, ...rest];
}

const fmtPeriod = (period) => {
  const m = period.match(/^(\w+) (\d{4}) – (\w+) (\d{4})$/);
  return m && m[2] === m[4] ? `${m[1]} to ${m[3]} ${m[2]}` : period.replace(' – ', ' to ');
};

function projectIntro(p, rng) {
  const open = pick([`Oh, ${p.title}!`, `${p.title}, sure.`, `Ah, ${p.title}. I like talking about this one.`], rng);
  return [open, ...asSpoken(p.blurb), `That was ${p.date}.${linkWord(p)}`];
}

function projectMore(p) {
  return [
    `The main pieces were ${listing(p.tags)}.`,
    `If you want to see it, it's on my Projects page under ${p.category === 'agents' ? 'AI Agents' : p.category}${p.links?.length ? ', with links' : ''}.`,
  ];
}

const usc = education[0];
const leeds = education[1];
const gradDate = usc.period.split('–')[1].trim();

// ------------------------------------------------------------------------------------------- intents
// Each intent: match (regex), label (used when answering several questions at once), topic, and
// say({ zh, rng, times, ctx, part }) -> bubbles. `times` = how often this topic came up before.

const INTENTS = [
  {
    id: 'identity',
    match: /are you (a |an )?(real|human|bot|ai|robot|person)|who are you|是(机器人|ai|真人)|你是谁/i,
    label: { en: 'who I am', zh: '我是谁' },
    say: ({ zh }) =>
      zh
        ? ['我是婉蓉的数字分身，一个她自己写的小程序，知道她的项目和经历。', `我尽量用她的语气回答，重要的事情还是直接发邮件给真人吧：${person.email}`]
        : [
            "I'm Astrid's digital twin: a little program she wrote that knows about her work.",
            `I try to answer the way she would, but for anything important, email the real me at ${person.email}.`,
          ],
  },
  {
    id: 'greeting',
    match: /^(hi|hey|hello|yo|hiya|good (morning|afternoon|evening))\b|^(你好|嗨|哈喽|您好)/i,
    label: { en: 'hi', zh: '打招呼' },
    say: ({ zh, rng, times }) => {
      if (zh) return ['你好呀！', '我是婉蓉（的数字分身）。想聊项目、经历还是最近在忙什么都可以。'];
      if (times) return ['Hi again!', 'What else do you want to know?'];
      return [pick(['Hey, hi!', 'Hi there!', 'Hello!'], rng), "I'm Astrid (well, my twin). Ask me anything about my work, projects or what I'm up to."];
    },
  },
  {
    id: 'howareyou',
    match: /how are you|how's it going|how are things|你好吗|最近怎么样/i,
    label: { en: 'how I am', zh: '近况' },
    say: ({ zh }) =>
      zh
        ? ['挺好的，谢谢关心！', '在读硕士的最后阶段，有点忙，但很开心有人来聊天。想了解什么？']
        : ['Pretty good, thanks for asking!', "It's the last stretch of my master's, so things are busy, but I'm happy to chat. What do you want to know?"],
  },
  {
    id: 'thanks',
    match: /^(thanks|thank you|thx|ty|cool|great|nice|awesome|got it)\b|谢谢|多谢/i,
    label: { en: 'thanks', zh: '谢谢' },
    say: ({ zh, rng }) =>
      zh ? ['不客气！', '还有什么想问的吗？'] : [pick(['Of course!', 'Anytime!', 'Glad that helped!'], rng), "Anything else you're curious about?"],
  },
  {
    id: 'bye',
    match: /^(bye|goodbye|see you|see ya|later)\b|再见|拜拜/i,
    label: { en: 'bye', zh: '再见' },
    say: ({ zh }) =>
      zh
        ? ['拜拜，谢谢来逛！', `想继续聊的话邮件找我：${person.email}`]
        : ['Bye! Thanks for stopping by.', `If you want to keep talking, I'm at ${person.email}.`],
  },
  {
    id: 'more',
    match: /^(more|go on|and|why|how|how so|really|like what|such as|example|details?)\W*$|tell me more|more about (that|it)|elaborate|展开|具体|然后呢|还有呢|多说点|为什么/i,
    label: { en: 'more on that', zh: '更多' },
    say: (args) => moreAbout(args),
  },
  {
    id: 'another',
    match: /another (one|project)|other projects?|what else have you built|还有(什么|别的)项目/i,
    label: { en: 'another project', zh: '别的项目' },
    topic: 'project',
    say: ({ zh, rng, ctx }) => {
      const seen = ctx.mentioned || [];
      const next = projects.find((p) => !seen.includes(p.id) && p.id !== ctx.project) || pick(projects, rng);
      ctx.project = next.id;
      if (zh) return [`那说说 ${next.title} 吧。`, next.blurb];
      return [pick(['Okay, another one:', 'Sure, how about this one:'], rng), ...projectIntro(next, rng).slice(1)];
    },
  },
  {
    id: 'hackathon',
    match: /hackathon|peeko|build4sc|\bwin\b|\bwon\b|黑客松|获奖|得奖/i,
    label: { en: 'the hackathon', zh: '黑客松' },
    topic: 'hackathon',
    say: ({ zh, ctx }) => {
      const pk = byId.peeko;
      ctx.project = 'peeko';
      if (zh)
        return [
          'Peeko！我们拿了 USC Build4SC 黑客松第一名。',
          '想法很简单：上课走神了一会儿，它帮你马上追上。实时处理课堂音频，生成摘要卡片，一键补上漏掉的部分。',
          `技术上用了 ${pk.tags.join('、')}。`,
        ];
      return [
        `Peeko! We took ${pk.subtitle.split('·')[0].trim()} at USC Build4SC.`,
        'The idea: you zone out in a lecture for a minute, and it gets you back on track. It streams the lecture audio, keeps live summary cards, and one tap catches you up.',
        `Under the hood it's ${listing(pk.tags)}.`,
      ];
    },
  },
  {
    id: 'project',
    match: new RegExp(projects.map((p) => projectRe(p).source).join('|'), 'i'),
    label: { en: 'that project', zh: '那个项目' },
    topic: 'project',
    say: ({ zh, rng, ctx, part }) => {
      const p = projects.find((x) => projectRe(x).test(part));
      ctx.project = p.id;
      return zh ? [`${p.title}！`, p.blurb, `（${p.subtitle}，${p.date}）`] : projectIntro(p, rng);
    },
  },
  {
    id: 'projects',
    match: /project|\bbuilt\b|proud of|portfolio|作品|项目|做过/i,
    label: { en: 'my favorite project', zh: '最喜欢的项目' },
    topic: 'projects',
    say: ({ zh, rng, times, ctx }) => {
      const [a, b, c] = featured;
      ctx.project = a.id;
      if (zh)
        return [
          '很难只选一个，现在大概是 DayPilot。',
          '它每天早上结合你的日历、位置和健康数据帮你排好一天，12 个工具由一个 Gemini 协调器调度。',
          'LabMind 和 Peeko 我也很喜欢，想听哪个？',
        ];
      if (times)
        return [`Still ${a.title}, I think!`, `But if you want a different flavor, ${b.title} is the more science-y one and ${c.title} is the one that won.`];
      const [role, event] = a.subtitle.split('·').map((s) => s.trim());
      return pick(
        [
          [`Ooh, hard to pick. Right now it's probably ${a.title}.`, asSpoken(a.blurb)[0], `${b.title} and ${c.title} are close seconds though. Want the story behind one of them?`],
          [`${a.title}, if I have to choose one.`, `I was the ${lower1(role)} at the ${event}. ${asSpoken(a.blurb)[0]}`, `But ${c.title} is the one that won something. Ask me about either!`],
        ],
        rng
      );
    },
  },
  {
    id: 'company',
    match: /mulholland|smartlogic|yimikang|china mobile|中国移动|亿米康/i,
    label: { en: 'that job', zh: '那段经历' },
    topic: 'company',
    say: ({ zh, part, ctx }) => {
      const key = (part.match(/mulholland|smartlogic|yimikang|china mobile|中国移动|亿米康/i) || [''])[0].toLowerCase();
      const map = { mulholland: 0, smartlogic: 1, yimikang: 2, 亿米康: 2, 'china mobile': 3, 中国移动: 3 };
      const e = experience[map[key] ?? 0];
      ctx.company = e.company;
      const lines = [`At ${e.company} I was ${article(e.role)} ${e.role} (${fmtPeriod(e.period)}).`, firstPerson(e.bullets[0])];
      if (e.bullets[1]) lines.push(`I also ${lower1(e.bullets[1])}`);
      return zh ? [`在 ${e.company} 我是 ${e.role}（${e.period}）。`, ...lines.slice(1)] : lines;
    },
  },
  {
    id: 'experience',
    match: /\bwork(ed)?\b|intern|\bjobs?\b|experience|compan(y|ies)|career|employ|实习|工作|经历/i,
    label: { en: "where I've worked", zh: '工作经历' },
    topic: 'experience',
    say: ({ zh, times, ctx }) => {
      const [m, ...rest] = experience;
      ctx.company = m.company;
      if (zh)
        return [
          '最近在 Mulholland 做 Applied AI Engineer。',
          '最有成就感的是一个 Gemini 工资单智能体，服务近 50 个客户账号，把考勤卡识别准确率从 71.4% 提到了 98.1%。',
          '再之前在上海 SmartLogic 做 SoC 建模、亿米康做研发、中国移动支付做平台安全。想听哪段？',
        ];
      if (times) return ['Same four places as before!', `${m.company} most recently, then ${listing(rest.map((e) => e.company))}. Pick one and I'll go deeper.`];
      return [
        `Most recently I was ${article(m.role)} ${m.role} at ${m.company} (${fmtPeriod(m.period)}).`,
        "The thing I'm proudest of there is a Gemini payroll agent for nearly 50 client accounts. It took timecard recognition from 71.4% to 98.1%.",
        `Before that: ${listing(rest.map((e) => e.company))}. Want details on any of them?`,
      ];
    },
  },
  {
    id: 'now',
    match: /working on|currently|right now|these days|up to\b|busy with|looking for|open to|最近在|现在在|在忙|在做什么/i,
    label: { en: "what I'm up to now", zh: '最近在做什么' },
    topic: 'now',
    say: ({ zh, ctx }) => {
      ctx.project = 'jobhunter';
      if (zh)
        return [
          '现在在 USC 读硕士的最后一学期，12 月毕业。',
          '刚结束在 Mulholland 的 Applied AI 工作；业余在做 Job Hunter，一个读招聘信息、帮我判断要不要投、还能自动填申请表的智能体（遇到需要我决定的问题会停下来问我）。',
          '也在找 AI / LLM / 软件工程的工作！',
        ];
      return [
        `Right now I'm finishing my master's at USC. I graduate in ${gradDate}.`,
        `I just wrapped up my Applied AI role at ${experience[0].company}, and on the side I've been building Job Hunter: an agent that reads job postings against my goals and fills out applications, pausing whenever a question needs me.`,
        "And yes, I'm looking for Applied AI, LLM or SWE roles!",
      ];
    },
  },
  {
    id: 'background',
    match: /background|education|school|study|studied|degree|\busc\b|leeds|universit|college|graduat|背景|学历|学校|教育|毕业/i,
    label: { en: 'my background', zh: '我的背景' },
    topic: 'background',
    say: ({ zh, times }) => {
      if (zh)
        return [
          '我现在在 USC 读计算机硕士（GPA 3.85），2026 年 12 月毕业。',
          '本科在英国利兹大学，计算机一等学位。',
          '工作上做过支付安全、分布式边缘系统、SoC 工具，最近在做生产环境的 AI 智能体，喜欢在系统的不同层之间切换。',
        ];
      if (times) return [`Quick recap: ${usc.degree} at USC now, ${leeds.degree.split(',')[0]} from Leeds before that.`, 'Anything specific you want to know?'];
      return [
        `I'm doing my ${usc.degree} at USC right now (${usc.detail}), finishing in ${gradDate}.`,
        `Before that I did my undergrad at Leeds in the UK, ${leeds.degree.replace(/^B\.S\. Computer Science, /, '').toLowerCase()}.`,
        "Work-wise I've moved around layers: payments security, edge data systems, SoC tooling, and lately production AI agents. I like that mix.",
      ];
    },
  },
  {
    id: 'passion',
    match: /passion|\blove\b|drives? you|motivat|inspire|what makes you|enjoy|热爱|动力/i,
    label: { en: 'what drives me', zh: '我的动力' },
    topic: 'passion',
    say: ({ zh }) =>
      zh
        ? ['主要是三件事。', '一是把繁琐、容易出错的流程自动化；二是做真正有人用的东西，比起完美的架构我更在意影响。', '三是从 0 到 1 去探索陌生领域，不确定性里才学得最多。']
        : [
            'Mostly three things.',
            `I love ${passions[0].replace(': ', ', ')}.`,
            'I want to build things people actually use. Impact matters more to me than perfect architecture.',
            `And ${passions[2]}.`,
          ],
  },
  {
    id: 'skills',
    match: /skill|stack|\btech|language|\btools?\b|framework|python|typescript|技能|技术栈|会什么/i,
    label: { en: 'my stack', zh: '技术栈' },
    topic: 'skills',
    say: ({ zh }) => {
      if (zh)
        return [
          '主要用 Python 和 TypeScript，需要时也写 Java、C++、Go。',
          'AI 方面做智能体（Google ADK、LangChain）、RAG、QLoRA 微调，用 Claude 和 Gemini 的 API。',
          '上线这块是 React/Next.js、FastAPI、Spring Boot，加上 AWS / GCP、Docker、OpenTelemetry。',
        ];
      const langs = skills.Languages.split(', ');
      return [
        `Day to day it's mostly ${langs[0]} and ${langs[1]}, plus ${listing(langs.slice(2, 5))} when the job needs it.`,
        `On the AI side I build agents with Google ADK and LangChain, do RAG with pgvector and fine-tuning with QLoRA, and use the Claude and Gemini APIs a lot.`,
        `For shipping things: ${listing(skills['Web & Backend'].split(', '))}, on AWS or GCP with Docker and OpenTelemetry.`,
      ];
    },
  },
  {
    id: 'contact',
    match: /contact|e-?mail|linkedin|github|\bhire\b|reach|get in touch|connect|resume|\bcv\b|联系|邮箱|简历/i,
    label: { en: 'how to reach me', zh: '怎么联系我' },
    topic: 'contact',
    say: ({ zh }) =>
      zh
        ? [`发邮件最方便：${person.email}`, '也可以在 LinkedIn 找我，代码在 GitHub（Kioberry）。', '如果是工作机会，非常欢迎！']
        : [
            `Email is easiest: ${person.email}.`,
            `I'm also on LinkedIn, and my code lives on GitHub (${person.github.split('/').pop()}).`,
            "If it's about a role, I'd love to hear from you!",
          ],
  },
  {
    id: 'location',
    match: /where (are you|do you live)|based in|located|which city|住在|在哪/i,
    label: { en: "where I'm based", zh: '在哪里' },
    say: ({ zh }) => (zh ? ['我在洛杉矶。'] : [`I'm in ${person.location.replace(', CA', '')}.`]),
  },
  {
    id: 'fun',
    match: /hobb|for fun|free time|outside (of )?work|weekend|interests?\b|爱好|业余|兴趣/i,
    label: { en: 'what I do for fun', zh: '业余爱好' },
    say: ({ zh }) =>
      zh
        ? ['生活那一页还在写（“Coming soon”），这个问题留给真人回答吧。', '偏技术的乐趣倒是有：写过一个外星猫在海里听音乐晒太阳的 GLSL 着色器场景，还和同学做过一个多人迷宫游戏。']
        : [
            "The off-screen stuff isn't on the site yet (my Life page literally says 'coming soon'), so I'll leave that one to the real me.",
            'On the nerdy-fun side though: I wrote a GLSL ocean scene with an alien cat soaking up music and sunlight, and helped build a 2D multiplayer maze game for a class.',
          ],
  },
];

function moreAbout({ zh, rng, ctx }) {
  const topic = ctx.topic;
  if (['project', 'projects', 'hackathon', 'now'].includes(topic) && ctx.project && byId[ctx.project]) {
    const p = byId[ctx.project];
    if (zh) return [`${p.title} 主要用到 ${p.tags.join('、')}。`, `（${p.subtitle}，${p.date}）`];
    return [pick(['Sure!', 'Happy to.', 'Okay, a bit more:'], rng), ...projectMore(p)];
  }
  if ((topic === 'experience' || topic === 'company') && ctx.company) {
    const i = experience.findIndex((e) => e.company === ctx.company);
    const e = experience[i];
    if (topic === 'company' && e.bullets[2]) return [`One more from ${e.company}:`, firstPerson(e.bullets[2])];
    const next = experience[(i + 1) % experience.length];
    ctx.company = next.company;
    ctx.topic = 'company';
    return [`Before that I was at ${next.company} as ${article(next.role)} ${next.role}.`, firstPerson(next.bullets[0])];
  }
  if (topic === 'passion') {
    return [
      'A good example is the payroll agent at Mulholland.',
      'It took a manual, error-prone process and turned it into something that runs on its own and only asks a person about the ambiguous cases. That kind of thing makes me really happy.',
    ];
  }
  if (topic === 'background') {
    return [`Leeds was ${leeds.period}, and I started at USC in ${usc.period.split('–')[0].trim()}.`, "Somewhere in there I also fit in four internships, so it's been a busy few years!"];
  }
  if (topic === 'skills') {
    return [
      "Lately it's mostly been agents: one coordinator model calling tools, with tracing so I can see exactly what it did.",
      'DayPilot and the Mulholland payroll agent are both built that way.',
    ];
  }
  return zh ? ['想多听哪方面？项目、工作经历，还是最近在忙什么？'] : ["Happy to! More on what, though: my projects, where I've worked, or what I'm up to now?"];
}

// ------------------------------------------------------------------------------------------- routing

function detect(part) {
  return INTENTS.find((i) => i.match.test(part)) || null;
}

// Split a message into separate questions, but only where both halves mean something different.
export function splitQuestions(message) {
  const raw = message
    .split(/[?？]+|\s*[;；。]\s*|\s+(?:and also|also|plus)\s+|另外|还有就是/i)
    .map((s) => (s || '').trim())
    .filter((s) => s.length > 1);
  const parts = [];
  for (const r of raw) {
    const halves = r.split(/\s+and\s+|，还有|，以及/);
    if (halves.length === 2) {
      const a = detect(halves[0]);
      const b = detect(halves[1]);
      if (a && b && a.id !== b.id && b.id !== 'more') {
        parts.push(halves[0], halves[1]);
        continue;
      }
    }
    parts.push(r);
  }
  // drop exact repeats of the same intent ("tell me your stack? your tech?"), keep distinct projects
  const out = [];
  for (const p of parts) {
    const i = detect(p);
    if (i && i.id !== 'project' && out.some((o) => detect(o) === i)) continue;
    out.push(p);
  }
  return (out.length ? out : [message.trim()]).slice(0, 3);
}

function fallback({ zh, rng, times }) {
  const p = pick(featured, rng);
  if (zh) return ['嗯……这个问题我答不太好。', '我只知道婉蓉的工作、项目和背景，不想乱编。', `要不要听听 ${p.title}，或者她最近在忙什么？`];
  if (times) return ["That one's outside what I know too, sorry!", `Ask me about my projects (${p.title} is a good one), my work, or how to reach me.`];
  return pick(
    [
      ["Hmm, I don't think I can answer that one well.", "I only know about my work, projects and background, and I'd rather not make things up.", `Want to hear about ${p.title} or what I'm working on now?`],
      ["Ooh, that's outside what I know, sorry!", `Ask me about my projects (${p.title} is a good one), my work, or how to reach me.`],
    ],
    rng
  );
}

// history: [{ role: 'user'|'assistant', content, topic?, topics?, project?, company? }]
export function respond(message, history = [], rng = Math.random) {
  const zh = isZh(message);
  const assistant = history.filter((h) => h.role === 'assistant');
  const last = assistant[assistant.length - 1] || {};
  const ctx = { topic: last.topic, project: last.project, company: last.company, mentioned: assistant.map((h) => h.project).filter(Boolean) };
  const topicsSoFar = assistant.flatMap((h) => h.topics || [h.topic]);
  const parts = splitQuestions(message);
  let bubbles = [];
  const topics = [];
  parts.forEach((part, idx) => {
    const intent = detect(part);
    const topic = intent ? intent.topic || intent.id : 'fallback';
    const times = topicsSoFar.concat(topics).filter((t) => t === topic).length;
    const said = intent ? intent.say({ zh, rng, times, ctx, part }) : fallback({ zh, rng, times });
    if (intent && intent.id !== 'more') ctx.topic = topic;
    topics.push(topic);
    if (idx > 0) {
      const label = intent ? intent.label[zh ? 'zh' : 'en'] : null;
      const lead = zh
        ? label
          ? `至于${label}——`
          : '还有你问的另一个——'
        : label
          ? pick([`Oh, and ${label}?`, `And ${label}:`], rng)
          : 'And your other question:';
      bubbles.push(lead);
    }
    bubbles = bubbles.concat(said);
  });
  const mainTopic = ctx.topic || topics[topics.length - 1];
  return {
    text: bubbles.join('\n\n'),
    bubbles,
    expression: topics.every((t) => t === 'fallback') ? 'think' : 'smile',
    topic: mainTopic,
    topics,
    project: ctx.project,
    company: ctx.company,
    followups: pickFollowups(
      history.filter((h) => h.role === 'user').map((h) => h.content).concat(message),
      mainTopic
    ),
  };
}

// Ask the model. Bubbles are handed to onBubble as they arrive; resolves once the answer is complete.
// Throws only if nothing at all came back, so a reply cut off halfway still keeps what was said.
async function askModel(question, history, onBubble) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: question, messages: history.map(({ role, content }) => ({ role, content })) }),
    signal: AbortSignal.timeout?.(45000),
  });
  if (!res.ok || !res.body) throw new Error(`twin api ${res.status}`);
  const bubbles = [];
  let followups;
  try {
    for await (const e of readEvents(res.body)) {
      if (e.type === 'bubble') {
        bubbles.push(e.text);
        onBubble(e.text);
      } else if (e.type === 'followups') followups = e.questions;
      else if (e.type === 'error') throw new Error(`twin api: ${e.message}`);
    }
  } catch (err) {
    if (!bubbles.length) throw err;
  }
  if (!bubbles.length) throw new Error('twin api: empty answer');
  return { text: bubbles.join('\n\n'), bubbles, expression: 'smile', followups: followups?.length ? followups : undefined };
}

export async function askTwin(question, history = [], { rng, onBubble = () => {} } = {}) {
  if (API_URL) {
    try {
      return await askModel(question, history, onBubble);
    } catch (err) {
      console.warn('[twin] API unavailable, answering from the built-in rules:', err.message);
    }
  }
  return respond(question, history, rng);
}
