"use client";

import React, { useState } from 'react';
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
	Search, BookOpen, Sparkles, ArrowRight,
	Users, LogOut, User, GraduationCap
} from 'lucide-react';

export default function Home() {
	const { data: session, status } = useSession();
	const [searchQuery, setSearchQuery] = useState('');

	const handleSearch = () => {
		if (searchQuery.trim()) {
			window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSearch();
		}
	};

	const popularSearches = [
		{ id: 1, text: 'Psychologie cognitive', count: '2.4k' },
		{ id: 2, text: 'Neurosciences', count: '1.8k' },
		{ id: 3, text: 'Psychanalyse', count: '3.1k' },
		{ id: 4, text: 'Développement', count: '2.7k' },
	];

	const features = [
		{
			icon: <Search className="w-6 h-6" />,
			title: 'Recherche ultra-précise',
			description: 'Algorithme optimisé pour la psychologie avec détection automatique des PDF gratuits (Cairn, HAL, ResearchGate).',
			gradient: 'from-blue-500 to-cyan-500'
		},
		{
			icon: <BookOpen className="w-6 h-6" />,
			title: 'Bibliothèque personnalisée',
			description: 'Sauvegardez vos articles favoris, organisez-les par dossiers et retrouvez-les sur votre profil.',
			gradient: 'from-purple-500 to-pink-500'
		},
		{
			icon: <Sparkles className="w-6 h-6" />,
			title: 'Citations APA 7',
			description: 'Générez vos bibliographies instantanément au format académique pour vos dossiers et mémoires.',
			gradient: 'from-orange-500 to-red-500'
		},
		{
			icon: <Users className="w-6 h-6" />,
			title: 'Espace Étudiant',
			description: 'Un outil conçu spécifiquement pour les étudiants en SHS de Clermont-Ferrand et d\'ailleurs.',
			gradient: 'from-green-500 to-emerald-500'
		}
	];

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 font-sans">
			{/* Effet de fond décoratif */}
			<div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-transparent to-purple-100 opacity-40 pointer-events-none" />

			{/* Header Dynamique */}
			<header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
				<div className="container mx-auto px-4 lg:px-8">
					<div className="flex items-center justify-between h-16">

						{/* Logo */}
						<Link href="/" className="flex items-center gap-3 group">
							<div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-blue-100 group-hover:border-blue-500 transition-colors">
								<img
									src='/scholarpsy.jpg'
									alt="Logo ScholarPsy"
									className="h-full w-full object-cover"
								/>
							</div>
							<h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
								ScholarPsy
							</h1>
						</Link>

						{/* Navigation centrale */}
						<nav className="hidden md:flex items-center gap-8">
							<Link href="/search" className="text-slate-600 hover:text-blue-600 font-bold text-sm transition-colors">EXPLORER</Link>
							<Link href="/bookmarks" className="text-slate-600 hover:text-blue-600 font-bold text-sm transition-colors">MA BIBLIOTHÈQUE</Link>
						</nav>

						{/* Actions Utilisateur */}
						<div className="flex items-center gap-3">
							{status === "authenticated" ? (
								<div className="flex items-center gap-4">
									{/* Lien vers le profil corrigé */}
									<Link
										href="/profil"
										className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-full transition-all group"
									>
										<User className="w-4 h-4 text-blue-600" />
										<span className="text-sm font-bold text-blue-700">
                      {session.user?.name}
                    </span>
									</Link>
									<button
										onClick={() => signOut()}
										className="p-2 text-slate-400 hover:text-red-600 transition-colors"
										title="Déconnexion"
									>
										<LogOut className="w-5 h-5" />
									</button>
								</div>
							) : (
								<div className="flex items-center gap-2">
									<Link href="/auth/login" className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-sm transition-colors">
										Connexion
									</Link>
									<Link href="/auth/signup" className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg">
										S'inscrire
									</Link>
								</div>
							)}
						</div>
					</div>
				</div>
			</header>

			<main className="relative z-10">
				<div className="container mx-auto px-4 lg:px-8 pt-16 pb-24">

					{/* Hero Section */}
					<div className="max-w-4xl mx-auto text-center space-y-8 mb-20">
						<div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 border border-white rounded-full text-blue-600 text-xs font-black uppercase tracking-widest shadow-sm">
							<GraduationCap className="w-4 h-4" /> Spécialisé en Psychologie & SHS
						</div>

						<h2 className="text-6xl md:text-8xl font-black text-slate-900 leading-[0.9] tracking-tighter">
							Recherche académique <br />
							<span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent italic">sans limites.</span>
						</h2>

						<p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
							Une alternative moderne à Google Scholar pour trouver vos articles de psycho et gérer vos favoris.
						</p>

						{/* Barre de recherche */}
						<div className="relative max-w-3xl mx-auto group mt-10">
							<div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
							<div className="relative flex items-center bg-white rounded-2xl shadow-2xl border border-slate-100 p-2">
								<Search className="w-6 h-6 text-slate-400 ml-4" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									onKeyDown={handleKeyPress}
									placeholder="Théorie de l'attachement, TCC, Freud..."
									className="flex-1 px-4 py-4 text-lg focus:outline-none text-slate-900 font-medium"
								/>
								<button
									onClick={handleSearch}
									className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-black flex items-center gap-2 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
								>
									CHERCHER <ArrowRight className="w-5 h-5" />
								</button>
							</div>
						</div>

						{/* Tags de recherche populaire */}
						<div className="flex flex-wrap items-center justify-center gap-2 mt-6">
							<span className="text-xs font-bold text-slate-400 uppercase mr-2 tracking-widest">Populaire :</span>
							{popularSearches.map((search) => (
								<button
									key={search.id}
									onClick={() => window.location.href = `/search?q=${encodeURIComponent(search.text)}`}
									className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm"
								>
									{search.text} <span className="opacity-50 font-normal">({search.count})</span>
								</button>
							))}
						</div>
					</div>

					{/* Features Grid */}
					<div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-32">
						{features.map((feature, index) => (
							<div key={index} className="group bg-white rounded-3xl p-10 shadow-sm border border-slate-100 hover:shadow-2xl hover:border-blue-100 transition-all duration-300">
								<div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg transform group-hover:rotate-6 transition-transform`}>
									{feature.icon}
								</div>
								<h4 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{feature.title}</h4>
								<p className="text-slate-500 leading-relaxed font-medium">{feature.description}</p>
							</div>
						))}
					</div>

					{/* CTA de fin de page */}
					<div className="max-w-4xl mx-auto">
						<div className="relative overflow-hidden bg-slate-900 rounded-[40px] p-12 text-center shadow-2xl">
							<div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 -mr-32 -mt-32"></div>
							<div className="relative z-10">
								<h3 className="text-4xl font-black text-white mb-4 tracking-tight">
									{session ? `Continuer vos recherches, ${session.user?.name}` : "Prêt à transformer votre recherche ?"}
								</h3>
								<p className="text-xl mb-10 text-slate-400 font-medium">
									{session ? "Accédez à votre bibliothèque et vos citations APA." : "Rejoignez ScholarPsy pour organiser vos lectures académiques."}
								</p>
								<Link href={session ? "/profil" : "/auth/signup"}>
									<button className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black hover:scale-105 transition-all shadow-xl inline-flex items-center gap-3">
										{session ? "OUVRIR MON PROFIL" : "CRÉER UN COMPTE GRATUIT"}
										<ArrowRight className="w-6 h-6" />
									</button>
								</Link>
							</div>
						</div>
					</div>
				</div>
			</main>

			<footer className="bg-white border-t border-slate-200 py-12">
				<div className="container mx-auto px-4 text-center">
					<p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">ScholarPsy Clermont-Ferrand</p>
					<p className="text-slate-500">© 2026 — L'alternative académique pour les étudiants en psychologie.</p>
				</div>
			</footer>
		</div>
	);
}