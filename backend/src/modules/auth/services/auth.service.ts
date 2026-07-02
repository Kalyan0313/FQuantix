import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../repositories/auth.repository.interface';
import { RegisterDto, LoginDto, AuthResponseDto } from '../dto/auth.dto';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../../shared/errors';
import { config } from '../../../config';

export class AuthService {
  // Dependency Injection via constructor
  constructor(private userRepository: IUserRepository) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictError('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
    });

    const token = this.generateToken(user.id, user.email, user.name);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = this.generateToken(user.id, user.email, user.name);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async getUserProfile(userId: string): Promise<{ id: string; email: string; name: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  private generateToken(id: string, email: string, name: string): string {
    return jwt.sign(
      { id, email, name },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as any }
    );
  }
}
