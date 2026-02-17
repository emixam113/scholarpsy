// src/app/api/library/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST, PATCH, DELETE } from './route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock de next-auth
vi.mock('next-auth', () => ({
	getServerSession: vi.fn(),
}));

// Mock de authOptions
vi.mock('@/lib/auth', () => ({
	authOptions: {},
}));

// Mock de prisma
vi.mock('@/lib/prisma', () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
		},
		library: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		folder: {
			findFirst: vi.fn(),
		},
	},
}));

// Mock de api-response
vi.mock('@/lib/api-response', () => ({
	apiSuccess: (data: any, message?: string) =>
		NextResponse.json({ success: true, data, message }, { status: 200 }),
	apiError: (message: string, status: number) =>
		NextResponse.json({ success: false, error: message }, { status }),
}));

import { NextResponse } from 'next/server';

// Données de test
const mockUser = {
	id: 'user-123',
	email: 'maxime@royan.fr',
	name: 'Maxime',
	emailVerified: null,
	image: null,
	password: 'hashed',
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockFolder = {
	id: 'folder-1',
	name: 'Psychologie cognitive',
	color: '#3B82F6',
	userId: 'user-123',
	createdAt: new Date(),
};

const mockArticles = [
	{
		id: 'article-1',
		title: 'Thérapies cognitives',
		link: 'https://exemple.com/article-1',
		snippet: 'Une étude sur les thérapies...',
		userId: 'user-123',
		folderId: 'folder-1',
		savedAt: new Date(),
		folder: mockFolder,
	},
	{
		id: 'article-2',
		title: 'Psychologie clinique',
		link: 'https://exemple.com/article-2',
		snippet: 'Recherche en psychologie...',
		userId: 'user-123',
		folderId: null,
		savedAt: new Date(),
		folder: null,
	},
];

describe('API /api/library', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET', () => {
		it('devrait récupérer tous les articles de la bibliothèque', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.library.findMany).mockResolvedValue(mockArticles);

			const request = new Request('http://localhost/api/library');
			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.data.articles).toHaveLength(2);
		});

		it('devrait filtrer les articles par dossier', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.library.findMany).mockResolvedValue([mockArticles[0]]);

			const request = new Request('http://localhost/api/library?folderId=folder-1');
			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.data.articles).toHaveLength(1);
			expect(prisma.library.findMany).toHaveBeenCalledWith({
				where: { userId: mockUser.id, folderId: 'folder-1' },
				include: expect.any(Object),
				orderBy: expect.any(Object),
			});
		});

		it('devrait trier les articles par titre', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.library.findMany).mockResolvedValue(mockArticles);

			const request = new Request('http://localhost/api/library?sortBy=title&order=asc');
			const response = await GET(request);

			expect(response.status).toBe(200);
			expect(prisma.library.findMany).toHaveBeenCalledWith({
				where: { userId: mockUser.id },
				include: expect.any(Object),
				orderBy: { title: 'asc' },
			});
		});

		it('devrait retourner 401 si non authentifié', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const request = new Request('http://localhost/api/library');
			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe('Non authentifié');
		});

		it('devrait retourner 404 si l\'utilisateur n\'existe pas', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

			const request = new Request('http://localhost/api/library');
			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe('Utilisateur non trouvé');
		});
	});

	describe('POST', () => {
		const newArticle = {
			title: 'Nouvel article',
			link: 'https://exemple.com/nouveau',
			snippet: 'Un article intéressant',
			folderId: 'folder-1',
		};

		it('devrait ajouter un article à la bibliothèque', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.folder.findFirst).mockResolvedValue(mockFolder);
			vi.mocked(prisma.library.findFirst).mockResolvedValue(null);
			vi.mocked(prisma.library.create).mockResolvedValue({
				id: 'article-new',
				...newArticle,
				userId: mockUser.id,
				savedAt: new Date(),
				folder: mockFolder,
			});

			const request = new Request('http://localhost/api/library', {
				method: 'POST',
				body: JSON.stringify(newArticle),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.message).toBe('Article ajouté à la bibliothèque');
			expect(prisma.library.create).toHaveBeenCalled();
		});

		it('devrait ajouter un article sans dossier', async () => {
			const articleWithoutFolder = {
				title: 'Article sans dossier',
				link: 'https://exemple.com/sans-dossier',
				snippet: 'Test',
			};

			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.library.findFirst).mockResolvedValue(null);
			vi.mocked(prisma.library.create).mockResolvedValue({
				id: 'article-new',
				...articleWithoutFolder,
				userId: mockUser.id,
				folderId: null,
				savedAt: new Date(),
				folder: null,
			});

			const request = new Request('http://localhost/api/library', {
				method: 'POST',
				body: JSON.stringify(articleWithoutFolder),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
		});

		it('devrait rejeter si l\'article existe déjà', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.library.findFirst).mockResolvedValue(mockArticles[0]);

			const request = new Request('http://localhost/api/library', {
				method: 'POST',
				body: JSON.stringify(newArticle),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(409);
			expect(data.error).toBe('Article déjà dans la bibliothèque');
			expect(prisma.library.create).not.toHaveBeenCalled();
		});

		it('devrait rejeter si le dossier n\'existe pas', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

			const request = new Request('http://localhost/api/library', {
				method: 'POST',
				body: JSON.stringify(newArticle),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe('Dossier non trouvé');
		});

		it('devrait rejeter si titre ou lien manquant', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			const invalidData = { title: 'Test' }; // lien manquant

			const request = new Request('http://localhost/api/library', {
				method: 'POST',
				body: JSON.stringify(invalidData),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('Titre et lien requis');
		});
	});

	describe('PATCH', () => {
		it('devrait déplacer un article vers un dossier', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.library.findFirst).mockResolvedValue(mockArticles[1]);
			vi.mocked(prisma.folder.findFirst).mockResolvedValue(mockFolder);
			vi.mocked(prisma.library.update).mockResolvedValue({
				...mockArticles[1],
				folderId: 'folder-1',
				folder: mockFolder,
			});

			const request = new Request('http://localhost/api/library', {
				method: 'PATCH',
				body: JSON.stringify({
					articleId: 'article-2',
					folderId: 'folder-1',
				}),
			});

			const response = await PATCH(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBe('Article déplacé');
			expect(prisma.library.update).toHaveBeenCalledWith({
				where: { id: 'article-2' },
				data: { folderId: 'folder-1' },
				include: expect.any(Object),
			});
		});

		it('devrait retirer un article d\'un dossier (folderId null)', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.library.findFirst).mockResolvedValue(mockArticles[0]);
			vi.mocked(prisma.library.update).mockResolvedValue({
				...mockArticles[0],
				folderId: null,
				folder: null,
			});

			const request = new Request('http://localhost/api/library', {
				method: 'PATCH',
				body: JSON.stringify({
					articleId: 'article-1',
					folderId: null,
				}),
			});

			const response = await PATCH(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(prisma.library.update).toHaveBeenCalledWith({
				where: { id: 'article-1' },
				data: { folderId: null },
				include: expect.any(Object),
			});
		});

		it('devrait rejeter si l\'article n\'existe pas', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.library.findFirst).mockResolvedValue(null);

			const request = new Request('http://localhost/api/library', {
				method: 'PATCH',
				body: JSON.stringify({
					articleId: 'wrong-id',
					folderId: 'folder-1',
				}),
			});

			const response = await PATCH(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe('Article non trouvé');
		});

		it('devrait rejeter si le dossier n\'existe pas', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.library.findFirst).mockResolvedValue(mockArticles[0]);
			vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

			const request = new Request('http://localhost/api/library', {
				method: 'PATCH',
				body: JSON.stringify({
					articleId: 'article-1',
					folderId: 'wrong-folder',
				}),
			});

			const response = await PATCH(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe('Dossier non trouvé');
		});
	});

	describe('DELETE', () => {
		it('devrait supprimer un article de la bibliothèque', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.library.findFirst).mockResolvedValue(mockArticles[0]);
			vi.mocked(prisma.library.delete).mockResolvedValue(mockArticles[0]);

			const request = new Request('http://localhost/api/library?id=article-1', {
				method: 'DELETE',
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBe('Article supprimé de la bibliothèque');
			expect(prisma.library.delete).toHaveBeenCalledWith({
				where: { id: 'article-1' },
			});
		});

		it('devrait rejeter si ID manquant', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			const request = new Request('http://localhost/api/library', {
				method: 'DELETE',
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('ID requis');
		});

		it('devrait rejeter si l\'article n\'existe pas', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.library.findFirst).mockResolvedValue(null);

			const request = new Request('http://localhost/api/library?id=wrong-id', {
				method: 'DELETE',
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe('Article non trouvé');
		});
	});
});