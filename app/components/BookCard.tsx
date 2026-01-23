'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BookWithDetails, RatingSource } from '../lib/books';

interface BookCardProps {
	book: BookWithDetails;
	onClick: () => void;
}

function MiniRating({ rating }: { rating: RatingSource }) {
	if (!rating.rating) return null;

	const sourceLabels: Record<string, string> = {
		'Google Books': 'Google',
		'Open Library': 'OpenLib',
		Goodreads: 'GR',
		Amazon: 'AMZ',
	};

	return (
		<div className="flex items-center gap-1">
			<span className="text-[10px] text-zinc-400 font-medium">
				{sourceLabels[rating.source] || rating.source}:
			</span>
			<svg
				className="w-3 h-3 text-amber-400"
				fill="currentColor"
				viewBox="0 0 20 20"
			>
				<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
			</svg>
			<span className="text-xs text-zinc-600 font-medium">
				{rating.rating.toFixed(1)}
			</span>
		</div>
	);
}

export default function BookCard({ book, onClick }: BookCardProps) {
	const [imageError, setImageError] = useState(false);

	// Get ratings that have actual values
	const ratingsWithData = book.ratings.filter((r) => r.rating);

	// Truncate description
	const truncatedDescription = book.description
		? book.description.length > 100
			? book.description.slice(0, 100).trim() + '...'
			: book.description
		: null;

	return (
		<div
			onClick={onClick}
			className="group relative flex flex-col bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-zinc-100 cursor-pointer hover:-translate-y-1"
		>
			{/* Book Cover - responsive height */}
			<div className="relative h-48 sm:h-64 md:h-80 lg:h-96 bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center overflow-hidden">
				{book.coverImage && !imageError ? (
					<Image
						src={book.coverImage}
						alt={`Cover of ${book.title}`}
						fill
						className="object-cover group-hover:scale-105 transition-transform duration-300"
						onError={() => setImageError(true)}
						sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
					/>
				) : (
					<div className="absolute inset-0 bg-white flex items-center justify-center p-4 sm:p-6">
						<h3 className="font-serif text-sm sm:text-base lg:text-lg text-zinc-800 text-center leading-snug line-clamp-4">
							{book.title}
						</h3>
					</div>
				)}

				{/* Click indicator - hidden on mobile, shown on hover for desktop */}
				<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors hidden sm:flex items-center justify-center">
					<span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-zinc-700 shadow">
						View Details
					</span>
				</div>

				{/* Type Badge - smaller on mobile */}
				<div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
					<span className="px-1.5 sm:px-2 py-0.5 bg-amber-500 text-white text-[10px] sm:text-xs font-medium rounded-full">
						Book
					</span>
				</div>
			</div>

			{/* Book Info - responsive padding */}
			<div className="flex flex-col flex-1 p-2.5 sm:p-3 lg:p-4">
				{/* Title */}
				<h3 className="font-semibold text-zinc-900 text-xs sm:text-sm leading-tight mb-0.5 sm:mb-1 line-clamp-2">
					{book.title}
				</h3>

				{/* Author */}
				{book.author ? (
					<p className="text-[10px] sm:text-xs text-zinc-500 mb-1.5 sm:mb-2 truncate">by {book.author}</p>
				) : book.needsAuthorClarification ? (
					<p className="text-[10px] sm:text-xs text-amber-600 mb-1.5 sm:mb-2 flex items-center gap-1">
						<svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20">
							<path
								fillRule="evenodd"
								d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
								clipRule="evenodd"
							/>
						</svg>
						<span className="hidden sm:inline">Author needed</span>
						<span className="sm:hidden">Needed</span>
					</p>
				) : null}

				{/* Ratings - hidden on very small screens */}
				<div className="mb-1.5 sm:mb-2 space-y-0.5 hidden sm:block">
					{ratingsWithData.length > 0 ? (
						ratingsWithData
							.slice(0, 2)
							.map((rating, index) => (
								<MiniRating key={index} rating={rating} />
							))
					) : (
						<span className="text-[10px] text-zinc-400 italic">
							Click to see reviews
						</span>
					)}
				</div>

				{/* Description - hidden on mobile */}
				<div className="flex-1 hidden lg:block">
					{truncatedDescription ? (
						<p className="text-xs text-zinc-600 leading-relaxed line-clamp-3">
							{truncatedDescription}
						</p>
					) : (
						<p className="text-xs text-zinc-400 italic">Click for details</p>
					)}
				</div>

				{/* Footer - simplified on mobile */}
				<div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-zinc-100 flex flex-wrap gap-1.5 sm:gap-2">
					{book.pages && (
						<span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-zinc-100 text-zinc-600">
							{book.pages}p
						</span>
					)}
					{book.notes && (
						<span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-amber-50 text-amber-700 truncate max-w-[80px] sm:max-w-[120px]">
							{book.notes}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
