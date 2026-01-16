import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding admin users...');

    const adminUsers = [
        {
            name: 'Jaime Simon',
            email: 'jfsimon.pro@gmail.com',
            password: '52002009',
        },
        {
            name: 'Davi',
            email: 'davi@admin.com',
            password: 'admin123',
        },
    ];

    for (const admin of adminUsers) {
        // Hash password
        const hashedPassword = await bcrypt.hash(admin.password, 10);

        // Upsert (create or update if exists)
        const user = await prisma.user.upsert({
            where: { email: admin.email },
            update: {
                password: hashedPassword,
                role: 'ADMIN',
            },
            create: {
                name: admin.name,
                email: admin.email,
                password: hashedPassword,
                role: 'ADMIN',
            },
        });

        console.log(`✅ Admin user created/updated: ${user.email}`);
    }

    console.log('🎉 Seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
