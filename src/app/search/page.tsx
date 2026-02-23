'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, ExternalLink, Bookmark, Loader2, BookmarkCheck, Undo2, Eye, EyeOff, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { debounce } from 'lodash';

interface Article {
    title: string;
    link: string;
    snippet: string;
    authors?: string;
    year?: number | null;
    journal?: string | null;
    citedBy?: number;
    isFullText?: boolean;
    pdfLink?: string | null;
    source?: string;
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 animate-pulse">
            <div className="flex items-start justify-between mb-3">
                <div className="h-7 bg-slate-200 rounded-lg w-3/4" />
                <div className="h-6 w-20 bg-slate-100 rounded-full ml-3" />
            </div>
            <div className="space-y-2 mb-6">
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-5/6" />
                <div className="h-4 bg-slate-100 rounded w-4/6" />
            </div>
            <div className="flex gap-3">
                <div className="h-10 w-40 bg-slate-200 rounded-xl" />
                <div className="h-10 w-32 bg-slate-100 rounded-xl" />
            </div>
        </div>
    );
}

function SearchContent() {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [results, setResults] = useState<Article[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [savedArticles, setSavedArticles] = useState<Set<string>>(new Set());
    const [viewedArticles, setViewedArticles] = useState<Set<string>>(new Set());
    const [filterUnread, setFilterUnread] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [searchType, setSearchType] = useState<string | null>(null);

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
                    if (data.data?.history) {
                        setViewedArticles(new Set(data.data.history.map((h: any) => h.link)));
                    }
                })
                .catch(err => console.error('Error fetching history:', err));
        }
    }, [session]);

    const fetchResults = async (q: string, p: number, append = false) => {
        if (!q.trim()) return;
        if (append) setLoadingMore(true);
        else setLoading(true);

        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&page=${p}`);
            const data = await res.json();
            console.log('Résultats API:', data);

            if (data.success && Array.isArray(data.results)) {
                const normalized: Article[] = data.results.map((r: any) => ({
                    title: r.title || 'Sans titre',
                    link: r.link || '#',
                    snippet: r.snippet || '',
                    authors: r.authors || '',
                    year: r.year || null,
                    journal: r.journal || null,
                    citedBy: r.citedBy || 0,
                    isFullText: r.isFullText || false,
                    pdfLink: r.pdfLink || null,
                    source: r.source || '',
                }));

                if (append) {
                    setResults(prev => {
                        const existingLinks = new Set(prev.map(r => r.link));
                        const newResults = normalized.filter(r => !existingLinks.has(r.link));
                        return [...prev, ...newResults];
                    });
                } else {
                    setResults(normalized);
                }

                setHasMore(data.hasMore || false);
                setSearchType(data.searchType || null);
            } else {
                if (!append) setResults([]);
            }
        } catch (error) {
            console.error('Erreur recherche:', error);
            toast.error('Une erreur est survenue lors de la recherche.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const debouncedSearch = useCallback(
        debounce((q: string) => {
            setPage(1);
            fetchResults(q, 1, false);
        }, 600),
        []
    );

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) {
            setQuery(q);
            fetchResults(q, 1, false);
        }
        return () => debouncedSearch.cancel();
    }, [searchParams]);

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchResults(query, nextPage, true);
    };

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
        }
    };

    const markAsRead = async (article: Article) => {
        if (!session) return;
        try {
            await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(article),
            });
            setViewedArticles(prev => new Set(prev).add(article.link));
            toast.success('Article marqué comme lu.');
        } catch (error) {
            console.error('Erreur marquage:', error);
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
            const res = await fetch('/api/history');
            const data = await res.json();
            const entry = data.data?.history?.find((h: any) => h.link === link);
            if (!entry) return;
            await fetch(`/api/history?id=${entry.id}`, { method: 'DELETE' });
            setViewedArticles(prev => {
                const newSet = new Set(prev);
                newSet.delete(link);
                return newSet;
            });
            toast.success('Article marqué comme non lu.');
        } catch (error) {
            console.error('Erreur réinitialisation:', error);
        }
    };

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setPage(1);
        fetchResults(query, 1, false);
    };

    const filteredResults = filterUnread
        ? results.filter(r => !viewedArticles.has(r.link))
        : results;

    const readCount = results.filter(r => viewedArticles.has(r.link)).length;
    const unreadCount = results.length - readCount;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-transparent to-purple-100 opacity-40 pointer-events-none" />

            <div className="relative z-10 max-w-5xl mx-auto p-8 pt-20">

                {/* Barre de recherche */}
                <form onSubmit={handleSearch} className="relative mb-6">
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

                {/* Barre de statut */}
                {results.length > 0 && !loading && (
                    <div className="flex items-center justify-between mb-6 px-1">
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                            {searchType && (
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                    searchType === 'classic'
                                        ? 'bg-purple-50 text-purple-600 border-purple-200'
                                        : 'bg-blue-50 text-blue-600 border-blue-200'
                                }`}>
									{searchType === 'classic' ? '📚 Références classiques' : '🔬 Recherches récentes'}
								</span>
                            )}
                            <span className="flex items-center gap-1.5">
								<span className="w-2 h-2 rounded-full bg-blue-500" />
								<span><strong className="text-slate-700">{unreadCount}</strong> non lu{unreadCount > 1 ? 's' : ''}</span>
							</span>
                            <span className="flex items-center gap-1.5">
								<span className="w-2 h-2 rounded-full bg-slate-300" />
								<span><strong className="text-slate-500">{readCount}</strong> lu{readCount > 1 ? 's' : ''}</span>
							</span>
                        </div>
                        <button
                            onClick={() => setFilterUnread(!filterUnread)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                                filterUnread
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                            }`}
                        >
                            {filterUnread ? <EyeOff size={15} /> : <Eye size={15} />}
                            {filterUnread ? 'Voir tout' : 'Non lus seulement'}
                        </button>
                    </div>
                )}

                {/* Skeleton de chargement */}
                {loading ? (
                    <div className="space-y-6">
                        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : filteredResults.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-slate-600 font-medium">
                            {query.trim()
                                ? filterUnread
                                    ? 'Tous les articles ont été lus !'
                                    : `Aucun résultat trouvé pour "${query}".`
                                : 'Lancez une recherche pour trouver des articles.'}
                        </p>
                        {query.trim() && !filterUnread && (
                            <p className="text-slate-500 mt-2">
                                Essaie avec d&apos;autres mots-clés ou vérifie l&apos;orthographe.
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="space-y-6">
                            {filteredResults.map((result, index) => {
                                const isSaved = savedArticles.has(result.link);
                                const isViewed = viewedArticles.has(result.link);
                                return (
                                    <article
                                        key={index}
                                        className={`bg-white p-8 rounded-3xl shadow-sm border-2 transition-all ${
                                            isViewed
                                                ? 'border-slate-200 opacity-70 hover:opacity-100 hover:shadow-md'
                                                : 'border-slate-100 hover:shadow-xl hover:border-blue-200'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className={`text-xl font-black leading-tight flex-1 ${isViewed ? 'text-slate-400' : 'text-slate-900'}`}>
                                                {result.title}
                                            </h3>
                                            <span className={`ml-3 mt-1 flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                                                isViewed
                                                    ? 'bg-slate-100 text-slate-400 border-slate-200'
                                                    : 'bg-blue-50 text-blue-600 border-blue-200'
                                            }`}>
												<span className={`w-1.5 h-1.5 rounded-full ${isViewed ? 'bg-slate-400' : 'bg-blue-500'}`} />
                                                {isViewed ? 'Lu' : 'Non lu'}
											</span>
                                        </div>

                                        {/* Métadonnées */}
                                        <div className="flex flex-wrap gap-3 mb-3 text-xs text-slate-400">
                                            {result.authors && <span>👤 {result.authors}</span>}
                                            {result.year && <span>📅 {result.year}</span>}
                                            {result.journal && <span>📖 {result.journal}</span>}
                                            {result.citedBy ? <span>💬 {result.citedBy} citations</span> : null}
                                            {result.isFullText && <span className="text-green-600 font-semibold">✅ PDF disponible</span>}
                                            {result.source && (
                                                <span className={`px-2 py-0.5 rounded-full font-semibold ${
                                                    result.source === 'OpenAlex'
                                                        ? 'bg-orange-50 text-orange-500'
                                                        : 'bg-blue-50 text-blue-500'
                                                }`}>
													{result.source}
												</span>
                                            )}
                                        </div>

                                        {isViewed && (
                                            <p className="text-xs text-slate-400 italic mb-2">
                                                Vous avez déjà consulté cet article.
                                            </p>
                                        )}

                                        <p className={`mb-6 leading-relaxed text-sm ${isViewed ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {result.snippet || 'Aucun résumé disponible.'}
                                        </p>

                                        <div className="flex gap-3 items-center flex-wrap">
                                            <a
                                                href={result.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={() => trackVisit(result)}
                                                className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all shadow-md text-sm uppercase tracking-wide"
                                            >
                                                <ExternalLink size={16} /> Consulter
                                            </a>

                                            {result.pdfLink && result.pdfLink !== result.link && (
                                                <a
                                                    href={result.pdfLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={() => trackVisit(result)}
                                                    className="inline-flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all text-sm"
                                                >
                                                    📄 PDF gratuit
                                                </a>
                                            )}

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

                                            {!isViewed ? (
                                                <button
                                                    onClick={() => markAsRead(result)}
                                                    className="text-sm text-slate-400 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                                                >
                                                    <Eye size={14} /> Marquer comme lu
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => resetArticle(result.link)}
                                                    className="text-sm text-slate-400 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
                                                >
                                                    <Undo2 size={14} /> Marquer comme non lu
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {/* Bouton charger plus */}
                        {hasMore && (
                            <div className="mt-10 text-center">
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-slate-700 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm disabled:opacity-50"
                                >
                                    {loadingMore ? (
                                        <><Loader2 size={18} className="animate-spin" /> Chargement...</>
                                    ) : (
                                        <><ChevronDown size={18} /> Charger plus d&apos;articles</>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Skeleton pour le chargement de plus */}
                        {loadingMore && (
                            <div className="space-y-6 mt-6">
                                {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

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