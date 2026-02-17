import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-response';

// GET - Récupérer les favoris
export async function GET() {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.email) return apiError('Non authentifié', 401);

		const user = await prisma.user.findUnique({
			where: { email: session.user.email },
			include: { bookmarks: { orderBy: { createdAt: 'desc' } } },
		});

		return apiSuccess({ bookmarks: user?.bookmarks || [] });
	} catch (error) {
		return apiError('Erreur serveur', 500);
	}
}

// POST - Ajouter un favori (Nouveau)
export async function POST(request: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.email) return apiError('Non authentifié', 401);

		const { title, link, snippet } = await request.json();

		const user = await prisma.user.findUnique({
			where: { email: session.user.email }
		});

		if (!user) return apiError('Utilisateur non trouvé', 404);

		// Création du favori
		const bookmark = await prisma.bookmark.create({
			data: {
				title,
				link,
				snippet,
				userId: user.id
			}
		});

		return apiSuccess({ bookmark }, 'Article sauvegardé');
	} catch (error) {
		console.error('Erreur POST Bookmark:', error);
		return apiError('Erreur lors de la sauvegarde', 500);
	}
}

// DELETE - Supprimer un favori
export async function DELETE(request: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');

		if (!session?.user?.email) return apiError('Non authentifié', 401);
		if (!id) return apiError('ID requis', 400);

		const user = await prisma.user.findUnique({
			where: { email: session.user.email }
		});

		if (!user) return apiError('Utilisateur non trouvé', 404);

		await prisma.bookmark.delete({
			where: { id: id, userId: user.id },
		});

		return apiSuccess(null, 'Article supprimé');
	} catch (error) {
		return apiError('Erreur lors de la suppression', 500);
	}
}