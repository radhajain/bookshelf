'use client';

interface SkeletonCardProps {
	variant?: 'book' | 'movie' | 'podcast';
}

export default function SkeletonCard({ variant = 'book' }: SkeletonCardProps) {
	// Color variants for the type badge
	const badgeColors = {
		book: 'bg-amber-200',
		movie: 'bg-blue-200',
		podcast: 'bg-purple-200',
	};

	const coverColors = {
		book: 'from-amber-100 to-amber-50',
		movie: 'from-blue-100 to-blue-50',
		podcast: 'from-purple-100 to-purple-50',
	};

	return (
		<div className="relative flex flex-col bg-white rounded-lg shadow-md overflow-hidden border border-zinc-100">
			{/* Cover Skeleton - responsive height */}
			<div
				className={`relative h-64 sm:h-80 lg:h-96 bg-gradient-to-br ${coverColors[variant]} flex items-center justify-center overflow-hidden`}
			>
				{/* Shimmer animation */}
				<div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

				{/* Type Badge Skeleton */}
				<div className="absolute top-2 left-2">
					<div
						className={`h-4 sm:h-5 w-10 sm:w-12 ${badgeColors[variant]} rounded-full animate-pulse`}
					/>
				</div>

				{/* Icon placeholder */}
				<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/30 animate-pulse" />
			</div>

			{/* Info Skeleton - responsive padding */}
			<div className="flex flex-col flex-1 p-3 sm:p-4">
				{/* Title skeleton */}
				<div className="h-3.5 sm:h-4 bg-zinc-200 rounded w-3/4 mb-1.5 sm:mb-2 animate-pulse" />
				<div className="h-3.5 sm:h-4 bg-zinc-200 rounded w-1/2 mb-2 sm:mb-3 animate-pulse" />

				{/* Author skeleton */}
				<div className="h-2.5 sm:h-3 bg-zinc-100 rounded w-1/3 mb-2 sm:mb-3 animate-pulse" />

				{/* Ratings skeleton */}
				<div className="space-y-1 sm:space-y-1.5 mb-2 sm:mb-3">
					<div className="h-2.5 sm:h-3 bg-zinc-100 rounded w-20 animate-pulse" />
					<div className="h-2.5 sm:h-3 bg-zinc-100 rounded w-16 animate-pulse" />
				</div>

				{/* Description skeleton - hidden on very small screens */}
				<div className="flex-1 space-y-1 sm:space-y-1.5 hidden xs:block">
					<div className="h-2.5 sm:h-3 bg-zinc-100 rounded w-full animate-pulse" />
					<div className="h-2.5 sm:h-3 bg-zinc-100 rounded w-5/6 animate-pulse" />
					<div className="h-2.5 sm:h-3 bg-zinc-100 rounded w-4/6 animate-pulse" />
				</div>

				{/* Footer skeleton */}
				<div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-zinc-100 flex gap-2">
					<div className="h-4 sm:h-5 w-14 sm:w-16 bg-zinc-100 rounded animate-pulse" />
					<div className="h-4 sm:h-5 w-16 sm:w-20 bg-zinc-100 rounded animate-pulse" />
				</div>
			</div>
		</div>
	);
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
	// Create a mix of book, movie, and podcast skeletons for variety
	const variants: ('book' | 'movie' | 'podcast')[] = [
		'book',
		'book',
		'movie',
		'book',
		'podcast',
		'book',
		'movie',
		'podcast',
	];

	// Show fewer skeleton cards on mobile for better UX
	const mobileCount = Math.min(count, 4);

	return (
		<div className="space-y-6 sm:space-y-8">
			{/* Genre section skeleton */}
			<section>
				{/* Genre header skeleton */}
				<div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b-2 border-zinc-200">
					<div className="h-5 sm:h-6 w-24 sm:w-32 bg-zinc-200 rounded animate-pulse" />
					<div className="h-5 sm:h-6 w-6 sm:w-8 bg-zinc-100 rounded-full animate-pulse" />
				</div>

				{/* Cards grid - responsive columns and gap */}
				<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
					{/* Show fewer cards on mobile */}
					{Array.from({ length: count }).map((_, i) => (
						<div
							key={i}
							className={i >= mobileCount ? 'hidden sm:block' : ''}
						>
							<SkeletonCard variant={variants[i % variants.length]} />
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
