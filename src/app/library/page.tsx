"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProps } from '@hello-pangea/dnd';
import {
	Folder,
	FolderPlus,
	Grid3x3,
	List,
	Search,
	ExternalLink,
	Trash2,
	Plus,
	X,
	Loader2,
	BookMarked,
	Archive,
	Star,
	ChevronDown,
	ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

// --- CORRECTIF INDISPENSABLE POUR NEXT.JS ---
const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
	const [enabled, setEnabled] = useState(false);
	useEffect(() => {
		const animation = requestAnimationFrame(() => setEnabled(true));
		return () => {
			cancelAnimationFrame(animation);
			setEnabled(false);
		};
	}, []);
	if (!enabled) return null;
	return <Droppable {...props}>{children}</Droppable>;
};

// --- Types ---
interface Article {
	id: string;
	title: string;
	link: string;
	snippet: string;
	savedAt: string;
	folderId: string | null;
	folder?: {
		id: string;
		name: string;
		color: string | null;
	} | null;
}

interface Bookmark {
	id: string;
	title: string;
	link: string;
	snippet: string;
	createdAt: string;
}

interface FolderType {
	id: string;
	name: string;
	color: string | null;
	_count: {
		articles: number;
	};
}

export default function LibraryPage() {
	const { data: session, status } = useSession();

	const [articles, setArticles] = useState<Article[]>([]);
	const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
	const [folders, setFolders] = useState<FolderType[]>([]);
	const [loading, setLoading] = useState(true);
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

	// États pour les modals
	const [showNewFolderModal, setShowNewFolderModal] = useState(false);
	const [showAddToLibraryModal, setShowAddToLibraryModal] = useState(false);
	const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);

	const [newFolderName, setNewFolderName] = useState('');
	const [newFolderColor, setNewFolderColor] = useState('#3B82F6');
	const [isCreating, setIsCreating] = useState(false);

	// État pour masquer/afficher la section bookmarks
	const [showBookmarksSection, setShowBookmarksSection] = useState(true);

	const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

	useEffect(() => {
		if (status === 'authenticated') {
			fetchData();
		}
	}, [status]);

	const fetchData = async () => {
		try {
			setLoading(true);
			const [foldersRes, articlesRes, bookmarksRes] = await Promise.all([
				fetch('/api/folders'),
				fetch('/api/library'),
				fetch('/api/bookmarks')
			]);

			const foldersData = await foldersRes.json();
			const articlesData = await articlesRes.json();
			const bookmarksData = await bookmarksRes.json();

			if (foldersRes.ok) setFolders(foldersData.data?.folders || foldersData.folders || []);
			if (articlesRes.ok) setArticles(articlesData.data?.articles || articlesData.articles || []);
			if (bookmarksRes.ok) setBookmarks(bookmarksData.data?.bookmarks || bookmarksData.bookmarks || []);
		} catch (error) {
			console.error('Erreur de chargement:', error);
			toast.error('Erreur de chargement');
		} finally {
			setLoading(false);
		}
	};

	// Filtrer les bookmarks qui ne sont PAS déjà dans Library
	const bookmarksToOrganize = bookmarks.filter(
		bookmark => !articles.some(article => article.link === bookmark.link)
	);

	// Créer un dossier
	const createFolder = async () => {
		if (!newFolderName.trim()) {
			toast.error('Le nom du dossier est requis');
			return;
		}

		setIsCreating(true);
		try {
			const res = await fetch('/api/folders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newFolderName.trim(),
					color: newFolderColor
				}),
			});

			const data = await res.json();

			if (res.ok && data.success) {
				setNewFolderName('');
				setNewFolderColor('#3B82F6');
				setShowNewFolderModal(false);
				toast.success('Dossier créé !');
				await fetchData();
			} else {
				toast.error(data.error || 'Erreur lors de la création');
			}
		} catch (error) {
			toast.error('Erreur réseau');
		} finally {
			setIsCreating(false);
		}
	};

	// Ajouter un bookmark à la bibliothèque
	const addBookmarkToLibrary = async (bookmark: Bookmark, folderId: string | null) => {
		try {
			const res = await fetch('/api/library', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: bookmark.title,
					link: bookmark.link,
					snippet: bookmark.snippet,
					folderId
				}),
			});

			const data = await res.json();

			if (res.ok && data.success) {
				toast.success('Article ajouté à la bibliothèque !');
				setShowAddToLibraryModal(false);
				setSelectedBookmark(null);
				await fetchData(); // Refresh pour voir le nouvel article
			} else {
				toast.error(data.error || 'Erreur lors de l\'ajout');
			}
		} catch (error) {
			toast.error('Erreur réseau');
		}
	};

	// Supprimer un article de la bibliothèque
	const deleteArticle = async (articleId: string) => {
		if (!confirm('Supprimer cet article de la bibliothèque ?')) return;

		try {
			const res = await fetch(`/api/library?id=${articleId}`, {
				method: 'DELETE',
			});

			const data = await res.json();
			if (data.success) {
				toast.success('Article supprimé');
				await fetchData();
			} else {
				toast.error(data.error || 'Erreur');
			}
		} catch (error) {
			toast.error('Erreur réseau');
		}
	};

	// Gestion du Drag & Drop
	const onDragEnd = async (result: DropResult) => {
		const { destination, draggableId } = result;

		if (!destination || destination.droppableId === 'articles-list') return;

		const folderId = destination.droppableId === 'unorganized' ? null : destination.droppableId;

		// UI Optimiste
		const originalArticles = [...articles];
		setArticles(current =>
			current.map(a => a.id === draggableId ? { ...a, folderId } : a)
		);

		toast.loading("Mise à jour...", { id: 'move' });

		try {
			const res = await fetch('/api/library', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ articleId: draggableId, folderId }),
			});

			if (res.ok) {
				toast.success("Article déplacé !", { id: 'move' });
				fetchData();
			} else {
				throw new Error();
			}
		} catch (error) {
			setArticles(originalArticles);
			toast.error("Erreur lors du déplacement", { id: 'move' });
		}
	};

	// Filtrage des articles
	const filteredArticles = articles.filter(a => {
		const mSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
		const mFolder = selectedFolder === null ? true : selectedFolder === 'unorganized' ? !a.folderId : a.folderId === selectedFolder;
		return mSearch && mFolder;
	});

	if (loading) return (
		<div className="min-h-screen bg-slate-50 flex items-center justify-center">
			<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
		</div>
	);

	return (
		<DragDropContext onDragEnd={onDragEnd}>
			<div className="min-h-screen bg-slate-50 text-slate-900">

				{/* Header */}
				<div className="bg-white border-b border-slate-200 sticky top-0 z-20">
					<div className="max-w-7xl mx-auto px-6 py-6">
						<div className="flex items-center justify-between mb-6">
							<h1 className="text-3xl font-bold">Ma Collection</h1>
							<button
								onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
								className="p-2 text-slate-400 hover:text-black transition-colors"
							>
								{viewMode === 'grid' ? <List /> : <Grid3x3 />}
							</button>
						</div>
						<div className="relative">
							<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Rechercher un article..."
								className="w-full pl-12 pr-4 py-3 rounded-xl border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
							/>
						</div>
					</div>
				</div>

				<div className="max-w-7xl mx-auto px-6 py-8">

					{/* Section Articles à Organiser */}
					{bookmarksToOrganize.length > 0 && (
						<div className="mb-8">
							<button
								onClick={() => setShowBookmarksSection(!showBookmarksSection)}
								className="flex items-center gap-3 mb-4 text-slate-700 hover:text-slate-900 transition-colors"
							>
								<Star className="w-5 h-5 text-amber-500" fill="currentColor" />
								<h2 className="text-xl font-bold">Articles à organiser</h2>
								<span className="text-sm bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
									{bookmarksToOrganize.length}
								</span>
								{showBookmarksSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
							</button>

							{showBookmarksSection && (
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
									{bookmarksToOrganize.slice(0, 6).map(bookmark => (
										<div
											key={bookmark.id}
											className="bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 rounded-xl p-4 hover:shadow-lg transition-all"
										>
											<h3 className="font-bold text-slate-900 line-clamp-2 mb-2 text-sm">
												{bookmark.title}
											</h3>
											<p className="text-slate-600 text-xs line-clamp-1 mb-3">
												{bookmark.snippet}
											</p>
											<div className="flex gap-2">
												<button
													onClick={() => {
														setSelectedBookmark(bookmark);
														setShowAddToLibraryModal(true);
													}}
													className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
												>
													<FolderPlus className="w-3.5 h-3.5" />
													Organiser
												</button>
												<a
													href={bookmark.link}
													target="_blank"
													className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
												>
													<ExternalLink className="w-4 h-4" />
												</a>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					<div className="flex gap-8">
						{/* Sidebar avec Zones de Dépôt */}
						<aside className="w-64 flex-shrink-0 space-y-6">
							<button
								onClick={() => setShowNewFolderModal(true)}
								className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
							>
								<Plus className="w-5 h-5" /> Nouveau dossier
							</button>

							<div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
								<button
									onClick={() => setSelectedFolder(null)}
									className={`w-full px-4 py-3 text-left flex justify-between items-center transition-colors ${selectedFolder === null ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50'}`}
								>
									<div className="flex items-center gap-3"><Archive className="w-5 h-5" /><span>Tous</span></div>
									<span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{articles.length}</span>
								</button>

								{/* Zone de Drop : Sans Dossier */}
								<StrictModeDroppable droppableId="unorganized">
									{(provided, snapshot) => (
										<div ref={provided.innerRef} {...provided.droppableProps} className={`transition-colors ${snapshot.isDraggingOver ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset' : ''}`}>
											<button
												onClick={() => setSelectedFolder('unorganized')}
												className={`w-full px-4 py-3 text-left flex justify-between items-center border-t border-slate-100 ${selectedFolder === 'unorganized' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50'}`}
											>
												<div className="flex items-center gap-3"><Folder className="w-5 h-5" /><span>Sans dossier</span></div>
												<span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{articles.filter(a => !a.folderId).length}</span>
											</button>
											{provided.placeholder}
										</div>
									)}
								</StrictModeDroppable>

								{/* Zones de Drop : Les Dossiers */}
								{folders.map(folder => (
									<StrictModeDroppable droppableId={folder.id} key={folder.id}>
										{(provided, snapshot) => (
											<div ref={provided.innerRef} {...provided.droppableProps} className={`transition-colors ${snapshot.isDraggingOver ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset' : ''}`}>
												<button
													onClick={() => setSelectedFolder(folder.id)}
													className={`w-full px-4 py-3 text-left flex justify-between items-center border-t border-slate-100 ${selectedFolder === folder.id ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50'}`}
												>
													<div className="flex items-center gap-3 truncate pr-2">
														<Folder className="w-5 h-5 flex-shrink-0" style={{ color: folder.color || '#64748B' }} fill={snapshot.isDraggingOver ? folder.color || '' : 'transparent'} />
														<span className="truncate">{folder.name}</span>
													</div>
													<span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{folder._count?.articles || 0}</span>
												</button>
												{provided.placeholder}
											</div>
										)}
									</StrictModeDroppable>
								))}
							</div>
						</aside>

						{/* Main Content avec Éléments Déplaçables */}
						<main className="flex-1">
							<StrictModeDroppable droppableId="articles-list" direction={viewMode === 'grid' ? 'horizontal' : 'vertical'}>
								{(provided) => (
									<div ref={provided.innerRef} {...provided.droppableProps} className={viewMode === 'grid' ? "grid grid-cols-2 gap-6" : "flex flex-col gap-4"}>
										{filteredArticles.map((article, index) => (
											<Draggable key={article.id} draggableId={article.id} index={index}>
												{(provided, snapshot) => (
													<div
														ref={provided.innerRef}
														{...provided.draggableProps}
														{...provided.dragHandleProps}
														className={`bg-white rounded-2xl border p-6 transition-all ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-500 z-50 rotate-2 scale-105' : 'hover:shadow-md hover:border-blue-200'}`}
													>
														<div className="flex justify-between items-start mb-4">
															{article.folder && (
																<span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: `${article.folder.color}15`, color: article.folder.color || '#000' }}>
																	{article.folder.name}
																</span>
															)}
															<button onClick={() => deleteArticle(article.id)} className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors">
																<Trash2 className="w-4 h-4"/>
															</button>
														</div>
														<h3 className="font-bold text-slate-900 line-clamp-2 mb-2 leading-snug">{article.title}</h3>
														<p className="text-slate-500 text-sm line-clamp-2 mb-4">{article.snippet}</p>
														<div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-50">
															<span className="text-xs text-slate-400 font-medium">{new Date(article.savedAt).toLocaleDateString()}</span>
															<a href={article.link} target="_blank" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors">
																Ouvrir <ExternalLink className="w-3.5 h-3.5"/>
															</a>
														</div>
													</div>
												)}
											</Draggable>
										))}
										{provided.placeholder}
									</div>
								)}
							</StrictModeDroppable>
						</main>
					</div>
				</div>

				{/* Modal Nouveau Dossier */}
				{showNewFolderModal && (
					<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
						<div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
							<h3 className="text-xl font-bold mb-6 text-center">Créer un dossier</h3>
							<input
								type="text"
								value={newFolderName}
								onChange={(e) => setNewFolderName(e.target.value)}
								placeholder="Nom du dossier..."
								className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl mb-6 outline-none focus:border-blue-500 transition-colors"
								autoFocus
							/>
							<div className="flex justify-center gap-2 mb-8">
								{colors.map(c => (
									<button
										key={c}
										onClick={() => setNewFolderColor(c)}
										className={`w-8 h-8 rounded-full transition-transform ${newFolderColor === c ? 'ring-4 ring-slate-200 scale-125' : 'hover:scale-110'}`}
										style={{ backgroundColor: c }}
									/>
								))}
							</div>
							<div className="flex gap-3">
								<button
									onClick={() => setShowNewFolderModal(false)}
									className="flex-1 py-3 font-bold text-slate-500"
								>
									Annuler
								</button>
								<button
									onClick={createFolder}
									disabled={isCreating || !newFolderName.trim()}
									className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isCreating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Créer'}
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Modal Ajouter à la bibliothèque */}
				{showAddToLibraryModal && selectedBookmark && (
					<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
						<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
							<h3 className="text-xl font-bold mb-4">Organiser l'article</h3>
							<p className="text-slate-600 text-sm mb-6 line-clamp-2">{selectedBookmark.title}</p>

							<div className="space-y-2 max-h-96 overflow-y-auto mb-6">
								{/* Sans dossier */}
								<button
									onClick={() => addBookmarkToLibrary(selectedBookmark, null)}
									className="w-full px-4 py-3 text-left rounded-xl border-2 border-slate-200 hover:bg-slate-50 hover:border-blue-300 transition-all flex items-center gap-3"
								>
									<Folder className="w-5 h-5 text-slate-400" />
									<span className="font-medium text-slate-700">Sans dossier</span>
								</button>

								{/* Dossiers */}
								{folders.map(folder => (
									<button
										key={folder.id}
										onClick={() => addBookmarkToLibrary(selectedBookmark, folder.id)}
										className="w-full px-4 py-3 text-left rounded-xl border-2 border-slate-200 hover:bg-slate-50 hover:border-blue-300 transition-all flex items-center gap-3"
									>
										<Folder
											className="w-5 h-5"
											style={{ color: folder.color || '#64748B' }}
										/>
										<span className="font-medium text-slate-700">{folder.name}</span>
									</button>
								))}
							</div>

							<button
								onClick={() => {
									setShowAddToLibraryModal(false);
									setSelectedBookmark(null);
								}}
								className="w-full py-3 font-bold text-slate-500 hover:text-slate-700 transition-colors"
							>
								Annuler
							</button>
						</div>
					</div>
				)}
			</div>
		</DragDropContext>
	);
}