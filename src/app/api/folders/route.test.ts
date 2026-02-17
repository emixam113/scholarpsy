// src/app/api/folders/route.test.ts
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
		folder: {
			findMany: vi.fn(),
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
	password: 'hashed',
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockFolders = [
	{
		id: 'folder-1',
		name: 'Psychologie cognitive',
		color: '#3B82F6',
		userId: 'user-123',
		createdAt: new Date(),
		_count: { articles: 5 },
	},
	{
		id: 'folder-2',
		name: 'Neuropsychologie',
		color: '#10B981',
		userId: 'user-123',
		createdAt: new Date(),
		_count: { articles: 3 },
	},
];

describe('API /api/folders', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET', () => {
		it('devrait récupérer tous les dossiers de l\'utilisateur', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.folder.findMany).mockResolvedValue(mockFolders);

			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.data.folders).toHaveLength(2);
			expect(data.data.folders[0]._count.articles).toBe(5);

			expect(prisma.folder.findMany).toHaveBeenCalledWith({
				where: { userId: mockUser.id },
				include: {
					_count: {
						select: { articles: true },
					},
				},
				orderBy: { createdAt: 'asc' },
			});
		});

		it('devrait retourner une liste vide si aucun dossier', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.folder.findMany).mockResolvedValue([]);

			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.data.folders).toEqual([]);
		});

		it('devrait retourner 401 si non authentifié', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const response = await GET();
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

			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe('Utilisateur non trouvé');
		});
	});

	describe('POST', () => {
		const newFolder = {
			name: 'Thérapie comportementale',
			color: '#F59E0B',
		};

		it('devrait créer un nouveau dossier', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);
			vi.mocked(prisma.folder.create).mockResolvedValue({
				id: 'folder-new',
				...newFolder,
				userId: mockUser.id,
				createdAt: new Date(),
				_count: { articles: 0 },
			});

			const request = new Request('http://localhost/api/folders', {
				method: 'POST',
				body: JSON.stringify(newFolder),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.message).toBe('Dossier créé');
			expect(prisma.folder.create).toHaveBeenCalledWith({
				data: {
					name: newFolder.name,
					color: newFolder.color,
					userId: mockUser.id,
				},
				include: {
					_count: {
						select: { articles: true },
					},
				},
			});
		});

		it('devrait créer un dossier sans couleur', async () => {
			const folderWithoutColor = {
				name: 'Mon dossier',
			};

			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);
			vi.mocked(prisma.folder.create).mockResolvedValue({
				id: 'folder-new',
				name: folderWithoutColor.name,
				color: null,
				userId: mockUser.id,
				createdAt: new Date(),
				_count: { articles: 0 },
			});

			const request = new Request('http://localhost/api/folders', {
				method: 'POST',
				body: JSON.stringify(folderWithoutColor),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
		});

		it('devrait trim le nom du dossier', async () => {
			const folderWithSpaces = {
				name: '  Mon dossier  ',
			};

			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);
			vi.mocked(prisma.folder.create).mockResolvedValue({
				id: 'folder-new',
				name: 'Mon dossier',
				color: null,
				userId: mockUser.id,
				createdAt: new Date(),
				_count: { articles: 0 },
			});

			const request = new Request('http://localhost/api/folders', {
				method: 'POST',
				body: JSON.stringify(folderWithSpaces),
			});

			await POST(request);

			expect(prisma.folder.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					name: 'Mon dossier', // trimmed
				}),
				include: expect.any(Object),
			});
		});

		it('devrait rejeter si le nom est manquant', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			const request = new Request('http://localhost/api/folders', {
				method: 'POST',
				body: JSON.stringify({}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('Nom du dossier requis');
		});

		it('devrait rejeter si le nom est vide', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			const request = new Request('http://localhost/api/folders', {
				method: 'POST',
				body: JSON.stringify({ name: '   ' }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('Nom du dossier requis');
		});

		it('devrait rejeter si un dossier avec ce nom existe déjà', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.folder.findFirst).mockResolvedValue(mockFolders[0]);

			const request = new Request('http://localhost/api/folders', {
				method: 'POST',
				body: JSON.stringify({ name: 'Psychologie cognitive' }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(409);
			expect(data.error).toBe('Un dossier avec ce nom existe déjà');
			expect(prisma.folder.create).not.toHaveBeenCalled();
		});
	});

	describe('PATCH', () => {
		it('devrait renommer un dossier', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.folder.findFirst)
				.mockResolvedValueOnce(mockFolders[0]) // Premier appel : vérifier que le dossier existe
				.mockResolvedValueOnce(null); // Deuxième appel : vérifier qu'aucun autre dossier n'a ce nom

			vi.mocked(prisma.folder.update).mockResolvedValue({
				...mockFolders[0],
				name: 'Nouveau nom',
			});

			const request = new Request('http://localhost/api/folders', {
				method: 'PATCH',
				body: JSON.stringify({
					folderId: 'folder-1',
					name: 'Nouveau nom',
				}),
			});

			const response = await PATCH(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBe('Dossier mis à jour');
			expect(prisma.folder.update).toHaveBeenCalledWith({
				where: { id: 'folder-1' },
				data: { name: 'Nouveau nom' },
				include: expect.any(Object),
			});
		});

		it('devrait changer la couleur d\'un dossier', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.folder.findFirst).mockResolvedValue(mockFolders[0]);
			vi.mocked(prisma.folder.update).mockResolvedValue({
				...mockFolders[0],
				color: '#EF4444',
			});

			const request = new Request('http://localhost/api/folders', {
				method: 'PATCH',
				body: JSON.stringify({
					folderId: 'folder-1',
					color: '#EF4444',
				}),
			});

			const response = await PATCH(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(prisma.folder.update).toHaveBeenCalledWith({
				where: { id: 'folder-1' },
				data: { color: '#EF4444' },
				include: expect.any(Object),
			});
		});

		it('devrait renommer et changer la couleur en même temps', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.folder.findFirst)
				.mockResolvedValueOnce(mockFolders[0])
				.mockResolvedValueOnce(null);

			vi.mocked(prisma.folder.update).mockResolvedValue({
				...mockFolders[0],
				name: 'Nouveau nom',
				color: '#EF4444',
			});

			const request = new Request('http://localhost/api/folders', {
				method: 'PATCH',
				body: JSON.stringify({
					folderId: 'folder-1',
					name: 'Nouveau nom',
					color: '#EF4444',
				}),
			});

			const response = await PATCH(request);

			expect(response.status).toBe(200);
			expect(prisma.folder.update).toHaveBeenCalledWith({
				where: { id: 'folder-1' },
				data: { name: 'Nouveau nom', color: '#EF4444' },
				include: expect.any(Object),
			});
		});

		it('devrait rejeter si folderId manquant', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			const request = new Request('http://localhost/api/folders', {
				method: 'PATCH',
				body: JSON.stringify({ name: 'Nouveau nom' }),
			});

			const response = await PATCH(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('ID du dossier requis');
		});

		it('devrait rejeter si ni nom ni couleur fournis', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			const request = new Request('http://localhost/api/folders', {
				method: 'PATCH',
				body: JSON.stringify({ folderId: 'folder-1' }),
			});

			const response = await PATCH(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('Nom ou couleur requis');
		});

		it('devrait rejeter si le dossier n\'existe pas', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

			const request = new Request('http://localhost/api/folders', {
				method: 'PATCH',
				body: JSON.stringify({
					folderId: 'wrong-id',
					name: 'Nouveau nom',
				}),
			});

			const response = await PATCH(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe('Dossier non trouvé');
		});

		it('devrait rejeter si le nouveau nom existe déjà', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.folder.findFirst)
				.mockResolvedValueOnce(mockFolders[0]) // Le dossier existe
				.mockResolvedValueOnce(mockFolders[1]); // Un autre dossier a déjà ce nom

			const request = new Request('http://localhost/api/folders', {
				method: 'PATCH',
				body: JSON.stringify({
					folderId: 'folder-1',
					name: 'Neuropsychologie', // Nom déjà utilisé par folder-2
				}),
			});

			const response = await PATCH(request);
			const data = await response.json();

			expect(response.status).toBe(409);
			expect(data.error).toBe('Un dossier avec ce nom existe déjà');
		});
	});

	describe('DELETE', () => {
		it('devrait supprimer un dossier', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.folder.findFirst).mockResolvedValue(mockFolders[0]);
			vi.mocked(prisma.folder.delete).mockResolvedValue(mockFolders[0]);

			const request = new Request('http://localhost/api/folders?id=folder-1', {
				method: 'DELETE',
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBe('Dossier supprimé');
			expect(prisma.folder.delete).toHaveBeenCalledWith({
				where: { id: 'folder-1' },
			});
		});

		it('devrait rejeter si ID manquant', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			const request = new Request('http://localhost/api/folders', {
				method: 'DELETE',
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('ID requis');
		});

		it('devrait rejeter si le dossier n\'existe pas', async () => {
			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: mockUser.email },
				expires: '',
			});

			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
			vi.mocked(prisma.folder.findFirst).mockResolvedValue(null);

			const request = new Request('http://localhost/api/folders?id=wrong-id', {
				method: 'DELETE',
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe('Dossier non trouvé');
		});
	});
});