import { PrismaClient } from '@prisma/client';

// PrismaClient singleton pattern
// Prevents multiple instances in development with hot reloading
const prismaClientSingleton = () => {
  return new PrismaClient();
};

const globalForPrisma = global;

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
