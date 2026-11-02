import { askTwin, asSpoken, respond, splitQuestions, toBubbles } from './twinAgent';

const rng = () => 0; // deterministic variant choice

test('routes project names and generic questions to the right answer', async () => {
  expect((await askTwin('Tell me about Job Hunter', [], { rng })).text).toMatch(/Job Hunter/);
  expect((await askTwin('Tell me about DayPilot', [], { rng })).text).toMatch(/DayPilot/);
  expect((await askTwin('What was your last job?', [], { rng })).text).toMatch(/Most recently/);
});

test('answers come as short chat bubbles in first person', () => {
  const r = respond("What's your background?", [], rng);
  expect(r.bubbles.length).toBeGreaterThan(1);
  r.bubbles.forEach((b) => expect(b.length).toBeLessThan(260));
  expect(r.text).toMatch(/\bI('m| )/);
  expect(respond("What's your tech stack?", [], rng).text).not.toMatch(/Languages:|AI \/ LLM:/); // no key: value dumps
});

test('several questions in one message get several answers, in order', () => {
  expect(splitQuestions("What's your background and how do I reach you?")).toHaveLength(2);
  const r = respond("What's your tech stack? How do I reach you?", [], rng);
  expect(r.topics).toEqual(['skills', 'contact']);
  expect(r.text.indexOf('Python')).toBeLessThan(r.text.indexOf('@'));
});

test('a single question is not split', () => {
  expect(splitQuestions('Tell me about DayPilot')).toEqual(['Tell me about DayPilot']);
  expect(splitQuestions('What are you working on now?')).toHaveLength(1);
});

test('"tell me more" continues the last topic', () => {
  const first = respond('Tell me about LabMind', [], rng);
  const history = [
    { role: 'user', content: 'Tell me about LabMind' },
    { role: 'assistant', content: first.text, topic: first.topic, project: first.project },
  ];
  const more = respond('tell me more', history, rng);
  expect(more.text).toMatch(/LangChain|Bayesian/);
});

test('repeating a question is acknowledged instead of answered word for word', () => {
  const a = respond('Favorite project?', [], rng);
  const history = [
    { role: 'user', content: 'Favorite project?' },
    { role: 'assistant', content: a.text, topic: a.topic, project: a.project },
  ];
  const b = respond('Favorite project?', history, rng);
  expect(b.text).not.toEqual(a.text);
  expect(b.text).toMatch(/Still/);
});

test('admits being a twin and does not invent unknown facts', () => {
  expect(respond('Are you a real person?', [], rng).text).toMatch(/digital twin/);
  const r = respond("What's your favorite pizza topping?", [], rng);
  expect(r.topic).toBe('fallback');
  expect(r.text).toMatch(/rather not make things up|outside what I know/);
});

test('Chinese questions get Chinese answers', () => {
  expect(respond('你的背景是什么？', [], rng).text).toMatch(/USC/);
  expect(respond('你的背景是什么？', [], rng).text).toMatch(/[一-鿿]/);
});

test('toBubbles keeps bubbles short', () => {
  const b = toBubbles('One. Two two. ' + 'Three is a much longer sentence that keeps going and going for a while. '.repeat(3));
  b.forEach((x) => expect(x.length).toBeLessThan(260));
});

test('decimals do not break sentences, and captions are said as sentences', () => {
  expect(toBubbles('Beat GPT-4o, Gemini 2.0 Flash and Claude. Reached 0.842 accuracy.').join(' ')).toMatch(/Gemini 2\.0 Flash/);
  expect(asSpoken('An AI agent that plans your day.')[0]).toMatch(/^It's an AI agent/);
  expect(asSpoken('Turns raw microscopy into decisions.')[0]).toMatch(/^It turns raw/);
  expect(asSpoken('QLoRA-fine-tuned small models for poker.')[0]).toMatch(/^Basically: QLoRA/);
});

test('the three home-page questions have their own answers', () => {
  const roles = respond('What roles are you looking for?', [], rng);
  expect(roles.topic).toBe('roles');
  expect(roles.text).toMatch(/sponsorship/);
  expect(respond('What can I try live?', [], rng).text).toMatch(/LabMind.*Cloud Run/);
  expect(respond('Which project are you proudest of?', [], rng).topic).toBe('projects');
  expect(respond('How did you build this twin?', [], rng).topic).toBe('twin');
  expect(respond('Where do you live?', [], rng).text).toMatch(/relocate/);
});
