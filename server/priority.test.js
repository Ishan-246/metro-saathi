import test from 'node:test';
import assert from 'node:assert/strict';
import { keywordFallback } from './ai.js';
import { priorityDetails } from './priority.js';

const score = (text, similarToday = 0) => priorityDetails(keywordFallback(text), similarToday);

test('ticketing reports score 30 and Low', () => {
  assert.deepEqual(score('Ticket machine is not working'), { priority: 30, label: 'Low', reason: 'Ticketing', team: 'Ticketing desk' });
});

test('crowding reports score 55 and Medium', () => {
  const result = score('Crowd at the platform');
  assert.equal(result.priority, 55);
  assert.equal(result.label, 'Medium');
});

test('wet stairs score 45 and Medium', () => {
  const result = score('Wet stairs near platform 2');
  assert.equal(result.priority, 45);
  assert.equal(result.label, 'Medium');
});

test('crowding with a slippery floor scores 80 and High', () => {
  const result = score('Crowd and slippery floor at the entrance');
  assert.equal(result.priority, 80);
  assert.equal(result.label, 'High');
});

test('a stuck passenger in a lift scores 100 and Emergency', () => {
  const result = score('Passenger is stuck in the lift');
  assert.equal(result.priority, 100);
  assert.equal(result.label, 'Emergency');
});

test('non-emergency scores cap at 99', () => {
  const result = priorityDetails({ category: 'safety', danger: true, vulnerable: true, crowded: true, emergency: false }, 20);
  assert.equal(result.priority, 99);
  assert.equal(result.label, 'High');
});

test('similar reports add five each up to a maximum of fifteen', () => {
  const analysis = { category: 'safety', emergency: false };
  assert.equal(priorityDetails(analysis, 3).priority, 75);
  assert.equal(priorityDetails(analysis, 20).priority, 75);
});
