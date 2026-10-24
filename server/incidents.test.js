import test from 'node:test';
import assert from 'node:assert/strict';
import { groupIncidents } from './incidents.js';

const origin = Date.parse('2026-10-24T06:00:00.000Z');
const report = (id, station, { category = 'crowding', minutes = 0, status = 'open' } = {}) => ({
  id,
  station,
  category,
  priority: 55,
  emergency: false,
  status,
  createdAt: new Date(origin + minutes * 60_000).toISOString(),
});

test('same-category reports at adjacent stations within 60 minutes group', () => {
  const incidents = groupIncidents([
    report('a', 'Vanaz'),
    report('b', 'Anand Nagar', { minutes: 60 }),
  ]);
  assert.equal(incidents.length, 1);
  assert.equal(incidents[0].reportCount, 2);
  assert.deepEqual(incidents[0].stations, ['Vanaz', 'Anand Nagar']);
});

test('station and time links are chained across a cluster', () => {
  const incidents = groupIncidents([
    report('a', 'Vanaz', { minutes: 0 }),
    report('b', 'Anand Nagar', { minutes: 50 }),
    report('c', 'Paud Phata', { minutes: 100 }),
  ]);
  assert.equal(incidents.length, 1);
  assert.equal(incidents[0].reportCount, 3);
});

test('reports in different categories do not group', () => {
  const incidents = groupIncidents([
    report('a', 'Vanaz', { category: 'safety' }),
    report('b', 'Anand Nagar', { category: 'crowding', minutes: 10 }),
  ]);
  assert.equal(incidents.length, 0);
});

test('reports at non-adjacent stations do not group', () => {
  const incidents = groupIncidents([
    report('a', 'Vanaz'),
    report('b', 'Paud Phata', { minutes: 10 }),
  ]);
  assert.equal(incidents.length, 0);
});

test('resolved reports are excluded from incidents', () => {
  const incidents = groupIncidents([
    report('a', 'Vanaz'),
    report('b', 'Anand Nagar', { minutes: 10, status: 'resolved' }),
  ]);
  assert.equal(incidents.length, 0);
});
