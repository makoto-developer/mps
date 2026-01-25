import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      nickname: true,
      role: true,
      isBlocked: true,
    },
  });

  console.log('=== 登録ユーザー一覧 ===\n');
  
  if (users.length === 0) {
    console.log('登録されているユーザーはいません。');
    console.log('新規ユーザー登録が必要です。');
  } else {
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.nickname}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Blocked: ${user.isBlocked}`);
      console.log('');
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
