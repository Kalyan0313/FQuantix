import { Router } from 'express';
import { UserRepository } from './repositories/auth.repository';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { validate } from '../../middleware/validate';
import { registerSchema, loginSchema } from './validation/auth.validation';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Dependency Injection Setup
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

// Routes definition
router.post('/signup', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/profile', authenticate, authController.getProfile);

export const authRouter = router;
export { authService }; // export authService if needed in tests
