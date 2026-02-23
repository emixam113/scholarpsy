// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';

// ─── Cache en mémoire ─────────────────────────────────────────────────────────
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

function getCacheKey(query: string, page: number, classic: boolean) {
	return `${query.toLowerCase().trim()}_${page}_${classic}`;
}

// ─── Auteurs classiques en psychologie ───────────────────────────────────────
const CLASSIC_AUTHORS = [
	'bowlby', 'freud', 'piaget', 'vygotsky', 'winnicott', 'erikson',
	'maslow', 'jung', 'skinner', 'pavlov', 'bandura', 'rogers',
	'lacan', 'klein', 'ainsworth', 'bronfenbrenner', 'seligman',
	'watzlawick', 'dolto', 'wallon', 'bion', 'kohut', 'martinot'
];

function isClassicSearch(query: string): boolean {
	const q = query.toLowerCase();
	const hasClassicAuthor = CLASSIC_AUTHORS.some(author => q.includes(author));
	const hasOldYear = /\b(19[0-7][0-9]|198[0-5])\b/.test(q);
	const hasTheoryKeyword = /(théorie|theory|modèle|model|concept|paradigme)/.test(q);
	return hasClassicAuthor || hasOldYear || hasTheoryKeyword;
}

// ─── Semantic Scholar ─────────────────────────────────────────────────────────
async function searchSemanticScholar(query: string, classic: boolean, limit: number, offset: number) {
	try {
		const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search');
		url.searchParams.append('query', query);
		url.searchParams.append('limit', String(limit));
		url.searchParams.append('offset', String(offset));
		url.searchParams.append(
			'fields',
			'paperId,title,abstract,url,year,authors,citationCount,openAccessPdf,publicationTypes,publicationDate,journal,tldr'
		);

		if (!classic) {
			url.searchParams.append('year', '2018-');
		}

		const response = await fetch(url.toString(), {
			headers: { 'Content-Type': 'application/json' },
			next: { revalidate: 900 }, // Cache Next.js 15 min
		});

		if (!response.ok) {
			console.error('Semantic Scholar error:', response.status);
			return [];
		}

		const data = await response.json();
		if (!data.data || data.data.length === 0) return [];

		return data.data.map((paper: any) => ({
			paperId: paper.paperId,
			title: paper.title || 'Sans titre',
			link: paper.openAccessPdf?.url || paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
			snippet: paper.tldr?.text || paper.abstract || '',
			abstract: paper.abstract || '',
			authors: paper.authors?.map((a: any) => a.name).join(', ') || '',
			year: paper.year || null,
			journal: paper.journal?.name || null,
			pdfLink: paper.openAccessPdf?.url || null,
			isFullText: !!paper.openAccessPdf?.url,
			citedBy: paper.citationCount || 0,
			source: 'Semantic Scholar',
			isClassic: classic,
		}));
	} catch (error) {
		console.error('Semantic Scholar fetch error:', error);
		return [];
	}
}

// ─── OpenAlex ────────────────────────────────────────────────────────────────
async function searchOpenAlex(query: string, classic: boolean, limit: number, page: number) {
	try {
		const url = new URL('https://api.openalex.org/works');
		url.searchParams.append('search', query);
		url.searchParams.append('per-page', String(limit));
		url.searchParams.append('page', String(page));
		url.searchParams.append(
			'select',
			'id,title,abstract_inverted_index,publication_year,authorships,cited_by_count,open_access,doi,primary_location,type'
		);
		// Filtre de date uniquement, sans filtre concept qui cause des 400
		if (!classic) {
			url.searchParams.append('filter', 'publication_year:>2017');
		}
		url.searchParams.append('mailto', 'contact@scholarpsy.fr');

		const response = await fetch(url.toString(), {
			headers: { 'Content-Type': 'application/json' },
			next: { revalidate: 900 }, // Cache Next.js 15 min
		});

		if (!response.ok) {
			console.error('OpenAlex error:', response.status);
			return [];
		}

		const data = await response.json();
		if (!data.results || data.results.length === 0) return [];

		return data.results.map((work: any) => {
			let abstract = '';
			if (work.abstract_inverted_index) {
				const words: { [pos: number]: string } = {};
				for (const [word, positions] of Object.entries(work.abstract_inverted_index as Record<string, number[]>)) {
					for (const pos of positions) {
						words[pos] = word;
					}
				}
				abstract = Object.keys(words)
					.sort((a, b) => Number(a) - Number(b))
					.map(pos => words[Number(pos)])
					.join(' ');
			}

			const authors = work.authorships?.map((a: any) => a.author?.display_name).filter(Boolean).join(', ') || '';
			const pdfLink = work.open_access?.oa_url || null;
			const link = pdfLink || (work.doi ? `https://doi.org/${work.doi}` : null) || work.primary_location?.landing_page_url || work.id;

			return {
				paperId: work.id,
				title: work.title || 'Sans titre',
				link,
				snippet: abstract,
				abstract,
				authors,
				year: work.publication_year || null,
				journal: work.primary_location?.source?.display_name || null,
				pdfLink,
				isFullText: !!pdfLink,
				citedBy: work.cited_by_count || 0,
				source: 'OpenAlex',
				isClassic: classic,
			};
		});
	} catch (error) {
		console.error('OpenAlex fetch error:', error);
		return [];
	}
}

// ─── Déduplication par titre ──────────────────────────────────────────────────
function deduplicateResults(results: any[]) {
	const seen = new Set<string>();
	return results.filter(r => {
		const key = r.title.toLowerCase().trim().slice(0, 60);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

// ─── Handler principal ────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const query = searchParams.get('q');
		const page = parseInt(searchParams.get('page') || '1');
		const limit = 8;
		const offset = (page - 1) * limit;

		if (!query) {
			return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
		}

		const classic = isClassicSearch(query);
		const cacheKey = getCacheKey(query, page, classic);

		// ─── Vérification du cache ────────────────────────────────────────────
		const cached = cache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
			console.log('✅ Cache hit:', cacheKey);
			return NextResponse.json({ ...cached.data, fromCache: true });
		}

		console.log('🔍 Cache miss, fetching:', cacheKey);

		// Lancer les deux APIs en parallèle
		const [semanticResults, openAlexResults] = await Promise.all([
			searchSemanticScholar(query, classic, limit, offset),
			searchOpenAlex(query, classic, limit, page),
		]);

		// Fusionner et dédupliquer
		let merged = deduplicateResults([...semanticResults, ...openAlexResults]);
		merged = merged.filter(r => r.title && r.link && r.link !== '#');

		// Tri pour les classiques : citations en premier
		if (classic) {
			merged.sort((a, b) => (b.citedBy || 0) - (a.citedBy || 0));
		}

		const responseData = {
			success: true,
			results: merged,
			count: merged.length,
			page,
			hasMore: merged.length >= limit,
			searchType: classic ? 'classic' : 'recent',
			sources: {
				semanticScholar: semanticResults.length,
				openAlex: openAlexResults.length,
			},
		};

		// Mise en cache
		cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

		// Nettoyage du cache si trop grand
		if (cache.size > 200) {
			const firstKey = cache.keys().next().value;
			if (firstKey) cache.delete(firstKey);
		}

		return NextResponse.json(responseData);

	} catch (error: any) {
		console.error('Search error:', error);
		return NextResponse.json({ error: 'Search failed' }, { status: 500 });
	}
}