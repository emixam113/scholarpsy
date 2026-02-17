import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as argon2 from 'argon2';

// 1. DÉFINIR LES VARIABLES D'ENVIRONNEMENT (Avant les imports !)
process.env.NEXTAUTH_SECRET = 'test-secret-123';
process.env.NODE_ENV = 'development';

// 2. MOCKS DES DÉPENDANCES
vi.mock('@/lib/prisma', () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
		},
	},
}));

vi.mock('argon2', () => ({
	verify: vi.fn(),
}));

// Mock de NextAuth pour capturer la configuration
vi.mock('next-auth', () => {
	return {
		default: vi.fn((config) => {
			// On attache la config au global pour que le test y accède
			(global as any).__nextAuthConfig = config;
			return {
				GET: vi.fn(),
				POST: vi.fn(),
			};
		}),
	};
});

vi.mock('next-auth/providers/credentials', () => ({
	default: vi.fn((config) => config),
}));

// 3. IMPORT DE LA ROUTE (Après les mocks et l'env)
import { prisma } from '@/lib/prisma';

describe('API /api/auth/[...nextauth] - Configuration', () => {
	let authorizeFunction: any;

	beforeEach(async () => {
		vi.clearAllMocks();

		// On s'assure que la route est chargée
		await import('./route');

		const config = (global as any).__nextAuthConfig;
		if (config && config.providers) {
			authorizeFunction = config.providers[0].authorize;
		}
	});

	describe('NextAuth Configuration', () => {
		it('devrait avoir un secret configuré', () => {
			const config = (global as any).__nextAuthConfig;
			// Maintenant que process.env.NEXTAUTH_SECRET est défini, ceci passera
			expect(config.secret).toBeDefined();
			expect(config.secret).toBe('test-secret-123');
		});

		it('devrait utiliser la stratégie JWT pour les sessions', () => {
			const config = (global as any).__nextAuthConfig;
			expect(config.session?.strategy).toBe('jwt');
		});

		it('devrait avoir la page de login personnalisée configurée', () => {
			const config = (global as any).__nextAuthConfig;
			expect(config.pages?.signIn).toBe('/login');
		});
	});

	describe('CredentialsProvider - authorize()', () => {
		const validCredentials = {
			email: 'maxime@royan.fr',
			password: 'MotDePasse123!',
		};

		const mockUser = {
			id: 'user-123',
			name: 'Maxime Royan',
			email: 'maxime@royan.fr',
			password: '$argon2id$hashedpassword',
		};

		it('devrait authentifier un utilisateur avec des credentials valides', async () => {
			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
			vi.mocked(argon2.verify).mockResolvedValue(true);

			const result = await authorizeFunction(validCredentials);

			expect(result).toEqual({
				id: mockUser.id,
				email: mockUser.email,
				name: mockUser.name,
			});
		});

		it('devrait rejeter si l\'utilisateur n\'existe pas', async () => {
			vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
			const result = await authorizeFunction(validCredentials);
			expect(result).toBeNull();
		});
	});

	describe('Callbacks', () => {
		it('jwt() devrait ajouter l\'ID utilisateur au token', async () => {
			const config = (global as any).__nextAuthConfig;
			const token = { email: 'maxime@royan.fr' };
			const user = { id: 'user-123' };

			const result = await config.callbacks.jwt({ token, user });
			expect(result.id).toBe('user-123');
		});

		it('session() devrait ajouter l\'ID du token à la session', async () => {
			const config = (global as any).__nextAuthConfig;
			const session = { user: {} };
			const token = { id: 'user-123' };

			const result = await config.callbacks.session({ session, token });
			expect(result.user.id).toBe('user-123');
		});
	});
});