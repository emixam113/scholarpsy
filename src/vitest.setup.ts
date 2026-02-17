import { expect, vi} from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Mocks pour les dépendances internes
vi.mock('@/lib/auth', () => ({
	authOptions: {}, // Mock basique pour authOptions
}));

vi.mock('@/lib/api-response', () => ({
	apiSuccess: (data: any, message?: string) => ({
		status: 200,
		json: () => Promise.resolve({ success: true, data, message }),
	}),
	apiError: (message: string, status: number) => ({
		status,
		json: () => Promise.resolve({ success: false, message }),
	}),
}));

// Mocks pour Next.js
vi.mock('next-auth', () => ({
	getServerSession: vi.fn(),
}));

// Mocks pour les autres dépendances
vi.mock('@next-auth/prisma-adapter', () => ({}));
vi.mock('argon2', () => ({
	verify: vi.fn().mockResolvedValue(true),
}));
vi.mock('./prisma', () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
		},
	},
}));
