import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// ✅ Mock de fetch global — la route appelle fetch() directement
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ✅ Mock de la variable d'environnement SerpAPI
vi.stubEnv('SERPAPI_KEY', 'test-api-key');

// ─── Données de test ─────────────────────────────────────────────────────────

const mockSerpApiResponse = {
	organic_results: [
		{
			title: 'Thérapie cognitive et comportementale',
			link: 'https://researchgate.net/article-1',
			publication_info: {
				summary: 'Journal of Psychology - 2022',
				authors: [
					{ name: 'Jean Dupont' },
					{ name: 'Marie Martin' },
				],
			},
			resources: [
				{ link: 'https://researchgate.net/article-1.pdf' },
			],
		},
		{
			title: 'Psychologie clinique appliquée',
			link: 'https://hal.science/article-2',
			publication_info: {
				summary: 'Revue francophone - 2021',
				authors: [
					{ name: 'Sophie Bernard' },
				],
			},
			resources: [],
		},
	],
	search_information: {
		total_results: 2,
	},
};

// Helper pour créer une NextRequest
const makeRequest = (url: string) => new NextRequest(url);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('API /api/search', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ── Validation des paramètres ─────────────────────────────────────────────

	describe('validation du paramètre q', () => {
		it('devrait retourner 400 si le paramètre q est absent', async () => {
			const response = await GET(makeRequest('http://localhost/api/search'));
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('Query parameter is required');
			// fetch ne doit pas être appelé si la query est absente
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('devrait retourner 400 si le paramètre q est une chaîne vide', async () => {
			const response = await GET(makeRequest('http://localhost/api/search?q='));
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe('Query parameter is required');
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	// ── Succès ───────────────────────────────────────────────────────────────

	describe('GET succès', () => {
		it('devrait retourner les résultats transformés avec succès', async () => {
			mockFetch.mockResolvedValueOnce({
				json: async () => mockSerpApiResponse,
			});

			const response = await GET(makeRequest('http://localhost/api/search?q=therapie+cognitive'));
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.results).toHaveLength(2);
			expect(data.count).toBe(2);
		});

		it('devrait correctement transformer le premier résultat', async () => {
			mockFetch.mockResolvedValueOnce({
				json: async () => mockSerpApiResponse,
			});

			const response = await GET(makeRequest('http://localhost/api/search?q=therapie'));
			const data = await response.json();

			const firstResult = data.results[0];
			expect(firstResult.title).toBe('Thérapie cognitive et comportementale');
			expect(firstResult.link).toBe('https://researchgate.net/article-1');
			expect(firstResult.snippet).toBe('Journal of Psychology - 2022');
			expect(firstResult.authors).toBe('Jean Dupont, Marie Martin');
			expect(firstResult.pdfLink).toBe('https://researchgate.net/article-1.pdf');
			expect(firstResult.isFullText).toBe(true);
		});

		it('devrait retourner pdfLink null et isFullText false si pas de ressource PDF', async () => {
			mockFetch.mockResolvedValueOnce({
				json: async () => mockSerpApiResponse,
			});

			const response = await GET(makeRequest('http://localhost/api/search?q=psychologie'));
			const data = await response.json();

			const secondResult = data.results[1];
			expect(secondResult.pdfLink).toBeNull();
			expect(secondResult.isFullText).toBe(false);
		});

		it('devrait appeler SerpAPI avec les bons paramètres', async () => {
			mockFetch.mockResolvedValueOnce({
				json: async () => mockSerpApiResponse,
			});

			await GET(makeRequest('http://localhost/api/search?q=depression'));

			expect(mockFetch).toHaveBeenCalledOnce();

			const calledUrl = mockFetch.mock.calls[0][0] as string;
			expect(calledUrl).toContain('engine=google_scholar');
			expect(calledUrl).toContain('depression');
			expect(calledUrl).toContain('api_key=test-api-key');
			expect(calledUrl).toContain('hl=fr');
			expect(calledUrl).toContain('as_ylo=2018');
		});

		it('devrait inclure les sites SHS dans la query envoyée à SerpAPI', async () => {
			mockFetch.mockResolvedValueOnce({
				json: async () => mockSerpApiResponse,
			});

			await GET(makeRequest('http://localhost/api/search?q=anxiete'));

			const calledUrl = mockFetch.mock.calls[0][0] as string;
			expect(calledUrl).toContain('researchgate.net');
			expect(calledUrl).toContain('hal.science');
			expect(calledUrl).toContain('cairn.info');
			expect(calledUrl).toContain('erudit.org');
		});

		it('devrait retourner une liste vide si organic_results est absent', async () => {
			mockFetch.mockResolvedValueOnce({
				json: async () => ({ search_information: { total_results: 0 } }),
			});

			const response = await GET(makeRequest('http://localhost/api/search?q=rien'));
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.results).toBeUndefined();
			expect(data.count).toBe(0);
		});
	});

	// ── Gestion des erreurs ───────────────────────────────────────────────────

	describe('gestion des erreurs', () => {
		it('devrait retourner 500 si fetch lève une exception réseau', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			const response = await GET(makeRequest('http://localhost/api/search?q=test'));
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe('Search failed');
		});

		it('devrait retourner 500 si la réponse SerpAPI ne peut pas être parsée', async () => {
			mockFetch.mockResolvedValueOnce({
				json: async () => { throw new Error('Invalid JSON'); },
			});

			const response = await GET(makeRequest('http://localhost/api/search?q=test'));
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe('Search failed');
		});
	});
});