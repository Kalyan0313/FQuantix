import { User, Prisma } from '@prisma/client';
import { IUserRepository } from './auth.repository.interface';
import { prisma } from '../../../config/database';

export class UserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    // When a User is created, we also create a default empty Portfolio (with 10,00,000 balance) and Watchlist
    return prisma.user.create({
      data: {
        ...data,
        portfolio: {
          create: {
            balance: 1000000.0, // Default ₹10,00,000 virtual balance
          },
        },
        watchlist: {
          create: {},
        },
      },
      include: {
        portfolio: true,
        watchlist: true,
      },
    });
  }
}
