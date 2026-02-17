import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST, DELETE } from './route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

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
		// ✅ 'bookmark' singulier — correspond exactement au schema Prisma du route.ts
		bookmark: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
	},
}));

vi.mock('@/lib/api-response', () => ({
	apiSuccess: (data: any, message?: string) =>
		NextResponse.json({ success: true, data, message }, { status: 200 }),
	apiError: (message: string, status: number) =>
		NextResponse.json({ error: message }, { status }),
}));

// ─── Données de test ─────────────────────────────────────────────────────────

const mockUser = {
	id: 'user-123',
	name: 'John Doe',
	email: 'johnDoe@gmail.com',
	password: 'hashed',
	emailVerified: null,
	image: null,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockBookmarks = [
	{
		id: 'bookmark-1',
		title: 'thérapie cognitive',
		link: 'https://exemple.com/article-1',
		snippet: 'une étude sur les thérapies cognitives', // ✅ 'snippet' singulier
		userId: 'user-123',
		createdAt: new Date(),
	},
	{
		id: 'bookmark-2',
		title: 'psychologie clinique',
		link: 'https://exemple.com/article-2',
		snippet: 'Recherche en psychologie',               // ✅ 'snippet' singulier
		userId: 'user-123',
		createdAt: new Date(),
	},
];

const mockSession = {
	user: { email: mockUser.email },
	expires: '',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('API /api/bookmark', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ── GET ──────────────────────────────────────────────────────────────────

	describe('GET', () => {
		it("devrait récupérer tous les bookmarks de l'utilisateur", async () => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(prisma.user.findUnique).mockResolvedValue({
				...mockUser,
				bookmarks: mockBookmarks,
			} as any);

			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.data.bookmarks).toHaveLength(2);
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { email: mockUser.email },
				include: {
					bookmarks: { orderBy: { createdAt: 'desc' } },
				},
			});
		});

		it('devrait retourner une liste vide si aucun bookmark', async () => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(prisma.user.findUnique).mockResolvedValue({
				...mockUser,
				bookmarks: [],
			} as any);

			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.data.bookmarks).toEqual([]);
		});

		it('devrait retourner 401 si non authentifié', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBeDefined();
		});

		// ✅ Le route.ts fait `user?.bookmarks || []` donc user=null → retourne [] avec 200
		it("devrait retourner une liste vide si l'utilisateur est introuvable", async () => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.data.bookmarks).toEqual([]);
		});
	});

	// ── POST ─────────────────────────────────────────────────────────────────

	describe('POST', () => {
		// ✅ 'snippet' singulier — correspond au destructuring dans route.ts
		const newBookmarkPayload = {
			title: 'nouveau bookmark',
			link: 'https://exemple.com/article-3',
			snippet: 'description du bookmark',
		};

		it('devrait créer un bookmark avec succès', async () => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
			// ✅ prisma.bookmark.create (singulier)
			vi.mocked(prisma.bookmark.create).mockResolvedValue({
				id: 'bookmark-3',
				...newBookmarkPayload,
				userId: mockUser.id,
				createdAt: new Date(),
			} as any);

			const request = new NextRequest('http://localhost/api/bookmark', {
				method: 'POST',
				body: JSON.stringify(newBookmarkPayload),
				headers: { 'Content-Type': 'application/json' },
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			// ✅ Vérifie les données passées à Prisma
			expect(prisma.bookmark.create).toHaveBeenCalledWith({
				data: {
					title: newBookmarkPayload.title,
					link: newBookmarkPayload.link,
					snippet: newBookmarkPayload.snippet,
					userId: mockUser.id,
				},
			});
		});

		it('devrait retourner 401 si non authentifié', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const request = new NextRequest('http://localhost/api/bookmark', {
				method: 'POST',
				body: JSON.stringify(newBookmarkPayload),
				headers: { 'Content-Type': 'application/json' },
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBeDefined();
			expect(prisma.bookmark.create).not.toHaveBeenCalled();
		});

		it("devrait retourner 404 si l'utilisateur est introuvable", async () => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

			const request = new NextRequest('http://localhost/api/bookmark', {
				method: 'POST',
				body: JSON.stringify(newBookmarkPayload),
				headers: { 'Content-Type': 'application/json' },
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBeDefined();
			expect(prisma.bookmark.create).not.toHaveBeenCalled();
		});

		it('devrait retourner 500 si Prisma lève une erreur', async () => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
			vi.mocked(prisma.bookmark.create).mockRejectedValue(new Error('DB error'));

			const request = new NextRequest('http://localhost/api/bookmark', {
				method: 'POST',
				body: JSON.stringify(newBookmarkPayload),
				headers: { 'Content-Type': 'application/json' },
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBeDefined();
		});
	});

	// ── DELETE ───────────────────────────────────────────────────────────────

	describe('DELETE', () => {
		it('devrait supprimer un bookmark avec succès', async () => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
			// ✅ prisma.bookmark.delete (singulier)
			vi.mocked(prisma.bookmark.delete).mockResolvedValue(mockBookmarks[0] as any);

			const request = new NextRequest(
				`http://localhost/api/bookmark?id=${mockBookmarks[0].id}`,
				{ method: 'DELETE' }
			);

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			// ✅ route.ts passe { id, userId } — pas seulement { id }
			expect(prisma.bookmark.delete).toHaveBeenCalledWith({
				where: { id: mockBookmarks[0].id, userId: mockUser.id },
			});
		});

		it('devrait retourner 401 si non authentifié', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const request = new NextRequest(
				`http://localhost/api/bookmark?id=${mockBookmarks[0].id}`,
				{ method: 'DELETE' }
			);

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBeDefined();
		});

		it("devrait retourner 400 si l'id est absent", async () => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

			const request = new NextRequest(
				'http://localhost/api/bookmark', // pas de ?id=
				{ method: 'DELETE' }
			);

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBeDefined();
			expect(prisma.bookmark.delete).not.toHaveBeenCalled();
		});

		it("devrait retourner 404 si l'utilisateur est introuvable", async () => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

			const request = new NextRequest(
				`http://localhost/api/bookmark?id=${mockBookmarks[0].id}`,
				{ method: 'DELETE' }
			);

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBeDefined();
			expect(prisma.bookmark.delete).not.toHaveBeenCalled();
		});

		// ✅ Le route.ts fait prisma.bookmark.delete({ id, userId }) directement.
		//    Si le bookmark n'existe pas ou n'appartient pas à l'user, Prisma lève
		//    une PrismaClientKnownRequestError (P2025) → catch → 500.
		it("devrait retourner 500 si le bookmark est introuvable ou n'appartient pas à l'utilisateur", async () => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
			vi.mocked(prisma.bookmark.delete).mockRejectedValue(
				new Error('Record to delete does not exist.')
			);

			const request = new NextRequest(
				'http://localhost/api/bookmark?id=inexistant-id',
				{ method: 'DELETE' }
			);

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBeDefined();
		});
	});
});