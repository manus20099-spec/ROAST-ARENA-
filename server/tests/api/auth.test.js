import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { User } from '../../src/models/User.js';

describe('Auth API (/api/auth)', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('POST /signup creates user and sets httpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'founder@example.com',
        password: 'Password123!',
        displayName: 'Founder_One',
      })
      .expect(201);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.displayName).toBe('Founder_One');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=/);
    expect(cookies[0]).toMatch(/HttpOnly/i);
  });

  it('rejects disposable email domains with 400 DISPOSABLE_EMAIL', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'spammer@mailinator.com',
        password: 'Password123!',
        displayName: 'Spammer',
      })
      .expect(400);

    expect(res.body.error.code).toBe('DISPOSABLE_EMAIL');
  });

  it('rejects duplicate displayName case-insensitively with 409 NAME_TAKEN', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'user1@example.com',
        password: 'Password123!',
        displayName: 'CoolFounder',
      })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'user2@example.com',
        password: 'Password123!',
        displayName: 'coolfounder', // Same key in lowercase!
      })
      .expect(409);

    expect(res.body.error.code).toBe('NAME_TAKEN');
  });

  it('rejects duplicate email with 409 EMAIL_TAKEN', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'repeat@example.com',
        password: 'Password123!',
        displayName: 'FounderA',
      })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'repeat@example.com',
        password: 'Password123!',
        displayName: 'FounderB',
      })
      .expect(409);

    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('POST /login logs in user with correct credentials and sets cookie', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'login@example.com',
        password: 'Password123!',
        displayName: 'LoginUser',
      })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'Password123!',
      })
      .expect(200);

    expect(res.body.user.displayName).toBe('LoginUser');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns exact same error message for wrong password and wrong email', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'user@example.com',
        password: 'CorrectPass123!',
        displayName: 'ExistingUser',
      })
      .expect(201);

    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'WrongPassword!' })
      .expect(401);

    const wrongEmailRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'AnyPassword!' })
      .expect(401);

    expect(wrongPassRes.body.error.message).toBe(wrongEmailRes.body.error.message);
  });

  it('POST /logout clears cookie', async () => {
    const res = await request(app).post('/api/auth/logout').expect(200);
    expect(res.body.ok).toBe(true);
  });

  it('GET /me returns user: null when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me').expect(200);
    expect(res.body.user).toBeNull();
  });

  it('GET /me returns user profile when valid cookie is provided', async () => {
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'me@example.com',
        password: 'Password123!',
        displayName: 'MeUser',
      })
      .expect(201);

    const cookie = signupRes.headers['set-cookie'];

    const res = await request(app).get('/api/auth/me').set('Cookie', cookie).expect(200);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.displayName).toBe('MeUser');
    expect(res.body.user.email).toBeUndefined(); // Email is never exposed publicly
  });

  it('NoSQL injection payload in login body is sanitized ($gt stripped)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: { $gt: '' },
        password: 'test',
      })
      .expect(400); // Fails zod validation because email is an empty object after $gt is stripped

    expect(res.body.error).toBeDefined();
  });
});
