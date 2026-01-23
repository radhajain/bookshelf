import { Article, ArticleWithDetails, detectPublication } from './articles';

// Article search result interface
export interface ArticleSearchResult {
	title: string;
	author?: string;
	publication?: string;
	publicationDate?: string;
	articleUrl: string;
	thumbnailImage?: string;
	description?: string;
	section?: string;
	wordCount?: number;
	subjects?: string[];
}

// NY Times API response types
interface NYTArticleResult {
	headline: { main: string; kicker?: string; print_headline?: string };
	abstract: string;
	snippet?: string;
	web_url: string;
	pub_date: string;
	byline?: { original: string };
	section_name?: string;
	news_desk?: string;
	multimedia?: {
		caption?: string;
		credit?: string;
		default?: { url: string; height: number; width: number };
		thumbnail?: { url: string; height: number; width: number };
	};
	keywords?: Array<{ name: string; value: string; rank: number }>;
	word_count?: number;
	type_of_material?: string;
	source?: string;
}

interface NYTSearchResponse {
	response: {
		docs: NYTArticleResult[];
	};
}

// In-memory cache to avoid repeated fetches
const cache = new Map<string, ArticleWithDetails>();

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 200; // 200ms between requests

async function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Custom error for rate limiting
export class RateLimitError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'RateLimitError';
	}
}

async function rateLimitedFetch(
	url: string,
	headers?: Record<string, string>,
): Promise<Response | null> {
	const now = Date.now();
	const timeSinceLastRequest = now - lastRequestTime;

	if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
		await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
	}

	lastRequestTime = Date.now();

	try {
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'JackBookshelf/1.0',
				Accept:
					'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.5',
				...headers,
			},
		});

		if (response.status === 429) {
			throw new RateLimitError(
				'Rate limited by API. Please wait before continuing.',
			);
		}

		if (response.status >= 500) {
			console.error(`Server error (${response.status}) for ${url}`);
			return null;
		}

		return response;
	} catch (error) {
		if (error instanceof RateLimitError) {
			throw error;
		}
		console.error(`Network error for ${url}:`, error);
		throw new RateLimitError(
			'Network error. Please check your connection and try again.',
		);
	}
}

