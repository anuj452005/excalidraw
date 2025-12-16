import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// @ts-ignore - Prisma 7 with adapters has type issues
const prisma = new PrismaClient({ adapter }) as PrismaClient;

export default prisma;
