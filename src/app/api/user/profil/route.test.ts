import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next-auth', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
	authOptions: {},
}));

vi.mock('@/lib/prisma', () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
		},
	},
}));

// ─── Données de test ─────────────────────────────────────────────────────────

const mockSession = {
	user: { email: 'john@example.com' },
	expires: '',
};

const mockBookmarks = [
	{
		id: 'bookmark-1',
		title: 'Thérapie cognitive',
		link: 'https://example.com/1',
		snippet: 'Une étude TCC',
		userId: 'user-123',
		createdAt: new Date('2024-01-05'),
	},
	{
		id: 'bookmark-2',
		title: 'Psychologie clinique',
		link: 'https://example.com/2',
		snippet: 'Recherche clinique',
		userId: 'user-123',
		createdAt: new Date('2024-01-04'),
	},
];

// ✅ Correspond exactement à ce que Prisma retourne avec _count
const mockUser = {
	id: 'user-123',
	name: 'John Doe',
	email: 'john@example.com',
	password: 'hashed',
	emailVerified: null,
	image: null,
	createdAt: new Date('2023-06-01'),
	updatedAt: new Date('2024-01-01'),
	bookmarks: mockBookmarks,
	_count: {
		bookmarks: 12, // total réel, pas seulement les 5 retournés
	},
};

const makeRequest = () => new NextRequest('http://localhost/api/profile');

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('API /api/profile - GET', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ── Authentification ──────────────────────────────────────────────────────

	it('devrait retourner 401 si la session est null', async () => {
		vi.mocked(getServerSession).mockResolvedValue(null);

		const response = await GET(makeRequest());
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data.error).toBeDefined();
		expect(prisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("devrait retourner 401 si la session n'a pas d'email", async () => {
		vi.mocked(getServerSession).mockResolvedValue({
			user: {},
			expires: '',
		});

		const response = await GET(makeRequest());
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data.error).toBeDefined();
		expect(prisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ── Utilisateur introuvable ───────────────────────────────────────────────

	it("devrait retourner 404 si l'utilisateur n'existe pas en base", async () => {
		vi.mocked(getServerSession).mockResolvedValue(mockSession);
		vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

		const response = await GET(makeRequest());
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data.error).toBeDefined();
	});

	// ── Succès ────────────────────────────────────────────────────────────────

	it('devrait retourner le profil utilisateur avec succès', async () => {
		vi.mocked(getServerSession).mockResolvedValue(mockSession);
		vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

		const response = await GET(makeRequest());
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});

	it('devrait retourner les bonnes données utilisateur sans exposer le mot de passe', async () => {
		vi.mocked(getServerSession).mockResolvedValue(mockSession);
		vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

		const response = await GET(makeRequest());
		const data = await response.json();

		expect(data.user.id).toBe(mockUser.id);
		expect(data.user.name).toBe(mockUser.name);
		expect(data.user.email).toBe(mockUser.email);
		expect(data.user.createdAt).toBeDefined();
		// ✅ Le mot de passe ne doit jamais être exposé dans la réponse
		expect(data.user.password).toBeUndefined();
		expect(data.user.image).toBeUndefined();
	});

	it('devrait retourner le bon nombre total de bookmarks via _count', async () => {
		vi.mocked(getServerSession).mockResolvedValue(mockSession);
		vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

		const response = await GET(makeRequest());
		const data = await response.json();

		// ✅ bookmarksCount vient de _count.bookmarks (total = 12)
		//    et non de recentBookmarks.length (limité à 5)
		expect(data.user.bookmarksCount).toBe(12);
	});

	it('devrait retourner les bookmarks récents', async () => {
		vi.mocked(getServerSession).mockResolvedValue(mockSession);
		vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

		const response = await GET(makeRequest());
		const data = await response.json();

		expect(data.recentBookmarks).toHaveLength(2);
		expect(data.recentBookmarks[0].id).toBe('bookmark-1');
	});

	it('devrait retourner recentBookmarks vide si aucun bookmark', async () => {
		vi.mocked(getServerSession).mockResolvedValue(mockSession);
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			...mockUser,
			bookmarks: [],
			_count: { bookmarks: 0 },
		} as any);

		const response = await GET(makeRequest());
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.recentBookmarks).toEqual([]);
		expect(data.user.bookmarksCount).toBe(0);
	});

	// ── Appel Prisma ──────────────────────────────────────────────────────────

	it('devrait appeler prisma.user.findUnique avec les bons paramètres', async () => {
		vi.mocked(getServerSession).mockResolvedValue(mockSession);
		vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

		await GET(makeRequest());

		expect(prisma.user.findUnique).toHaveBeenCalledWith({
			where: { email: mockSession.user.email },
			include: {
				bookmarks: {
					orderBy: { createdAt: 'desc' },
					take: 5,
				},
				_count: {
					select: { bookmarks: true },
				},
			},
		});
	});

	// ── Gestion des erreurs ───────────────────────────────────────────────────

	it('devrait retourner 500 si Prisma lève une exception', async () => {
		vi.mocked(getServerSession).mockResolvedValue(mockSession);
		vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('DB crash'));

		const response = await GET(makeRequest());
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBeDefined();
	});
});