// Extract Open Graph metadata from a URL (fallback method)
export async function extractOpenGraphMetadata(
	url: string,
): Promise<ArticleSearchResult | null> {
	try {
		const response = await rateLimitedFetch(url);
		if (!response) {
			console.log(`No response from ${url}`);
			return null;
		}
		if (!response.ok) {
			console.log(
				`Non-OK response from ${url}: ${response.status} ${response.statusText}`,
			);
			return null;
		}

		const html = await response.text();

		// Parse Open Graph tags
		const getMetaContent = (property: string): string | undefined => {
			// Try og: prefix
			let match = html.match(
				new RegExp(
					`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`,
					'i',
				),
			);
			if (match) return match[1];

			// Try name attribute
			match = html.match(
				new RegExp(
					`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`,
					'i',
				),
			);
			if (match) return match[1];

			// Try reversed attribute order
			match = html.match(
				new RegExp(
					`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${property}["']`,
					'i',
				),
			);
			if (match) return match[1];

			return undefined;
		};

		// Extract title
		let title = getMetaContent('title');
		if (!title) {
			const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
			title = titleMatch?.[1];
		}

		if (!title) return null;

		// Extract other metadata
		const description = getMetaContent('description');
		const thumbnailImage = getMetaContent('image');
		const siteName = getMetaContent('site_name');
		const publication = detectPublication(url) || siteName;

		// Try to extract author
		let author: string | undefined;
		const authorMatch = html.match(
			/<meta[^>]*name=["']author["'][^>]*content=["']([^"']*)["']/i,
		);
		if (authorMatch) author = authorMatch[1];

		// Try to extract publication date
		let publicationDate: string | undefined;
		const dateMatch = html.match(
			/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']*)["']/i,
		);
		if (dateMatch) publicationDate = dateMatch[1];

		// Try to extract section
		let section: string | undefined;
		const sectionMatch = html.match(
			/<meta[^>]*property=["']article:section["'][^>]*content=["']([^"']*)["']/i,
		);
		if (sectionMatch) section = sectionMatch[1];

		return {
			title: decodeHTMLEntities(title),
			author: author ? decodeHTMLEntities(author) : undefined,
			publication,
			publicationDate,
			articleUrl: url,
			thumbnailImage,
			description: description ? decodeHTMLEntities(description) : undefined,
			section,
		};
	} catch (error) {
		console.error(`Error extracting metadata from ${url}:`, error);
		return null;
	}
}

// Helper function to decode HTML entities
function decodeHTMLEntities(text: string): string {
	const entities: Record<string, string> = {
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&#39;': "'",
		'&apos;': "'",
		'&#x27;': "'",
		'&nbsp;': ' ',
		'&#8217;': "'",
		'&#8216;': "'",
		'&#8220;': '"',
		'&#8221;': '"',
		'&#8212;': '—',
		'&#8211;': '–',
	};

	let decoded = text;
	for (const [entity, char] of Object.entries(entities)) {
		decoded = decoded.replace(new RegExp(entity, 'g'), char);
	}

	// Handle numeric entities
	decoded = decoded.replace(/&#(\d+);/g, (_, num) =>
		String.fromCharCode(parseInt(num, 10)),
	);
	decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
		String.fromCharCode(parseInt(hex, 16)),
	);

	return decoded;
}

// Helper to convert NYT API result to ArticleSearchResult
function nytArticleToSearchResult(
	article: NYTArticleResult,
): ArticleSearchResult {
	// Extract author from byline
	let author = article.byline?.original;
	if (author?.startsWith('By ')) {
		author = author.slice(3);
	}

	// Get thumbnail image - multimedia has default and thumbnail as direct objects
	let thumbnailImage: string | undefined;
	if (article.multimedia) {
		// Prefer default (larger) image, fall back to thumbnail
		const imageUrl =
			article.multimedia.default?.url || article.multimedia.thumbnail?.url;
		if (imageUrl) {
			thumbnailImage = imageUrl;
		}
	}

	// Extract subjects from keywords (filter by name === 'subject')
	let subjects: string[] | undefined;
	if (article.keywords && article.keywords.length > 0) {
		const subjectKeywords = article.keywords
			.filter((kw) => kw.name.toLowerCase() === 'subject')
			.map((kw) => kw.value);
		if (subjectKeywords.length > 0) {
			subjects = subjectKeywords;
		}
	}

	return {
		title: article.headline.main,
		author,
		publication: 'The New York Times',
		publicationDate: article.pub_date,
		articleUrl: article.web_url,
		thumbnailImage,
		description: article.abstract,
		section: article.section_name,
		wordCount: article.word_count,
		subjects,
	};
}

// Lookup a specific NYT article by URL using the Article Search API
export async function lookupNYTArticleByUrl(
	articleUrl: string,
): Promise<ArticleSearchResult | null> {
	const apiKey = process.env.NYT_API_KEY;
	if (!apiKey) {
		console.log('NYT_API_KEY not configured, cannot lookup NYT article');
		return null;
	}

	try {
		// First, try extracting keywords from the URL and searching
		// URL pattern: /YYYY/MM/DD/section/slug.html
		const urlMatch = articleUrl.match(
			/nytimes\.com\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/([^.]+)/,
		);
		if (urlMatch) {
			const slug = urlMatch[1].replace(/-/g, ' ');
			const searchUrl = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${encodeURIComponent(slug)}&api-key=${apiKey}`;
			const searchResponse = await rateLimitedFetch(searchUrl);
			if (searchResponse?.ok) {
				const searchData: NYTSearchResponse = await searchResponse.json();
				// Find the article that matches the URL
				const matchingArticle = searchData.response?.docs.find(
					(a) => a.web_url === articleUrl || a.web_url.includes(urlMatch[1]),
				);
				if (matchingArticle) {
					return nytArticleToSearchResult(matchingArticle);
				}
				// If no exact match but we got results, return the first one
				if (searchData.response?.docs.length > 0) {
					return nytArticleToSearchResult(searchData.response.docs[0]);
				}
			}
		}
		return null;
	} catch (error) {
		console.error(`Error looking up NYT article for "${articleUrl}":`, error);
		return null;
	}
}

// Search NY Times articles
export async function searchNYTArticles(
	query: string,
): Promise<ArticleSearchResult[]> {
	const apiKey = process.env.NYT_API_KEY;
	if (!apiKey) {
		console.log('NYT_API_KEY not configured, skipping NYT search');
		return [];
	}

	try {
		const url = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${encodeURIComponent(query)}&api-key=${apiKey}`;
		const response = await rateLimitedFetch(url);
		if (!response || !response.ok) return [];

		const data: NYTSearchResponse = await response.json();
		const articles = data.response?.docs || [];

		return articles.slice(0, 10).map(nytArticleToSearchResult);
	} catch (error) {
		console.error(`Error searching NYT for "${query}":`, error);
		return [];
	}
}

// Parse article URL and extract metadata
export async function parseArticleUrl(
	url: string,
): Promise<ArticleSearchResult | null> {
	console.log(`Parsing article URL: ${url}`);
	// Validate URL
	try {
		new URL(url);
	} catch (error) {
		console.error(`Invalid URL: ${url}. Error: ${error}`);
		return null;
	}

	// Detect publication
	const publication = detectPublication(url);

	// For NY Times, use the Article Search API first (more reliable than scraping)
	if (publication === 'The New York Times') {
		const nytMetadata = await lookupNYTArticleByUrl(url);
		if (nytMetadata) {
			return nytMetadata;
		}
		// Fall through to OG extraction if API fails
	}

	// For all publications, use Open Graph metadata extraction
	// This works well for most news sites as they typically have good OG tags
	const metadata = await extractOpenGraphMetadata(url);

	if (metadata) {
		// Override publication if we detected it
		if (publication && !metadata.publication) {
			metadata.publication = publication;
		}
		return metadata;
	}

	// If metadata extraction failed, try to extract info from URL structure
	const extractedInfo = extractInfoFromUrl(url);

	return {
		title: extractedInfo.title || 'Unknown Article',
		articleUrl: url,
		publication: publication || 'Unknown',
		publicationDate: extractedInfo.date,
		section: extractedInfo.section,
	};
}

// Helper to extract article info from URL patterns
function extractInfoFromUrl(url: string): {
	title?: string;
	date?: string;
	section?: string;
} {
	try {
		const urlObj = new URL(url);
		const pathname = urlObj.pathname;

		// Common URL patterns:
		// /section/YYYY/MM/DD/slug
		// /YYYY/MM/DD/section/slug
		// /section/slug

		// Try to extract date from path (YYYY/MM/DD pattern)
		const dateMatch = pathname.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
		let date: string | undefined;
		if (dateMatch) {
			date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
		}

		// Get the last path segment as the slug
		const segments = pathname
			.split('/')
			.filter((s) => s && !s.match(/^\d{4}$/) && !s.match(/^\d{2}$/));
		const slug = segments[segments.length - 1];

		// Try to get section (usually the segment before the slug, after date)
		let section: string | undefined;
		if (segments.length >= 2) {
			const potentialSection = segments[segments.length - 2];
			// Only use as section if it's not a common non-section path like 'article' or 'story'
			if (
				!['article', 'story', 'post', 'p', 'a'].includes(
					potentialSection.toLowerCase(),
				)
			) {
				section = potentialSection
					.split('-')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ');
			}
		}

		// Convert slug to title
		let title: string | undefined;
		if (slug && slug !== 'index.html') {
			// Remove file extension if present
			const cleanSlug = slug.replace(/\.(html?|php|aspx?)$/i, '');
			// Convert dashes/underscores to spaces and title case
			title = cleanSlug
				.replace(/[-_]/g, ' ')
				.split(' ')
				.map(
					(word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
				)
				.join(' ');
		}

		return { title, date, section };
	} catch {
		return {};
	}
}

// Main function to fetch article details
export async function fetchArticleDetails(
	article: Article,
): Promise<ArticleWithDetails> {
	const cacheKey = article.articleUrl;

	if (cache.has(cacheKey)) {
		return cache.get(cacheKey)!;
	}

	// Try to fetch fresh metadata from URL
	const metadata = await parseArticleUrl(article.articleUrl);

	// Calculate reading time from word count (~200 words per minute)
	let readingTimeMinutes: number | undefined;
	if (metadata?.wordCount) {
		readingTimeMinutes = Math.ceil(metadata.wordCount / 200);
	}

	const articleWithDetails: ArticleWithDetails = {
		...article,
		title: metadata?.title || article.title,
		author: metadata?.author || article.author,
		publication: metadata?.publication || article.publication,
		publicationDate: metadata?.publicationDate || article.publicationDate,
		description: metadata?.description,
		thumbnailImage: metadata?.thumbnailImage,
		section: metadata?.section,
		wordCount: metadata?.wordCount,
		subjects: metadata?.subjects,
		readingTimeMinutes,
		detailsFetchedAt: new Date().toISOString(),
	};

	cache.set(cacheKey, articleWithDetails);
	return articleWithDetails;
}

// Fetch details for multiple articles with batching
export async function fetchArticlesDetails(
	articles: Article[],
): Promise<ArticleWithDetails[]> {
	const results: ArticleWithDetails[] = [];
	const BATCH_SIZE = 3;

	for (let i = 0; i < articles.length; i += BATCH_SIZE) {
		const batch = articles.slice(i, i + BATCH_SIZE);
		const batchResults = await Promise.all(
			batch.map((article) => fetchArticleDetails(article)),
		);
		results.push(...batchResults);
	}

	return results;
}

// Search articles and return results for selection
export async function searchArticlesForSelection(
	query: string,
	publication?: string,
): Promise<ArticleSearchResult[]> {
	const results: ArticleSearchResult[] = [];

	// If it looks like a URL, try to parse it directly
	if (query.startsWith('http://') || query.startsWith('https://')) {
		const parsed = await parseArticleUrl(query);
		if (parsed) {
			return [parsed];
		}
	}

	// Search NYT if no specific publication or if NYT is selected
	if (!publication || publication === 'The New York Times') {
		const nytResults = await searchNYTArticles(query);
		results.push(...nytResults);
	}

	// For other publications, we rely on URL-based adding since they don't have public APIs
	// Return what we have
	return results;
}
