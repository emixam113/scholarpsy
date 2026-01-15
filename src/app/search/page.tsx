'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, ArrowLeft, ExternalLink, BookmarkPlus, Download } from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
	title: string;
	link: string;
	snippet: string;
	publication_info?: {
		summary: string;
	};
	inline_links?: {
		cited_by?: {
			total: number;
		};
	};
}

export default function SearchPage() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const query = searchParams.get('q') || '';

	const [results, setResults] = useState<SearchResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [searchInput, setSearchInput] = useState(query);

	useEffect(() => {
		if (query) {
			performSearch(query);
		}
	}, [query]);

	const performSearch = async (searchQuery: string) => {
		setLoading(true);
		setError('');
		try {
			const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
			const data = await response.json();

			if (data.success) {
				setResults(data.results);
			} else {
				setError(data.error || 'Une erreur est survenue');
			}
		} catch (err) {
			setError('Impossible de récupérer les résultats');
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchInput.trim()) {
			router.push(`/search?q=${encodeURIComponent(searchInput)}`);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
			<header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-white/20 shadow-sm">
				<div className="container mx-auto px-4 lg:px-8 py-4">
					<div className="flex items-center gap-4">
						<Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
							<ArrowLeft className="w-5 h-5" />
							<span className="font-medium">Retour</span>
						</Link>

						<form onSubmit={handleSearch} className="flex-1 max-w-2xl">
							<div className="flex items-center bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
								<Search className="w-5 h-5 text-slate-400 ml-4" />
								<input
									type="text"
									value={searchInput}
									onChange={(e) => setSearchInput(e.target.value)}
									placeholder="Rechercher..."
									className="flex-1 px-4 py-3 focus:outline-none text-slate-900"
								/>
								<button
									type="submit"
									className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg transition-all"
								>
									Rechercher
								</button>
							</div>
						</form>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 lg:px-8 py-8">
				{loading && (
					<div className="text-center py-20">
						<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
						<p className="mt-4 text-slate-600">Recherche en cours...</p>
					</div>
				)}

				{error && (
					<div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-6 text-center">
						<p className="text-red-600 font-medium">{error}</p>
					</div>
				)}

				{!loading && !error && results.length === 0 && query && (
					<div className="max-w-2xl mx-auto bg-white rounded-xl p-12 text-center shadow-sm">
						<p className="text-slate-600 text-lg">Aucun résultat trouvé pour "{query}"</p>
					</div>
				)}

				{!loading && results.length > 0 && (
					<div className="max-w-4xl mx-auto space-y-6">
						<div className="text-slate-600 mb-6">
							Environ {results.length} résultats pour <span className="font-semibold text-slate-900">"{query}"</span>
						</div>

						{results.map((result, index) => (
							<div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all border border-slate-100">
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1">
										<a
											href={result.link}
											target="_blank"
											rel="noopener noreferrer"
											className="text-xl font-semibold text-blue-600 hover:text-blue-700 hover:underline mb-2 block"
										>
											{result.title}
										</a>

										{result.publication_info?.summary && (
											<p className="text-sm text-green-700 mb-2">
												{result.publication_info.summary}
											</p>
										)}

										<p className="text-slate-600 mb-3">{result.snippet}</p>

										<div className="flex items-center gap-4 text-sm">
											{result.inline_links?.cited_by?.total && (
												<span className="text-slate-500">
                          Cité {result.inline_links.cited_by.total} fois
                        </span>
											)}
											<a
												href={result.link}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
											>
												<ExternalLink className="w-4 h-4" />
												Voir l'article
											</a>
										</div>
									</div>

									<div className="flex flex-col gap-2">
										<button className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" title="Sauvegarder">
											<BookmarkPlus className="w-5 h-5 text-slate-600" />
										</button>
										<button className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" title="Télécharger citation">
											<Download className="w-5 h-5 text-slate-600" />
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</main>
		</div>
	);
}