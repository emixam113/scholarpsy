// src/app/api/auth/register/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './route';
import { prisma } from '@/lib/prisma';
import argon2 from 'argon2';

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
			create: vi.fn(),
		},
	},
}));

// Mock d'argon2
vi.mock('argon2', () => ({
	default: {
		hash: vi.fn(),
	},
}));

describe('API /api/auth/register', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('POST - Inscription', () => {
		const validUserData = {
			name: 'Maxime Royan',
			email: 'maxime@royan.fr',
			password: 'MotDePasse123!',
		};

		it('devrait créer un nouvel utilisateur avec succès', async () => {
			// Mock: l'email n'existe pas encore
			vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

			// Mock: le hachage du mot de passe
			const hashedPassword = '$argon2id$v=19$m=65536,t=3,p=4$hashedpassword';
			vi.mocked(argon2.hash).mockResolvedValue(hashedPassword);

			// Mock: création réussie
			vi.mocked(prisma.user.create).mockResolvedValue({
				id: 'user-123',
				...validUserData,
				password: hashedPassword,
				emailVerified: null,
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const request = new Request('http://localhost/api/auth/register', {
				method: 'POST',
				body: JSON.stringify(validUserData),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(201);
			expect(data.message).toBe('Succès');

			// Vérifications des appels
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { email: validUserData.email },
			});
			expect(argon2.hash).toHaveBeenCalledWith(validUserData.password);
			expect(prisma.user.create).toHaveBeenCalledWith({
				data: {
					name: validUserData.name,
					email: validUserData.email,
					password: hashedPassword,
				},
			});
		});

		it('devrait rejeter si l\'email existe déjà', async () => {
			// Mock: l'email existe déjà
			vi.mocked(prisma.user.findUnique).mockResolvedValue({
				id: 'existing-user',
				...validUserData,
				password: 'hashed',
				emailVerified: null,
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const request = new Request('http://localhost/api/auth/register', {
				method: 'POST',
				body: JSON.stringify(validUserData),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('Cet email est déjà pris');

			// Ne devrait PAS créer l'utilisateur
			expect(prisma.user.create).not.toHaveBeenCalled();
			expect(argon2.hash).not.toHaveBeenCalled();
		});

		it('devrait rejeter si le nom est manquant', async () => {
			const invalidData = {
				email: 'maxime@royan.fr',
				password: 'MotDePasse123!',
				// name manquant
			};

			const request = new Request('http://localhost/api/auth/register', {
				method: 'POST',
				body: JSON.stringify(invalidData),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('Données manquantes');
			expect(prisma.user.findUnique).not.toHaveBeenCalled();
		});

		it('devrait rejeter si l\'email est manquant', async () => {
			const invalidData = {
				name: 'Maxime',
				password: 'MotDePasse123!',
				// email manquant
			};

			const request = new Request('http://localhost/api/auth/register', {
				method: 'POST',
				body: JSON.stringify(invalidData),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('Données manquantes');
		});

		it('devrait rejeter si le mot de passe est manquant', async () => {
			const invalidData = {
				name: 'Maxime',
				email: 'maxime@royan.fr',
				// password manquant
			};

			const request = new Request('http://localhost/api/auth/register', {
				method: 'POST',
				body: JSON.stringify(invalidData),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('Données manquantes');
		});

		it('devrait gérer les erreurs de base de données', async () => {
			vi.mocked(prisma.user.findUnique).mockRejectedValue(
				new Error('Database connection failed')
			);

			const request = new Request('http://localhost/api/auth/register', {
				method: 'POST',
				body: JSON.stringify(validUserData),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe('Erreur serveur');
			expect(data.details).toBe('Database connection failed');
		});

		it('devrait gérer les erreurs de hachage', async () => {
			vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
			vi.mocked(argon2.hash).mockRejectedValue(
				new Error('Hashing failed')
			);

			const request = new Request('http://localhost/api/auth/register', {
				method: 'POST',
				body: JSON.stringify(validUserData),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe('Erreur serveur');
			expect(prisma.user.create).not.toHaveBeenCalled();
		});

		it('devrait hacher le mot de passe avec Argon2', async () => {
			vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

			const hashedPassword = '$argon2id$v=19$m=65536,t=3,p=4$hashedpassword';
			vi.mocked(argon2.hash).mockResolvedValue(hashedPassword);

			vi.mocked(prisma.user.create).mockResolvedValue({
				id: 'user-123',
				...validUserData,
				password: hashedPassword,
				emailVerified: null,
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const request = new Request('http://localhost/api/auth/register', {
				method: 'POST',
				body: JSON.stringify(validUserData),
			});

			await POST(request);

			// Vérifie que le mot de passe est bien haché
			expect(argon2.hash).toHaveBeenCalledWith(validUserData.password);

			// Vérifie que le mot de passe haché est stocké, pas le mot de passe en clair
			expect(prisma.user.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					password: hashedPassword,
				}),
			});

			// Vérifie que le mot de passe en clair n'est PAS stocké
			expect(prisma.user.create).not.toHaveBeenCalledWith({
				data: expect.objectContaining({
					password: validUserData.password,
				}),
			});
		});
	});
});