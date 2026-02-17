import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-response';

// --- GET: Récupérer les articles de la bibliothèque ---
export async function GET(request: Request) {
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

		// Récupérer les paramètres de requête pour le filtrage
		const { searchParams } = new URL(request.url);
		const folderId = searchParams.get('folderId');
		const sortBy = searchParams.get('sortBy') || 'savedAt'; // savedAt, title
		const order = searchParams.get('order') || 'desc'; // asc, desc

		// Construire la requête avec filtres
		const whereClause: any = { userId: user.id };

		if (folderId) {
			whereClause.folderId = folderId;
		}

		// Définir l'ordre de tri
		const orderByClause: any = {};
		if (sortBy === 'title') {
			orderByClause.title = order;
		} else {
			orderByClause.savedAt = order;
		}

		const articles = await prisma.library.findMany({
			where: whereClause,
			include: {
				folder: {
					select: {
						id: true,
						name: true,
						color: true,
					},
				},
			},
			orderBy: orderByClause,
		});

		return apiSuccess({ articles });

	} catch (error) {
		console.error('Erreur GET library:', error);
		return apiError('Erreur serveur', 500);
	}
}

// --- POST: Ajouter un article à la bibliothèque ---
export async function POST(request: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.email) {
			return apiError('Non authentifié', 401);
		}

		const { title, link, snippet, folderId } = await request.json();

		if (!title || !link) {
			return apiError('Titre et lien requis', 400);
		}

		const user = await prisma.user.findUnique({
			where: { email: session.user.email },
		});

		if (!user) {
			return apiError('Utilisateur non trouvé', 404);
		}

		// Vérifier si le dossier existe (si fourni)
		if (folderId) {
			const folder = await prisma.folder.findFirst({
				where: { id: folderId, userId: user.id },
			});

			if (!folder) {
				return apiError('Dossier non trouvé', 404);
			}
		}

		// Vérifier si l'article existe déjà dans la bibliothèque
		const existingArticle = await prisma.library.findFirst({
			where: {
				userId: user.id,
				link,
			},
		});

		if (existingArticle) {
			return apiError('Article déjà dans la bibliothèque', 409);
		}

		// Créer l'article dans la bibliothèque
		const article = await prisma.library.create({
			data: {
				title,
				link,
				snippet: snippet || '',
				userId: user.id,
				folderId: folderId || null,
			},
			include: {
				folder: {
					select: {
						id: true,
						name: true,
						color: true,
					},
				},
			},
		});

		return apiSuccess({ article }, 'Article ajouté à la bibliothèque');

	} catch (error) {
		console.error('Erreur POST library:', error);
		return apiError('Erreur serveur', 500);
	}
}

// --- PATCH: Déplacer un article vers un dossier ---
export async function PATCH(request: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.email) {
			return apiError('Non authentifié', 401);
		}

		const { articleId, folderId } = await request.json();

		if (!articleId) {
			return apiError('ID de l\'article requis', 400);
		}

		const user = await prisma.user.findUnique({
			where: { email: session.user.email },
		});

		if (!user) {
			return apiError('Utilisateur non trouvé', 404);
		}

		// Vérifier que l'article appartient à l'utilisateur
		const article = await prisma.library.findFirst({
			where: { id: articleId, userId: user.id },
		});

		if (!article) {
			return apiError('Article non trouvé', 404);
		}

		// Vérifier que le dossier existe (si fourni)
		if (folderId) {
			const folder = await prisma.folder.findFirst({
				where: { id: folderId, userId: user.id },
			});

			if (!folder) {
				return apiError('Dossier non trouvé', 404);
			}
		}

		// Mettre à jour l'article
		const updatedArticle = await prisma.library.update({
			where: { id: articleId },
			data: { folderId: folderId || null },
			include: {
				folder: {
					select: {
						id: true,
						name: true,
						color: true,
					},
				},
			},
		});

		return apiSuccess({ article: updatedArticle }, 'Article déplacé');

	} catch (error) {
		console.error('Erreur PATCH library:', error);
		return apiError('Erreur serveur', 500);
	}
}

// --- DELETE: Supprimer un article de la bibliothèque ---
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

		// Vérifier que l'article appartient à l'utilisateur
		const article = await prisma.library.findFirst({
			where: { id, userId: user.id },
		});

		if (!article) {
			return apiError('Article non trouvé', 404);
		}

		// Supprimer l'article
		await prisma.library.delete({
			where: { id },
		});

		return apiSuccess(null, 'Article supprimé de la bibliothèque');

	} catch (error) {
		console.error('Erreur DELETE library:', error);
		return apiError('Erreur serveur', 500);
	}
}