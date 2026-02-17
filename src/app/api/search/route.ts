// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';

// ─── Auteurs classiques en psychologie ───────────────────────────────────────
// Si la query contient un de ces noms, on désactive le filtre de date
const CLASSIC_AUTHORS = [
	'bowlby', 'freud', 'piaget', 'vygotsky', 'winnicott', 'erikson',
	'maslow', 'jung', 'skinner', 'pavlov', 'bandura', 'rogers',
	'lacan', 'klein', 'ainsworth', 'bronfenbrenner', 'seligman',
	'watzlawick', 'dolto', 'wallon', 'bion', 'kohut'
];

// ─── Détection de recherche classique ────────────────────────────────────────
function isClassicSearch(query: string): boolean {
	const q = query.toLowerCase();
	// Contient un auteur classique
	const hasClassicAuthor = CLASSIC_AUTHORS.some(author => q.includes(author));
	// Contient une année ancienne explicite (ex: "1969", "1950")
	const hasOldYear = /\b(19[0-7][0-9]|198[0-5])\b/.test(q);
	// Contient des mots-clés de théorie fondamentale
	const hasTheoryKeyword = /(théorie|theory|modèle|model|concept|paradigme)/.test(q);

	return hasClassicAuthor || hasOldYear || hasTheoryKeyword;
}

// ─── Construction de la query SerpAPI ───────────────────────────────────────
function buildScholarQuery(query: string, isClassic: boolean): string {
	if (isClassic) {
		// Pour les références classiques : pas de filtre de site ni de PDF
		// On cherche sur Google Scholar directement sans restriction
		return query;
	}

	// Pour les recherches récentes : on cible les bases SHS francophones
	// cairn.info exclu : articles payants
	return `${query} (site:researchgate.net OR site:hal.science OR site:erudit.org OR site:scholar.google.com)`;
}

export async function GET(request: NextRequest) {
	try {
		const apiKey = process.env.SERPAPI_KEY;
		const searchParams = request.nextUrl.searchParams;
		const query = searchParams.get('q');

		if (!query) {
			return NextResponse.json(
				{ error: 'Query parameter is required' },
				{ status: 400 }
			);
		}

		const classic = isClassicSearch(query);
		const scholarQuery = buildScholarQuery(query, classic);

		const url = new URL('https://serpapi.com/search');
		url.searchParams.append('engine', 'google_scholar');
		url.searchParams.append('q', scholarQuery);
		url.searchParams.append('api_key', apiKey!);
		url.searchParams.append('hl', 'fr');
		url.searchParams.append('num', '10'); // 10 résultats

		// ✅ Filtre de date uniquement pour les recherches récentes
		if (!classic) {
			url.searchParams.append('as_ylo', '2018');
		}

		const response = await fetch(url.toString());
		const data = await response.json();

		if (!data.organic_results) {
			return NextResponse.json({
				success: true,
				results: [],
				count: 0,
				searchType: classic ? 'classic' : 'recent',
			});
		}

		// ─── Transformation et enrichissement des résultats ──────────────────────
		const enhancedResults = data.organic_results.map((result: any) => ({
			title: result.title,
			link: result.link,
			snippet: result.publication_info?.summary || result.snippet || '',
			authors: result.publication_info?.authors
				?.map((a: any) => a.name)
				.join(', ') || '',
			year: extractYear(result.publication_info?.summary),
			pdfLink: result.resources?.[0]?.link || null,
			isFullText: !!result.resources?.[0]?.link,
			citedBy: result.inline_links?.cited_by?.total || 0,
			source:
				result.publication_info?.summary?.split('-')?.[1]?.trim() ||
				'Source académique',
			isClassic: classic,
		}));

		// ─── Tri : articles les plus cités en premier pour les classiques ─────────
		if (classic) {
			enhancedResults.sort(
				(a: any, b: any) => (b.citedBy || 0) - (a.citedBy || 0)
			);
		}

		return NextResponse.json({
			success: true,
			results: enhancedResults,
			count: data.search_information?.total_results,
			searchType: classic ? 'classic' : 'recent',
		});

	} catch (error: any) {
		console.error('Search error:', error);
		return NextResponse.json({ error: 'Search failed' }, { status: 500 });
	}
}

// ─── Utilitaire : extraire l'année depuis le résumé de publication ────────────
function extractYear(summary?: string): number | null {
	if (!summary) return null;
	const match = summary.match(/\b(19|20)\d{2}\b/);
	return match ? parseInt(match[0]) : null;
}