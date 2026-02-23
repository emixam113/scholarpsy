import {NextRequest, NextResponse} from 'next/server';
import {prisma} from "@/lib/prisma";
import {sendResetPasswordEmail} from "@/lib/mailer";
import crypto from 'crypto';

export async function POST(request: NextRequest){
	try {
		const {email} = await request.json();

		if(!email){
			return NextResponse.json({error: 'Email required'}, {status: 400});
		}

		//Utilisateur
		const user = await prisma.user.findUnique({where: {email}});

		//répondre avec succès pour ne pas révéler que l'adresse existe
		if(!user){
			return NextResponse.json({success: true, message: 'Si cet email existe, un lien a été envoyer'});
		}

		//supprimer les anciens tokens
		await prisma.passwordResetToken.deleteMany({where:
				{email}
		});

		//générer un token:
		const token = crypto.randomBytes(32).toString('hex');
		const expires = new Date(Date.now() + 1000 * 60 * 60) // 1heure;

		//sauvegarder le token
		await prisma.passwordResetToken.create({
			data: {token, email, expires},
		});

		//envoyer l'email:
		await sendResetPasswordEmail(email,  token);

		return NextResponse.json({success: true, message: 'Si cet email existe, un lien'})
	} catch(error){
		console.log(error);
		return NextResponse.json({error: 'Erreur serveur'}, {status: 500});
	}
}