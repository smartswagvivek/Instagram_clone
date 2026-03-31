import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../app.js';

test('GET /api/health returns service metadata', async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.service, 'instagram-clone-api');
});
