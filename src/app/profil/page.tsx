'use client';
import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
	Clock,
	User,
	Settings,
	LogOut,
	Loader2,
	TrendingUp,
	Tag,
	BookOpen,
	ChevronRight,
	LayoutDashboard,
	Trash2
} from 'lucide-react';
import Link from 'next/link';

interface Bookmark {
	id: string;
	title: string;
	link: string;
	snippet: string;
	createdAt: string;
}

interface ProfileData {
	user: {
		id: string;
		name: string;
		email: string;
		createdAt: string;
		bookmarksCount: number;
	};
	recentBookmarks: Bookmark[];
}

export default function ProfilePage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [profileData, setProfileData] = useState<ProfileData | null>(null);
	const [loading, setLoading] = useState(true);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	useEffect(() => {
		if (status === 'unauthenticated') {
			router.push('/auth/login');
		} else if (status === 'authenticated') {
			fetchProfil();
		}
	}, [status, router]);

	const fetchProfil = async () => {
		try {
			const res = await fetch('/api/user/profil');
			const data = await res.json();
			if (data.success) {
				setProfileData(data);
			}
		} catch (error) {
			console.error('Erreur chargement profil:', error);
		} finally {
			setLoading(false);
		}
	};

	const deleteBookmark = async (bookmarkId: string) => {
		if (!confirm('Voulez-vous vraiment supprimer cet article ?')) {
			return;
		}

		setDeletingId(bookmarkId);

		try {
			const res = await fetch(`/api/bookmarks?id=${bookmarkId}`, {
				method: 'DELETE',
			});

			const data = await res.json();

			if (data.success) {
				// Mise à jour locale de l'état
				setProfileData(prev => {
					if (!prev) return prev;
					return {
						...prev,
						user: {
							...prev.user,
							bookmarksCount: Math.max(0, prev.user.bookmarksCount - 1)
						},
						recentBookmarks: prev.recentBookmarks.filter(b => b.id !== bookmarkId)
					};
				});
			} else {
				alert(data.error || 'Erreur lors de la suppression');
			}
		} catch (error) {
			console.error('Erreur suppression:', error);
			alert('Erreur lors de la suppression');
		} finally {
			setDeletingId(null);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
	};

	if (loading || status === 'loading') {
		return (
			<div className="min-h-screen bg-slate-50 flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-slate-600" />
			</div>
		);
	}

	if (!profileData) {
		return (
			<div className="min-h-screen bg-slate-50 flex items-center justify-center">
				<p className="text-slate-600">Erreur de chargement du profil</p>
			</div>
		);
	}

	const { user, recentBookmarks } = profileData;

	return (
		<div className="min-h-screen bg-slate-50">
			{/* Navigation */}
			<nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
				<div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
					<Link href="/" className="flex items-center gap-3">
						<div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center">
							<span className="text-white font-bold text-lg">S</span>
						</div>
						<span className="font-bold text-xl text-slate-900">ScholarPsy</span>
					</Link>

					<div className="flex items-center gap-6 text-sm font-medium">
						<Link href="/search" className="text-slate-600 hover:text-slate-900 transition-colors">Explorer</Link>
						<Link href="/bookmarks" className="text-slate-600 hover:text-slate-900 transition-colors">Ma bibliothèque</Link>
						<div className="h-6 w-[1px] bg-slate-200"></div>
						<span className="text-slate-900 flex items-center gap-2">
							<User className="w-4 h-4 text-slate-400" /> {user.name}
						</span>
					</div>
				</div>
			</nav>

			<main className="max-w-6xl mx-auto px-6 py-12">

				{/* Header de Page */}
				<div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
					<div>
						<div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">
							<LayoutDashboard className="w-4 h-4" />
							Tableau de bord
						</div>
						<h1 className="text-3xl font-bold text-slate-900 tracking-tight">Espace de {user.name}</h1>
					</div>
					<div className="flex items-center gap-3">
						<Link href="/settings" className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm">
							<Settings className="w-4 h-4" />
							Paramètres
						</Link>
						<button
							onClick={() => signOut({ callbackUrl: '/' })}
							className="p-2 text-slate-400 hover:text-red-600 transition-colors"
							title="Se déconnecter"
						>
							<LogOut className="w-5 h-5" />
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

					{/* COLONNE GAUCHE : Compte & Stats */}
					<div className="space-y-6">
						<div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
							<div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
								<User className="w-8 h-8 text-slate-400" />
							</div>
							<h2 className="text-xl font-bold text-slate-900 leading-tight">{user.name}</h2>
							<p className="text-slate-500 text-sm mb-6">{user.email}</p>

							<div className="space-y-4 pt-6 border-t border-slate-100 text-sm text-slate-500">
								<div className="flex items-center gap-3">
									<Clock className="w-4 h-4" />
									<span>Membre depuis {formatDate(user.createdAt)}</span>
								</div>
							</div>
						</div>

						{/* Bloc Statistique */}
						<div className="bg-slate-900 rounded-lg p-8 text-white shadow-md">
							<div className="flex items-center justify-between mb-4">
								<BookOpen className="w-8 h-8 text-slate-400" />
							</div>
							<div className="text-4xl font-bold mb-1">{user.bookmarksCount}</div>
							<p className="text-slate-400 text-sm font-medium mb-6">Articles sauvegardés</p>
							<Link href="/bookmarks" className="flex items-center justify-center gap-2 w-full py-3 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors text-sm font-bold uppercase tracking-tight">
								Voir ma bibliothèque
								<ChevronRight className="w-4 h-4" />
							</Link>
						</div>
					</div>

					{/* COLONNE DROITE : Activité */}
					<div className="lg:col-span-2 space-y-8">

						{/* Catégories de recherche */}
						<div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
							<div className="flex items-center gap-3 mb-6">
								<Tag className="w-5 h-5 text-blue-600" />
								<h3 className="font-bold text-slate-900 text-lg">Domaines enregistrés</h3>
							</div>
							<div className="flex flex-wrap gap-2">
								{['Psychologie Cognitive', 'Neurosciences', 'Psychologie Sociale', 'SHS'].map((tag) => (
									<span key={tag} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold border border-slate-100 uppercase tracking-tighter">
										{tag}
									</span>
								))}
							</div>
						</div>

						{/* Articles récents */}
						<div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
							<div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
								<div className="flex items-center gap-3">
									<TrendingUp className="w-5 h-5 text-slate-800" />
									<h3 className="font-bold text-slate-900 text-lg">Ajouts récents</h3>
								</div>
								<Link href="/bookmarks" className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-widest">
									Voir tout
								</Link>
							</div>

							<div className="divide-y divide-slate-50">
								{recentBookmarks.length > 0 ? (
									recentBookmarks.slice(0, 4).map((bookmark) => (
										<div key={bookmark.id} className="px-8 py-5 hover:bg-slate-50 transition-colors flex justify-between items-center group">
											<div className="flex-1 min-w-0 text-black">
												<h4 className="font-bold truncate group-hover:text-blue-600 transition-colors">
													{bookmark.title}
												</h4>
												<p className="text-xs text-black mt-1 italic">
													Sauvegardé le {new Date(bookmark.createdAt).toLocaleDateString()}
												</p>
											</div>
											<div className="flex items-center gap-2 ml-4">
												<button
													onClick={() => deleteBookmark(bookmark.id)}
													disabled={deletingId === bookmark.id}
													className="p-2 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
													title="Supprimer"
												>
													{deletingId === bookmark.id ? (
														<Loader2 className="w-4 h-4 animate-spin" />
													) : (
														<Trash2 className="w-4 h-4" />
													)}
												</button>
												<ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
											</div>
										</div>
									))
								) : (
									<div className="p-12 text-center text-slate-400 italic text-sm font-medium">
										Aucun article récent pour le moment.
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}