import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from './api.js';

test('fractional browser clocks are sent as integer API milliseconds', async () => {
  const original = globalThis.fetch;
  const bodies = [];
  globalThis.fetch = async (_, options) => {
    bodies.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({}) };
  };
  try {
    await api.controlRoom('pause', 123.456);
    await api.startSinging('demo-signal', 456.789);
    assert.equal(bodies[0].position_ms, 123);
    assert.equal(bodies[1].song_position_ms, 457);
  } finally { globalThis.fetch = original; }
});

test('validation errors are readable instead of object coercion', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ok: false, status: 422, json: async () => ({detail: [{msg: 'invalid'}]})});
  try { await assert.rejects(api.songs(), /422/); }
  finally { globalThis.fetch = original; }
});
