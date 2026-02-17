// src/app/api/history/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST, DELETE } from './route';
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
		articleHistory: {
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
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
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockHistory = [
	{
		id: 'history-1',
		title: 'Thérapies cognitives',
		link: 'https://exemple.com/article-1',
		snippet: 'Une étude sur les thérapies...',
		userId: 'user-123',
		visitedAt: new Date(),
	},
	{
		id: 'history-2',
		title: 'Psychologie clinique',
		link: 'https://exemple.com/article-2',
		snippet: 'Recherche en psychologie...',
		userId: 'user-123',
		visitedAt: new Date(),
	},
];

describe('API /api/history', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET', () => {
		it('devrait retourner l\'historique si l\'utilisateur est authentifié', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue({
				...mockUser,
				history: mockHistory,
			});

			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.data.history).toHaveLength(2);
			expect(data.data.history[0]).toMatchObject({
				id: 'history-1',
				title: 'Thérapies cognitives',
				link: 'https://exemple.com/article-1',
				snippet: 'Une étude sur les thérapies...',
				userId: 'user-123',
			});
			// Vérifie que visitedAt est bien sérialisé en string
			expect(typeof data.data.history[0].visitedAt).toBe('string');

			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { email: mockUser.email },
				include: {
					history: {
						orderBy: { visitedAt: 'desc' },
						take: 100,
					},
				},
			});
		});

		it('devrait retourner 401 si non authentifié', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.success).toBe(false);
			expect(data.error).toBe('Non authentifié');
		});

		it('devrait retourner 404 si l\'utilisateur n\'existe pas', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.success).toBe(false);
			expect(data.error).toBe('Utilisateur non trouvé');
		});

		it('devrait gérer les erreurs serveur', async () => {
			vi.mocked(getServerSession).mockRejectedValue(new Error('DB Error'));

			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.success).toBe(false);
		});
	});

	describe('POST', () => {
		const mockRequestBody = {
			title: 'Nouveau article',
			link: 'https://exemple.com/nouveau',
			snippet: 'Un nouvel article intéressant',
		};

		it('devrait créer une nouvelle entrée dans l\'historique', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.articleHistory.findFirst).mockResolvedValue(null);
			vi.mocked(prisma.articleHistory.create).mockResolvedValue({
				id: 'new-history',
				...mockRequestBody,
				userId: mockUser.id,
				visitedAt: new Date(),
			});

			const request = new Request('http://localhost/api/history', {
				method: 'POST',
				body: JSON.stringify(mockRequestBody),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.message).toBe('Visite enregistrée');
			expect(prisma.articleHistory.create).toHaveBeenCalledWith({
				data: {
					title: mockRequestBody.title,
					link: mockRequestBody.link,
					snippet: mockRequestBody.snippet,
					userId: mockUser.id,
				},
			});
		});

		it('devrait mettre à jour une entrée existante (< 24h)', async () => {
			const existingEntry = {
				id: 'existing-id',
				...mockRequestBody,
				userId: mockUser.id,
				visitedAt: new Date(Date.now() - 1000 * 60 * 60), // 1h ago
			};

			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.articleHistory.findFirst).mockResolvedValue(existingEntry);
			vi.mocked(prisma.articleHistory.update).mockResolvedValue({
				...existingEntry,
				visitedAt: new Date(),
			});

			const request = new Request('http://localhost/api/history', {
				method: 'POST',
				body: JSON.stringify(mockRequestBody),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBe('Visite mise à jour');
			expect(prisma.articleHistory.update).toHaveBeenCalledWith({
				where: { id: existingEntry.id },
				data: { visitedAt: expect.any(Date) },
			});
			expect(prisma.articleHistory.create).not.toHaveBeenCalled();
		});

		it('devrait retourner 400 si titre ou lien manquant', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			const request = new Request('http://localhost/api/history', {
				method: 'POST',
				body: JSON.stringify({ title: 'Test' }), // manque link
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('Titre et lien requis');
		});

		it('devrait retourner 401 si non authentifié', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const request = new Request('http://localhost/api/history', {
				method: 'POST',
				body: JSON.stringify(mockRequestBody),
			});

			const response = await POST(request);
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

			const request = new Request('http://localhost/api/history', {
				method: 'POST',
				body: JSON.stringify(mockRequestBody),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe('Utilisateur non trouvé');
		});
	});

	describe('DELETE', () => {
		it('devrait supprimer une entrée de l\'historique', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.articleHistory.findFirst).mockResolvedValue(mockHistory[0]);
			vi.mocked(prisma.articleHistory.delete).mockResolvedValue(mockHistory[0]);

			const request = new Request('http://localhost/api/history?id=history-1', {
				method: 'DELETE',
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.message).toBe('Entrée supprimée');
			expect(prisma.articleHistory.delete).toHaveBeenCalledWith({
				where: { id: 'history-1' },
			});
		});

		it('devrait retourner 400 si ID manquant', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			const request = new Request('http://localhost/api/history', {
				method: 'DELETE',
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('ID requis');
		});

		it('devrait retourner 404 si l\'entrée n\'existe pas', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.articleHistory.findFirst).mockResolvedValue(null);

			const request = new Request('http://localhost/api/history?id=wrong-id', {
				method: 'DELETE',
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe('Entrée non trouvée');
		});

		it('devrait retourner 401 si non authentifié', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const request = new Request('http://localhost/api/history?id=history-1', {
				method: 'DELETE',
			});

			const response = await DELETE(request);
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

			const request = new Request('http://localhost/api/history?id=history-1', {
				method: 'DELETE',
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe('Utilisateur non trouvé');
		});
	});
});