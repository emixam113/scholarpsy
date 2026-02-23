// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendResetPasswordEmail } from '@/lib/mailer';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email requis' }, { status: 400 });
        }

        // Vérifier si l'utilisateur existe
        const user = await prisma.user.findUnique({ where: { email } });

        // On répond toujours avec succès pour ne pas révéler si l'email existe
        if (!user) {
            return NextResponse.json({ success: true, message: 'Si cet email existe, un lien a été envoyé.' });
        }

        // Supprimer les anciens tokens pour cet email
        await prisma.passwordResetToken.deleteMany({ where: { email } });

        // Générer un token sécurisé
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 heure

        // Sauvegarder le token
        await prisma.passwordResetToken.create({
            data: { token, email, expires },
        });

        // Envoyer l'email
        await sendResetPasswordEmail(email, token);

        return NextResponse.json({ success: true, message: 'Si cet email existe, un lien a été envoyé.' });

    } catch (error) {
        console.error('Erreur forgot-password:', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}