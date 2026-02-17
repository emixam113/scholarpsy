// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import * as argon2 from "argon2";

const handler = NextAuth({
	providers: [
		CredentialsProvider({
			name: "Credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Mot de passe", type: "password" }
			},
			async authorize(credentials) {
				console.log("--- Tentative de connexion ---");

				if (!credentials?.email || !credentials?.password) {
					console.error("Erreur : Email ou mot de passe manquant dans la requête");
					return null;
				}

				try {
					// 1. Chercher l'utilisateur dans PostgreSQL
					const user = await prisma.user.findUnique({
						where: { email: credentials.email }
					});

					if (!user) {
						console.warn(`Échec : Aucun utilisateur trouvé pour l'email ${credentials.email}`);
						return null; // Retourne null pour déclencher la 401 proprement
					}

					if (!user.password) {
						console.warn("Échec : L'utilisateur n'a pas de mot de passe défini (compte via social login ?)");
						return null;
					}

					// 2. Vérifier le mot de passe avec Argon2
					console.log("Vérification du mot de passe avec Argon2...");
					const isPasswordCorrect = await argon2.verify(user.password, credentials.password);

					if (!isPasswordCorrect) {
						console.warn("Échec : Mot de passe incorrect");
						return null;
					}

					// 3. Succès
					console.log("Connexion réussie pour :", user.email);
					return {
						id: user.id,
						email: user.email,
						name: user.name,
					};

				} catch (error) {
					console.error("Erreur critique lors de l'autorisation :", error);
					return null;
				}
			}
		})
	],
	session: {
		strategy: "jwt",
	},
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
			}
			return token;
		},
		async session({ session, token }) {
			if (session && session.user) {
				(session.user as any).id = token.id;
			}
			return session;
		},
	},
	secret: process.env.NEXTAUTH_SECRET,
	pages: {
		signIn: "/login",
	},
	// Active les logs de debug de NextAuth lui-même
	debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };