import request from 'supertest'
import { createApp } from '../app'

const app = createApp()

const testUser = {
  name: 'Test User',
  email: 'test@americo.cl',
  password: 'password123',
}

describe('Auth endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser)
      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.accessToken).toBeDefined()
      expect(res.body.data.user.email).toBe(testUser.email)
    })

    it('should reject duplicate email', async () => {
      await request(app).post('/api/v1/auth/register').send(testUser)
      const res = await request(app).post('/api/v1/auth/register').send(testUser)
      expect(res.status).toBe(409)
    })

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'not-an-email' })
      expect(res.status).toBe(400)
    })

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...testUser, password: '123' })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(testUser)
    })

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
      expect(res.status).toBe(200)
      expect(res.body.data.accessToken).toBeDefined()
    })

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'wrong' })
      expect(res.status).toBe(401)
    })

    it('should reject unknown email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@americo.cl', password: 'password123' })
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const registerRes = await request(app).post('/api/v1/auth/register').send(testUser)
      const token = registerRes.body.data.accessToken

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.data.email).toBe(testUser.email)
    })

    it('should reject missing token', async () => {
      const res = await request(app).get('/api/v1/auth/me')
      expect(res.status).toBe(401)
    })
  })
})
