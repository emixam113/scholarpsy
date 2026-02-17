import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-response';

// --- GET: Récupérer tous les dossiers de l'utilisateur ---
export async function GET() {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.email) {
			return apiError('Non authentifié', 401);
		}

		const user = await prisma.user.findUnique({
			where: { email: session.user.email },
		});

		if (!user) {
			return apiError('Utilisateur non trouvé', 404);
		}

		const folders = await prisma.folder.findMany({
			where: { userId: user.id },
			include: {
				_count: {
					select: { articles: true },
				},
			},
			orderBy: { createdAt: 'asc' },
		});

		return apiSuccess({ folders });

	} catch (error) {
		console.error('Erreur GET folders:', error);
		return apiError('Erreur serveur', 500);
	}
}

// --- POST: Créer un nouveau dossier ---
export async function POST(request: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.email) {
			return apiError('Non authentifié', 401);
		}

		const { name, color } = await request.json();

		if (!name || name.trim() === '') {
			return apiError('Nom du dossier requis', 400);
		}

		const user = await prisma.user.findUnique({
			where: { email: session.user.email },
		});

		if (!user) {
			return apiError('Utilisateur non trouvé', 404);
		}

		// Vérifier si un dossier avec ce nom existe déjà
		const existingFolder = await prisma.folder.findFirst({
			where: {
				userId: user.id,
				name: name.trim(),
			},
		});

		if (existingFolder) {
			return apiError('Un dossier avec ce nom existe déjà', 409);
		}

		// Créer le dossier
		const folder = await prisma.folder.create({
			data: {
				name: name.trim(),
				color: color || null,
				userId: user.id,
			},
			include: {
				_count: {
					select: { articles: true },
				},
			},
		});

		return apiSuccess({ folder }, 'Dossier créé');

	} catch (error) {
		console.error('Erreur POST folders:', error);
		return apiError('Erreur serveur', 500);
	}
}

// --- PATCH: Renommer ou changer la couleur d'un dossier ---
export async function PATCH(request: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.email) {
			return apiError('Non authentifié', 401);
		}

		const { folderId, name, color } = await request.json();

		if (!folderId) {
			return apiError('ID du dossier requis', 400);
		}

		if (!name && !color) {
			return apiError('Nom ou couleur requis', 400);
		}

		const user = await prisma.user.findUnique({
			where: { email: session.user.email },
		});

		if (!user) {
			return apiError('Utilisateur non trouvé', 404);
		}

		// Vérifier que le dossier appartient à l'utilisateur
		const folder = await prisma.folder.findFirst({
			where: { id: folderId, userId: user.id },
		});

		if (!folder) {
			return apiError('Dossier non trouvé', 404);
		}

		// Vérifier qu'un autre dossier n'a pas déjà ce nom
		if (name && name.trim() !== folder.name) {
			const existingFolder = await prisma.folder.findFirst({
				where: {
					userId: user.id,
					name: name.trim(),
					id: { not: folderId },
				},
			});

			if (existingFolder) {
				return apiError('Un dossier avec ce nom existe déjà', 409);
			}
		}

		// Préparer les données à mettre à jour
		const updateData: any = {};
		if (name) updateData.name = name.trim();
		if (color !== undefined) updateData.color = color;

		// Mettre à jour le dossier
		const updatedFolder = await prisma.folder.update({
			where: { id: folderId },
			data: updateData,
			include: {
				_count: {
					select: { articles: true },
				},
			},
		});

		return apiSuccess({ folder: updatedFolder }, 'Dossier mis à jour');

	} catch (error) {
		console.error('Erreur PATCH folders:', error);
		return apiError('Erreur serveur', 500);
	}
}

// --- DELETE: Supprimer un dossier ---
export async function DELETE(request: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.email) {
			return apiError('Non authentifié', 401);
		}

		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');

		if (!id) {
			return apiError('ID requis', 400);
		}

		const user = await prisma.user.findUnique({
			where: { email: session.user.email },
		});

		if (!user) {
			return apiError('Utilisateur non trouvé', 404);
		}

		// Vérifier que le dossier appartient à l'utilisateur
		const folder = await prisma.folder.findFirst({
			where: { id, userId: user.id },
		});

		if (!folder) {
			return apiError('Dossier non trouvé', 404);
		}

		// Supprimer le dossier (les articles seront mis à folderId: null grâce à onDelete: SetNull)
		await prisma.folder.delete({
			where: { id },
		});

		return apiSuccess(null, 'Dossier supprimé');

	} catch (error) {
		console.error('Erreur DELETE folders:', error);
		return apiError('Erreur serveur', 500);
	}
}