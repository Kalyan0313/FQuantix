import { z } from 'zod';
import { registerSchema, loginSchema } from '../validation/auth.validation';

export type RegisterDto = z.infer<typeof registerSchema>['body'];
export type LoginDto = z.infer<typeof loginSchema>['body'];

export interface AuthResponseDto {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}
