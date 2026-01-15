// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
	try {
		const apiKey = process.env.SERPAPI_KEY;
		const searchParams = request.nextUrl.searchParams;
		const query = searchParams.get('q');

		if (!query) {
			return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
		}

		// Stratégie "Alternative" : On cible les bases de données SHS (Sciences Humaines et Sociales)
		// On exclut les résultats trop commerciaux et on priorise les PDF
		const scholarQuery = `${query} (site:researchgate.net OR site:hal.science OR site:cairn.info OR site:erudit.org) filetype:pdf`;

		const url = new URL('https://serpapi.com/search');
		url.searchParams.append('engine', 'google_scholar');
		url.searchParams.append('q', scholarQuery);
		url.searchParams.append('api_key', apiKey!);
		url.searchParams.append('hl', 'fr'); // Priorité au français
		url.searchParams.append('as_ylo', '2018'); // Uniquement les recherches récentes (5 dernières années)

		const response = await fetch(url.toString());
		const data = await response.json();

		// ✅ FILTRAGE INTELLIGENT DES RÉSULTATS
		const enhancedResults = data.organic_results?.map((result: any) => ({
			title: result.title,
			link: result.link,
			snippet: result.publication_info?.summary,
			authors: result.publication_info?.authors?.map((a: any) => a.name).join(', '),
			// On détecte si un accès direct au PDF est disponible
			pdfLink: result.resources?.[0]?.link || null,
			isFullText: !!result.resources?.[0]?.link,
			source: result.publication_info?.summary?.split('-')?.[1]?.trim() || "Source académique"
		}));

		return NextResponse.json({
			success: true,
			results: enhancedResults,
			count: data.search_information?.total_results
		});

	} catch (error: any) {
		return NextResponse.json({ error: 'Search failed' }, { status: 500 });
	}
}