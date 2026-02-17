import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {authOptions} from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Récupérer les informations utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        bookmarks: {
          orderBy: { createdAt: 'desc' },
          take: 5, // On prend les 5 derniers pour l'aperçu du profil
        },
        _count: {
          select: {
            bookmarks: true, // Assure-toi que le nom de la relation dans ton schema.prisma est bien "bookmarks"
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Le succès doit être retourné ICI, dans le bloc try
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        bookmarksCount: user._count.bookmarks,
      },
      recentBookmarks: user.bookmarks,
    });

  } catch (error) {
    console.error('Erreur récupération de profil:', error);
    return NextResponse.json(
      { error: "Erreur Serveur" },
      { status: 500 }
    );
  }
}