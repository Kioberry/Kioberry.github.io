# Twin chat: making it sound like a person

## A real model behind the twin (like matthewpetersen.ca)

**What Petersen's site actually runs** (read from its JS bundle and its `/api/chat` responses, 2026-10-28):
Next.js on Vercel. The chat is an LLM behind his own `POST /api/chat`: the page sends `{ query, messages }`
(the last 6 turns) and gets server-sent events back: `language`, then one `sentence` at a time, then `done`
and `followups` (questions the model wrote for the chips). Which model and prompt he uses stays on his server. Voice
is Cartesia (speech-to-text over a websocket with end-of-turn detection, text-to-speech with word timings and
visemes), capped at 180 seconds a day per browser. The face is a Ready Player Me 3D avatar lip-synced by his
fork of TalkingHead, drawn through a WebGL ASCII shader. Asked "how was your day?", it said
"Pretty productive. I got some code working on the Darwin SDK..." It doesn't refuse small talk; it answers from
what he is working on now.

**Ours now works the same way:**

```
browser (useTwinChat) --POST {query, messages}--> twin-api (Cloudflare Worker) --stream--> Claude API
        <------ SSE: bubble, bubble, ..., followups, done ------
```

* `twin-api/src/persona.js`: **the file to edit.** What's going on now (small talk is answered from this),
  extra true facts, and example exchanges in your voice. The twin is told never to invent anything beyond this
  file and `src/data/profile.js`, so the more true, specific notes you add (what you're reading, opinions on tools,
  a story from a project), the more human it sounds.
* `twin-api/src/prompt.js`: the system prompt (voice, small talk, honesty, the hidden `>>` follow-up line).
* `twin-api/src/index.js`: the Worker. It keeps the API key server-side, allows only your site's origins,
  limits each IP to 20 questions a minute, caps question and history length, and streams each bubble as
  soon as the model finishes the line.
* `src/agent/twinStream.js`: the wire format, shared by both sides (tested).
* The page still paces the reveal like a person, and **falls back to the rule-based twin** if the API is down,
  rate-limited or not configured. Without `REACT_APP_TWIN_API_URL` the site behaves exactly as before.

**Deploy it** (about 10 minutes; needs an Anthropic API key and a free Cloudflare account):

1. In the Anthropic Console, create an API key and set a monthly spend limit.
2. `cd twin-api && npm install && npx wrangler login`
3. `npx wrangler secret put ANTHROPIC_API_KEY` (paste the key when asked)
4. `npm run deploy`: this prints `https://astrid-twin.<your-subdomain>.workers.dev`
5. In the site root, create `.env.production` containing
   `REACT_APP_TWIN_API_URL=https://astrid-twin.<your-subdomain>.workers.dev`, then rebuild and publish the site.

Local: put `ANTHROPIC_API_KEY=...` in `twin-api/.dev.vars` (gitignored), run `npm run dev` in `twin-api/`,
then `REACT_APP_TWIN_API_URL=http://localhost:8787 npm start` in the site root.

**Model and cost.** `wrangler.toml` sets `MODEL = "claude-haiku-5-5"` ($0.10 / $0.50 per million input / output
tokens) at `EFFORT = "low"` (chat doesn't need deep thinking). The prompt is about 2.6k tokens, so a question costs
roughly $0.0004 (1,000 questions ≈ $0.40). If the answers feel too thin, try `claude-sonnet-5-5` (≈ $0.01 a
question) or `claude-opus-5-5` (≈ $0.005 to $0.015); both also get `fallbacks: "default"`, so a safety-classifier
decline is retried on the model the API recommends. Haiku has no such fallback; a decline becomes the
"rather not get into that one" bubble.

## Layout: the panel grows down, not up

Before, the panel was pinned to the bottom of the screen, so each new line pushed its top edge up over the
figure. Now (`Dock` in `HomeLayouts.js`) the panel's top edge stays where it is before the first question,
and the scene grows by the conversation's height (`--grow`), so the page gets longer, as on Petersen's site. The
page scrolls to keep the input in view only while the visitor is following along; the backdrop keeps the
first screen's height and the floor fades out where that screen ends. The conversation area is capped at
`min(28vh, 280px)` and scrolls inside.

---

## The rule-based twin (fallback)

Branch `twin-human-chat` (2026-10-28). Your uncommitted work from `redesign-ascii-twin` is the first commit
on this branch, unchanged. A copy is also on `backup/wip-redesign-ascii-twin-20261028`.

## What changed, in one line each

| # | Way | Where | What you will notice |
| :-- | :-- | :-- | :-- |
| 1 | **Chat bubbles instead of one block** | `twinAgent.js` (`bubbles`, `toBubbles`) | Each answer is 1 to 4 short messages, like texting |
| 2 | **First-person, plain voice** | `twinAgent.js` intents | "I'm doing my M.S. at USC right now..." instead of "Languages: Python, ..." |
| 3 | **Several ways to say each thing** | `pick(variants, rng)` | Asking twice does not give the same wording |
| 4 | **Remembers what was asked** | `times` + `history` | A repeat gets "Still DayPilot, I think!" instead of the same speech |
| 5 | **Several questions in one message** | `splitQuestions()` | "What's your background and how do I reach you?" gets both answers, with "Oh, and how to reach me?" in between |
| 6 | **Follow-ups use context** | `more` intent, `ctx.topic/project/company` | "tell me more", "why?", "展开说说" continue the last topic |
| 7 | **Ask while it talks** | `useTwinChat.js` queue | New questions show as "(next)" and get answered in order; no more disabled chips |
| 8 | **Human pace** | `pace.js` | A thinking pause first (longer for longer questions), then word-by-word reveal at about 20-25 characters a second, real pauses at commas and full stops, a "typing..." bounce between bubbles. About 2x slower than the old 18 ms typewriter |
| 9 | **Voice-synced text** | `useTwinChat.js` speak effect | With conversation mode on, each bubble is spoken and words appear as they are said (`onboundary`) |
| 10 | **Honest twin** | `identity` + `fallback` | "Are you real?" -> "I'm Astrid's digital twin..."; unknown questions -> "I'd rather not make things up" + a suggestion |
| 11 | **Conversation stays visible** | `TwinPanel.js` | Earlier turns stay above, dimmed; click anywhere on the answer to skip ahead |

Facts still come only from `src/data/profile.js`. Wording that is hand-written (not generated from the data)
is in the intents: if you change the profile, skim `twinAgent.js` for numbers like 71.4% / 98.1%.

## Tuning

All timing is in `src/agent/pace.js` (`PACE`). The two knobs that matter most:

* `wordMs` + `perCharMs`: overall speed. Raise both by 30% for a slower, more deliberate voice.
* `stopMs` / `commaMs`: how long the breath is at the end of a sentence / clause.

`prefers-reduced-motion` users get the whole answer at once.

## Other ways I considered (not built)

* **Cartesia voice** like Petersen's (natural TTS with word timings instead of the browser's
  `speechSynthesis`). Needs a second paid key and a token endpoint in the Worker.
* **Per-bubble moods** for the ASCII figure (`expression` per bubble rather than per answer).
* **Typos and corrections** ("teh -> the"): very human, but it reads as a gimmick on a portfolio, so I left it out.

## Try it

```
npm start            # then ask: "What's your background and how do I reach you?"
                     # while it talks, ask "tell me more" and "Are you a real person?"
npm test -- --watchAll=false
```
