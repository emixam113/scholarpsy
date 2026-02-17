import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-response';


// --- GET: Récupérer l'historique de consultation ---
export async function GET() {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.email) {
			return apiError('Non authentifié', 401);
		}

		const user = await prisma.user.findUnique({
			where: { email: session.user.email },
			include: {
				history: {
					orderBy: { visitedAt: 'desc' },
					take: 100,
				},
			},
		});

		if (!user) {
			return apiError('Utilisateur non trouvé', 404);
		}

		return apiSuccess({ history: user.history });

	} catch (error) {
		console.error('Erreur GET history:', error);
		return apiError('Erreur serveur', 500);
	}
}

// --- POST: Ajouter une visite à l'historique ---
export async function POST(request: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.email) {
			return apiError('Non authentifié', 401);
		}

		const { title, link, snippet } = await request.json();

		if (!title || !link) {
			return apiError('Titre et lien requis', 400);
		}

		const user = await prisma.user.findUnique({
			where: { email: session.user.email },
		});

		if (!user) {
			return apiError('Utilisateur non trouvé', 404);
		}

		// Vérifier si l'article existe déjà dans l'historique récent (dernières 24h)
		const existingEntry = await prisma.articleHistory.findFirst({
			where: {
				userId: user.id,
				link,
				visitedAt: {
					gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernières 24h
				}
			},
		});

		if (existingEntry) {
			// Mettre à jour la date de visite
			await prisma.articleHistory.update({
				where: { id: existingEntry.id },
				data: { visitedAt: new Date() },
			});
			return apiSuccess({ historyEntry: existingEntry }, 'Visite mise à jour');
		}

		// Créer une nouvelle entrée dans l'historique
		const historyEntry = await prisma.articleHistory.create({
			data: {
				title,
				link,
				snippet: snippet || '',
				userId: user.id,
			},
		});

		return apiSuccess({ historyEntry }, 'Visite enregistrée');

	} catch (error) {
		console.error('Erreur POST history:', error);
		return apiError('Erreur serveur', 500);
	}
}

// --- DELETE: Supprimer une entrée de l'historique ---
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

		// Vérifier que l'entrée appartient à l'utilisateur
		const historyEntry = await prisma.articleHistory.findFirst({
			where: { id, userId: user.id },
		});

		if (!historyEntry) {
			return apiError('Entrée non trouvée', 404);
		}

		// Supprimer l'entrée
		await prisma.articleHistory.delete({
			where: { id },
		});

		return apiSuccess(null, 'Entrée supprimée');

	} catch (error) {
		console.error('Erreur DELETE history:', error);
		return apiError('Erreur serveur', 500);
	}
}