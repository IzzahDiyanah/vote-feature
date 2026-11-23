/**
 * Demo data. Safe to run more than once.
 * These accounts are for LOCAL DEMO ONLY; the shared password is not a secret.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RequestStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const DEMO_PASSWORD = 'Password123!';

const SAMPLE_REQUESTS: { title: string; description: string; status: RequestStatus }[] = [
  { title: 'Dark mode for the dashboard', description: 'Please add a dark theme. Working late with a bright white screen is hard on the eyes.', status: 'PLANNED' },
  { title: 'Export reports to CSV', description: 'We need to download any report as a CSV file so we can open it in Excel.', status: 'IN_PROGRESS' },
  { title: 'Slack notifications for new comments', description: 'Send a Slack message when someone comments on a request I follow.', status: 'UNDER_REVIEW' },
  { title: 'Single sign-on with Google', description: 'Let our team sign in with their Google accounts instead of another password.', status: 'UNDER_REVIEW' },
  { title: 'Mobile app for iOS and Android', description: 'A native mobile app would let us review requests while travelling.', status: 'DECLINED' },
  { title: 'Bulk edit request tags', description: 'Select many requests at once and change their tags in one step.', status: 'UNDER_REVIEW' },
  { title: 'Keyboard shortcuts', description: 'Add shortcuts for common actions such as voting, commenting and searching.', status: 'RELEASED' },
  { title: 'Weekly email digest', description: 'A short weekly email with the most voted requests and status changes.', status: 'PLANNED' },
  { title: 'Public roadmap page', description: 'Show planned and in-progress items on a public page that customers can read.', status: 'UNDER_REVIEW' },
  { title: 'Duplicate of: CSV export', description: 'It would be great to get a CSV download of the request list.', status: 'UNDER_REVIEW' },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const people = [
    { email: 'admin@example.com', name: 'Admin Ada', role: 'ADMIN' as const },
    { email: 'alice@example.com', name: 'Alice', role: 'USER' as const },
    { email: 'bob@example.com', name: 'Bob', role: 'USER' as const },
  ];
  const users = [];
  for (const p of people) {
    users.push(
      await prisma.user.upsert({
        where: { email: p.email },
        update: {},
        create: { ...p, passwordHash },
      }),
    );
  }
  const [admin, alice, bob] = users;

  if ((await prisma.featureRequest.count()) > 0) {
    console.log('Requests already exist, skipping sample requests.');
    return;
  }

  let i = 0;
  for (const r of SAMPLE_REQUESTS) {
    const author = i % 2 === 0 ? alice : bob;
    const created = await prisma.featureRequest.create({
      data: { ...r, authorId: author.id, createdAt: new Date(Date.now() - i * 36 * 3600 * 1000) },
    });
    if (r.status !== 'UNDER_REVIEW') {
      await prisma.statusChange.create({
        data: { requestId: created.id, adminId: admin.id, fromStatus: 'UNDER_REVIEW', toStatus: r.status },
      });
    }
    // a few votes and a comment, so the list looks alive
    const voters = [alice, bob, admin].slice(0, (i % 3) + 1);
    await prisma.vote.createMany({
      data: voters.map((v) => ({ userId: v.id, requestId: created.id })),
      skipDuplicates: true,
    });
    if (i % 2 === 0) {
      await prisma.comment.create({
        data: { requestId: created.id, authorId: bob.id, body: 'Yes please, this would help our team a lot.' },
      });
    }
    i++;
  }
  console.log(`Seeded ${people.length} users and ${SAMPLE_REQUESTS.length} requests.`);
  console.log(`Log in as admin@example.com / alice@example.com / bob@example.com with password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
