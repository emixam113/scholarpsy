"use client";

import React, { useState } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation"; // Pour rediriger après succès
import { User, Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function SignupPage() {
	// --- Logique ajoutée ---
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const res = await fetch("/api/auth/register", { // Appelle ton fichier route.ts
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, email, password }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || "Une erreur est survenue");
			}

			// Redirection vers la connexion avec un message de succès
			router.push("/auth/login?success=account-created");
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};
	// ------------------------

	return (
		<div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
			{/* Logo */}
			<div className="flex items-center gap-3 mb-8">
				<div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg text-white font-bold text-xl">
					S
				</div>
				<h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
					ScholarPsy
				</h1>
			</div>

			{/* Carte du formulaire */}
			<div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 md:p-10 w-full max-w-md">
				<div className="text-center mb-8">
					<h2 className="text-3xl font-bold text-slate-900 mb-2">Créer un compte</h2>
					<p className="text-slate-500">Rejoignez la communauté des chercheurs en psychologie.</p>
				</div>

				{/* Affichage des erreurs éventuelles */}
				{error && (
					<div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl font-medium">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-5">
					{/* Nom complet */}
					<div className="space-y-2">
						<label className="text-sm font-semibold text-slate-700 ml-1">Nom complet</label>
						<div className="relative group">
							<User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
							<input
								type="text"
								required
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Jean Dupont"
								className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
							/>
						</div>
					</div>

					{/* Email */}
					<div className="space-y-2">
						<label className="text-sm font-semibold text-slate-700 ml-1">Email universitaire</label>
						<div className="relative group">
							<Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
							<input
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="jean.dupont@etu.univ-bpclermont.fr"
								className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
							/>
						</div>
					</div>

					{/* Mot de passe */}
					<div className="space-y-2">
						<label className="text-sm font-semibold text-slate-700 ml-1">Mot de passe</label>
						<div className="relative group">
							<Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
							<input
								type={showPassword ? "text" : "password"}
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••••••"
								className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
							>
								{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
							</button>
						</div>
					</div>

					{/* Bouton de validation */}
					<button
						type="submit"
						disabled={loading}
						className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
					>
						{loading ? (
							<Loader2 className="w-5 h-5 animate-spin" />
						) : (
							<>S'inscrire <ArrowRight className="w-5 h-5" /></>
						)}
					</button>
				</form>

				<div className="mt-8 pt-6 border-t border-slate-50 text-center text-slate-600">
					Déjà membre ?{" "}
					<Link href="/auth/login" className="text-blue-600 font-bold hover:underline">
						Se connecter
					</Link>
				</div>
			</div>
		</div>
	);
}