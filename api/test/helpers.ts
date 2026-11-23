import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export type Agent = ReturnType<typeof request.agent>;

export async function createApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app: INestApplication = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

export async function resetDb(prisma: PrismaService) {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Vote","Comment","StatusChange","FeatureRequest","User" RESTART IDENTITY CASCADE',
  );
}

let counter = 0;

/** Register a new user and return a logged-in agent (it keeps the cookie). */
export async function newUser(app: INestApplication, name = 'User') {
  counter++;
  const email = `${name.toLowerCase()}${counter}@test.com`;
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post('/auth/register').send({ email, name, password: 'Password123!' });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user: res.body.user as { id: string; email: string; name: string; role: string } };
}

/** A user promoted to ADMIN directly in the database (the role is read per request). */
export async function newAdmin(app: INestApplication, prisma: PrismaService) {
  const made = await newUser(app, 'Admin');
  await prisma.user.update({ where: { id: made.user.id }, data: { role: 'ADMIN' } });
  return made;
}

export async function newRequest(agent: Agent, title = 'A useful feature', description = 'This would help a lot of people.') {
  const res = await agent.post('/requests').send({ title, description });
  if (res.status !== 201) throw new Error(`create failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: string };
}
