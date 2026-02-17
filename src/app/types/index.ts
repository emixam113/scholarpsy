// User types
export interface User {
	id: string;
	name: string | null;
	email: string;
	image?: string | null;
	emailVerified?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

// Bookmark types
export interface Bookmark {
	id: string;
	title: string;
	link: string;
	snippet: string | null;
	userId: string;
	createdAt: Date;
}

// API response wrapper
export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

// Profile data structure
export interface ProfileData {
	user: {
		id: string;
		name: string | null;
		email: string;
		image?: string | null;
		emailVerified?: Date | null;
		createdAt: Date;
		updatedAt: Date;
		bookmarksCount: number;
	};
	recentBookmarks: Bookmark[];
}

// Google Scholar search result
export interface ScholarResult {
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