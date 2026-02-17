'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Search, ExternalLink, Bookmark, Loader2, BookmarkCheck, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { debounce } from 'lodash';
import { z } from 'zod';

const ArticleSchema = z.object({
	title: z.string(),
	link: z.string().url(),
	snippet: z.string(),
});
type Article = z.infer<typeof ArticleSchema>;

// ✅ Composant séparé pour useSearchParams
function SearchContent() {
	const { data: session } = useSession();
	const searchParams = useSearchParams();
	const [query, setQuery] = useState(searchParams.get('q') || '');
	const [results, setResults] = useState<Article[]>([]);
	const [loading, setLoading] = useState(false);
	const [savedArticles, setSavedArticles] = useState<Set<string>>(new Set());
	const [viewedArticles, setViewedArticles] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (session) {
			fetch('/api/bookmarks')
				.then(res => res.json())
				.then(data => {
					if (data.bookmarks) {
						setSavedArticles(new Set(data.bookmarks.map((b: Article) => b.link)));
					}
				})
				.catch(err => console.error('Error fetching bookmarks:', err));

			fetch('/api/history')
				.then(res => res.json())
				.then(data => {
					if (data.history) {
						setViewedArticles(new Set(data.history.map((h: Article) => h.link)));
					}
				})
				.catch(err => console.error('Error fetching history:', err));
		}
	}, [session]);

	const debouncedSearch = useCallback(
		debounce(async (q: string) => {
			if (!q.trim()) return;
			setLoading(true);
			try {
				const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
				const data = await res.json();
				if (data.success) {
					const validatedResults = z.array(ArticleSchema).parse(data.results);
					const filteredResults = validatedResults.filter(
						(result: Article) => !viewedArticles.has(result.link)
					);
					setResults(filteredResults);
				}
			} catch (error) {
				console.error('Erreur recherche:', error);
				toast.error('Une erreur est survenue lors de la recherche.');
			} finally {
				setLoading(false);
			}
		}, 500),
		[viewedArticles]
	);

	useEffect(() => {
		const q = searchParams.get('q');
		if (q) {
			setQuery(q);
			debouncedSearch(q);
		}
		return () => debouncedSearch.cancel();
	}, [searchParams, debouncedSearch]);

	const trackVisit = async (article: Article) => {
		if (!session) return;
		try {
			await fetch('/api/history', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(article),
			});
			setViewedArticles(prev => new Set(prev).add(article.link));
		} catch (error) {
			console.error('Erreur tracking:', error);
			toast.error("Erreur lors de l'enregistrement de la visite.");
		}
	};

	const saveBookmark = async (article: Article) => {
		if (!session) {
			toast.error('Vous devez être connecté pour sauvegarder des articles');
			return;
		}
		try {
			const res = await fetch('/api/bookmarks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(article),
			});
			const data = await res.json();
			if (data.success) {
				setSavedArticles(prev => new Set(prev).add(article.link));
				toast.success('Article sauvegardé !');
			}
		} catch (error) {
			console.error('Erreur sauvegarde:', error);
			toast.error('Erreur lors de la sauvegarde.');
		}
	};

	const resetArticle = async (link: string) => {
		try {
			const res = await fetch('/api/history', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ link }),
			});
			const data = await res.json();
			if (data.success) {
				setViewedArticles(prev => {
					const newSet = new Set(prev);
					newSet.delete(link);
					return newSet;
				});
				toast.success('Article réinitialisé.');
			}
		} catch (error) {
			console.error('Erreur réinitialisation:', error);
			toast.error('Erreur lors de la réinitialisation.');
		}
	};

	const handleSearch = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		debouncedSearch(query);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
			<div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-transparent to-purple-100 opacity-40 pointer-events-none" />

			<div className="relative z-10 max-w-5xl mx-auto p-8 pt-20">
				<form onSubmit={handleSearch} className="relative mb-12">
					<div className="relative">
						<Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
						<input
							type="text"
							value={query}
							onChange={(e) => {
								setQuery(e.target.value);
								debouncedSearch(e.target.value);
							}}
							placeholder="Rechercher des articles en psychologie..."
							className="w-full pl-14 pr-4 py-5 rounded-2xl border-2 border-slate-200 shadow-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-900 bg-white"
						/>
					</div>
				</form>

				{loading ? (
					<div className="text-center py-20">
						<Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
						<p className="text-slate-600 font-medium">Recherche en cours...</p>
					</div>
				) : results.length === 0 ? (
					<div className="text-center py-20">
						<p className="text-slate-600 font-medium">
							{viewedArticles.size > 0 && query.trim()
								? `Tous les résultats pour "${query}" ont déjà été consultés.`
								: `Aucun résultat trouvé pour "${query}".`}
						</p>
						<p className="text-slate-500 mt-2">
							{viewedArticles.size > 0 && query.trim()
								? 'Tu peux réinitialiser des articles depuis ton historique ou essayer une nouvelle recherche.'
								: "Essaie avec d'autres mots-clés ou vérifie l'orthographe."}
						</p>
					</div>
				) : (
					<div className="space-y-6">
						{results.map((result, index) => {
							const isSaved = savedArticles.has(result.link);
							const isViewed = viewedArticles.has(result.link);
							return (
								<article
									key={index}
									className="bg-white p-8 rounded-3xl shadow-sm border-2 border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all"
								>
									<h3 className="text-2xl font-black text-slate-900 mb-3 leading-tight">
										{result.title}
									</h3>
									<p className="text-slate-600 mb-6 leading-relaxed">{result.snippet}</p>

									<div className="flex gap-4 items-center">
										<a
											href={result.link}
											target="_blank"
											rel="noopener noreferrer"
											onClick={() => trackVisit(result)}
											className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all shadow-md text-sm uppercase tracking-wide"
										>
											<ExternalLink size={16} /> Consulter l&apos;article
										</a>

										<button
											onClick={() => saveBookmark(result)}
											disabled={isSaved}
											className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all text-sm ${
												isSaved
													? 'bg-green-50 text-green-600 border-2 border-green-200'
													: 'bg-slate-50 text-slate-600 hover:bg-yellow-50 hover:text-yellow-600 border-2 border-slate-200'
											}`}
										>
											{isSaved ? (
												<><BookmarkCheck size={16} /> Sauvegardé</>
											) : (
												<><Bookmark size={16} /> Sauvegarder</>
											)}
										</button>

										{isViewed && (
											<button
												onClick={() => resetArticle(result.link)}
												className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"
											>
												<Undo2 size={14} /> Réinitialiser
											</button>
										)}
									</div>
								</article>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

// ✅ Page principale avec Suspense obligatoire pour useSearchParams
export default function SearchPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center">
					<Loader2 className="w-12 h-12 animate-spin text-blue-600" />
				</div>
			}
		>
			<SearchContent />
		</Suspense>
	);
}