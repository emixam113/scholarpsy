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
				if (!credentials?.email || !credentials?.password) {
					throw new Error("Email et mot de passe requis");
				}

				//Chercher l'utilisateur dans PostgreSQL
				const user = await prisma.user.findUnique({
					where: { email: credentials.email }
				});

				if (!user || !user.password) {
					throw new Error("Aucun utilisateur trouvé avec cet email");
				}

				// Vérifier le mot de passe avec Argon2
				const isPasswordCorrect = await argon2.verify(user.password, credentials.password);

				if (!isPasswordCorrect) {
					throw new Error("Mot de passe incorrect");
				}

				// Retourner l'utilisateur (sera stocké dans le JWT)
				return {
					id: user.id,
					email: user.email,
					name: user.name,
				};
			}
		})
	],
	session: {
		strategy: "jwt", // Utilisation des tokens JWT
	},
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
			}
			return token;
		},
		async session({ session, token }) {
			if (session.user) {
				(session.user as any).id = token.id;
			}
			return session;
		},
	},
	secret: process.env.NEXTAUTH_SECRET,
	pages: {
		signIn: "/login",
	},
});

export { handler as GET, handler as POST };