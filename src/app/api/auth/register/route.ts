import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import argon2 from "argon2";

export async function POST(req: Request) {
	try {
		// Vérifier si le corps de la requête est présent
		const body = await req.json();
		const { name, email, password } = body;

		console.log("📩 Requête reçue pour:", email);

		if (!email || !password || !name) {
			return NextResponse.json(
				{ error: "Données manquantes" },
				{ status: 400 }
			);
		}

		// Vérifier l'existence
		const userExists = await prisma.user.findUnique({ where: { email } });
		if (userExists) {
			return NextResponse.json(
				{ error: "Cet email est déjà pris" },
				{ status: 400 }
			);
		}

		// Hachage
		const hashedPassword = await argon2.hash(password);

		// Création
		await prisma.user.create({
			data: { name, email, password: hashedPassword },
		});

		return NextResponse.json({ message: "Succès" }, { status: 201 });
	} catch (error: any) {
		console.error("❌ Erreur API:", error);
		return NextResponse.json(
			{ error: "Erreur serveur", details: error.message },
			{ status: 500 }
		);
	}
}