import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Ensure env is loaded before client init
dotenv.config();

// Alias POSTGRES_URL to DATABASE_URL if missing
if (!process.env.DATABASE_URL && process.env.POSTGRES_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_URL;
}

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
