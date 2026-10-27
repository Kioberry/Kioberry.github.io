import { askTwin } from './twinAgent';

jest.setTimeout(10000);

test('routes project names and generic questions to the right answer', async () => {
  expect((await askTwin('Tell me about Job Hunter')).text).toMatch(/^Job Hunter:/);
  expect((await askTwin('Tell me about DayPilot')).text).toMatch(/^DayPilot:/);
  expect((await askTwin('What was your last job?')).text).toMatch(/Most recently/);
});
