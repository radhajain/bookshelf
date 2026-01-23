// Article data types for the application

export interface Article {
	id: string;
	title: string;
	author?: string;
	publication?: string;
	publicationDate?: string;
	articleUrl: string;
	genre: string;
	notes?: string;
	priority?: string;
	read?: boolean;
	readAt?: string;
}

export interface ArticleWithDetails extends Article {
	description?: string;
	thumbnailImage?: string;
	section?: string;
	readingTimeMinutes?: number;
	wordCount?: number;
	subjects?: string[];
	detailsFetchedAt?: string;
}

// Supported publications with their configurations
export const PUBLICATION_CONFIGS: Record<
	string,
	{
		name: string;
		domain: string[];
		color: string;
		rssUrl?: string;
	}
> = {
	nyt: {
		name: 'The New York Times',
		domain: ['nytimes.com', 'www.nytimes.com', 'nyti.ms'],
		color: '#000000',
	},
	ft: {
		name: 'Financial Times',
		domain: ['ft.com', 'www.ft.com'],
		color: '#FFF1E5',
	},
	substack: {
		name: 'Substack',
		domain: ['.substack.com'],
		color: '#FF6719',
	},
};

// Detect publication from URL
export function detectPublication(url: string): string | null {
	try {
		const urlObj = new URL(url);
		const hostname = urlObj.hostname.toLowerCase();

		// Check for Substack first (domain pattern match)
		if (hostname.endsWith('.substack.com')) {
			// Extract the Substack name from the subdomain
			const substackName = hostname.replace('.substack.com', '');
			return `${substackName} (Substack)`;
		}

		// Check other publications
		for (const [, config] of Object.entries(PUBLICATION_CONFIGS)) {
			for (const domain of config.domain) {
				if (domain.startsWith('.')) {
					// Pattern match (e.g., ".substack.com")
					if (hostname.endsWith(domain)) {
						return config.name;
					}
				} else {
					// Exact match
					if (hostname === domain || hostname === `www.${domain}`) {
						return config.name;
					}
				}
			}
		}

		return null;
	} catch {
		return null;
	}
}

// Get publication key from name
export function getPublicationKey(publicationName: string): string | null {
	if (publicationName.includes('Substack')) {
		return 'substack';
	}

	for (const [key, config] of Object.entries(PUBLICATION_CONFIGS)) {
		if (config.name === publicationName) {
			return key;
		}
	}
	return null;
}

// Format reading time
export function formatReadingTime(minutes?: number): string {
	if (!minutes) return '';
	if (minutes < 1) return '< 1 min read';
	if (minutes === 1) return '1 min read';
	return `${minutes} min read`;
}

// Format publication date
export function formatPublicationDate(dateStr?: string): string {
	if (!dateStr) return '';
	try {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	} catch {
		return dateStr;
	}
}

// Get the primary section/category from an article
export function getPrimarySection(section?: string): string {
	if (!section) return 'Uncategorized';
	return section;
}
