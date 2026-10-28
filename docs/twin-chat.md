# Twin chat: making it sound like a person

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

* **Real LLM answers.** `askTwin` already calls `REACT_APP_TWIN_API_URL` if set, and sends
  `TWIN_STYLE_PROMPT` so a model writes in the same short-bubble voice. Needs a small serverless
  function holding an API key. I did not set anything up with keys.
* **Streaming tokens from the model** (SSE). Would replace the fake word timer with real arrival times;
  `pace.js` could still add the sentence pauses on top.
* **Per-bubble moods** for the ASCII figure (`expression` per bubble rather than per answer).
* **Typos and corrections** ("teh -> the"): very human, but it reads as a gimmick on a portfolio, so I left it out.

## Try it

```
npm start            # then ask: "What's your background and how do I reach you?"
                     # while it talks, ask "tell me more" and "Are you a real person?"
npm test -- --watchAll=false
```
