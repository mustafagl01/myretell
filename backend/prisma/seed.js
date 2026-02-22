import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Seeding database...');

    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            passwordHash: hashedPassword,
            creditBalance: {
                create: {
                    balance: 10 // $10 initial balance
                }
            }
        },
    });

    console.log({ user });
    console.log('Seed completed successfully.');
    console.log(`\nTest User Credentials:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
