"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

// ✅ Composant séparé pour useSearchParams
function LoginForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(false);

	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		if (searchParams.get("success") === "account-created") {
			setSuccess("Compte créé avec succès ! Connectez-vous maintenant.");
		}
	}, [searchParams]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		setSuccess("");

		const result = await signIn("credentials", {
			redirect: false,
			email,
			password,
		});

		if (result?.error) {
			setError("Email ou mot de passe incorrect");
			setLoading(false);
		} else {
			router.push("/");
			router.refresh();
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
			<div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-transparent to-purple-100 opacity-40 pointer-events-none" />

			<div className="relative w-full max-w-md">
				<div className="text-center mb-8">
					<Link href="/" className="inline-flex items-center gap-3">
						<div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
							<img src="/scholarpsy.jpg" />
						</div>
						<img src="/scholarpsy.jpg" alt="scholarpsy" />
						ScholarPsy
					</Link>
				</div>

				<div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/20">
					<div className="mb-6">
						<h2 className="text-2xl font-bold text-slate-900">Bon retour !</h2>
						<p className="text-slate-500">Connectez-vous pour accéder à vos recherches.</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-5">
						{success && (
							<div className="flex items-center gap-2 p-3 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl font-medium">
								<ShieldCheck className="w-4 h-4" />
								{success}
							</div>
						)}
						{error && (
							<div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl font-medium">
								{error}
							</div>
						)}

						<div className="space-y-2">
							<label className="text-sm font-semibold text-slate-700 ml-1">Email</label>
							<div className="relative group">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full pl-11 pr-4 py-3 text-black border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
									placeholder="nom@etudiant.univ.fr"
									required
								/>
							</div>
						</div>

						<div className="space-y-2">
							<div className="flex justify-between items-center ml-1">
								<label className="text-sm font-semibold text-slate-700">Mot de passe</label>
							</div>
							<div className="relative group">
								<Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
								<input
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full pl-11 text-black pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
									placeholder="mot de passe"
									required
								/>
								<a href="#" className="text-xs text-blue-600 hover:underline">Mot de passe oublié ?</a>
							</div>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
						>
							{loading ? (
								<Loader2 className="w-5 h-5 animate-spin" />
							) : (
								<>
									Se connecter
									<ArrowRight className="w-5 h-5" />
								</>
							)}
						</button>
					</form>

					<div className="mt-8 pt-6 border-t border-slate-100 text-center">
						<p className="text-slate-600 text-sm">
							Nouveau sur ScholarPsy ?{" "}
							<Link href="/auth/signup" className="text-blue-600 font-bold hover:underline">
								Créer un compte
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

// ✅ Page principale avec Suspense obligatoire pour useSearchParams
export default function LoginPage() {
	return (
		<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
			<LoginForm />
		</Suspense>
	);
}