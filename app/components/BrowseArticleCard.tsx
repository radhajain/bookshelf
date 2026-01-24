'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { DbArticle } from '@/app/lib/types/database';
import { formatPublicationDate, formatReadingTime } from '@/app/lib/articles';

interface ArticleWithShelfStatus extends DbArticle {
	inMyShelf: boolean;
}

interface BrowseArticleCardProps {
	article: ArticleWithShelfStatus;
	onClick: () => void;
	onAddToShelf: () => void;
	onShowLogin: () => void;
	isAdding: boolean;
	isLoggedIn: boolean;
	showTypeLabel?: boolean;
}

export default function BrowseArticleCard({
	article,
	onClick,
	onAddToShelf,
	onShowLogin,
	isAdding,
	isLoggedIn,
	showTypeLabel = true,
}: BrowseArticleCardProps) {
	const [imageError, setImageError] = useState(false);

	return (
		<div
			onClick={onClick}
			className="group bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer"
		>
			{/* Article Thumbnail */}
			<div className="relative h-48 sm:h-64 md:h-72 bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center overflow-hidden">
				{article.thumbnail_image && !imageError ? (
					<Image
						src={article.thumbnail_image}
						alt={article.title}
						fill
						className="object-cover group-hover:scale-105 transition-transform duration-300"
						onError={() => setImageError(true)}
						sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
					/>
				) : (
					<div className="absolute inset-0 flex items-center justify-center p-4">
						<div className="text-center">
							<svg
								className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-300 mx-auto mb-2"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
								/>
							</svg>
							<p className="text-xs text-zinc-400 line-clamp-2">{article.title}</p>
						</div>
					</div>
				)}

				{/* Type & Publication Badge */}
				<div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex flex-col gap-1 items-start">
					{showTypeLabel && (
						<span className="px-1.5 sm:px-2 py-0.5 bg-teal-500 text-white text-[10px] sm:text-xs font-medium rounded-full w-fit">
							Article
						</span>
					)}
					{article.publication && (
						<span className="px-1.5 sm:px-2 py-0.5 bg-black/60 text-white text-[10px] sm:text-xs rounded-full w-fit truncate max-w-[120px]">
							{article.publication}
						</span>
					)}
				</div>

				{/* In Shelf Badge */}
				{article.inMyShelf && (
					<div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
						<span className="px-1.5 sm:px-2 py-0.5 bg-green-500 text-white text-[10px] sm:text-xs rounded-full flex items-center gap-1 w-fit">
							<svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20">
								<path
									fillRule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
							<span className="hidden sm:inline">In My Shelf</span>
						</span>
					</div>
				)}

				{/* Hover overlay */}
				<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors hidden sm:flex items-center justify-center">
					<span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-zinc-700 shadow">
						View Details
					</span>
				</div>
			</div>

			{/* Article Info */}
			<div className="p-2.5 sm:p-3 lg:p-4 flex flex-col flex-1">
				<h3 className="font-semibold text-zinc-900 text-xs sm:text-sm line-clamp-2 mb-0.5 sm:mb-1">
					{article.title}
				</h3>
				{article.author && (
					<p className="text-[10px] sm:text-xs text-zinc-500 mb-1 truncate">
						by {article.author}
					</p>
				)}

				{/* Meta info */}
				<div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
					{article.publication_date && (
						<span className="text-[9px] sm:text-[10px] text-zinc-400">
							{formatPublicationDate(article.publication_date)}
						</span>
					)}
					{article.reading_time_minutes && (
						<span className="text-[9px] sm:text-[10px] text-zinc-400">
							{formatReadingTime(article.reading_time_minutes)}
						</span>
					)}
				</div>

				{/* Spacer to push button to bottom */}
				<div className="flex-1" />

				{/* Add to Shelf Button */}
				{isLoggedIn && !article.inMyShelf && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onAddToShelf();
						}}
						disabled={isAdding}
						className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-teal-500 hover:bg-teal-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 mt-auto"
					>
						{isAdding ? (
							<>
								<div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								<span className="hidden sm:inline">Adding...</span>
							</>
						) : (
							<>
								<svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
								<span className="hidden sm:inline">Add to Shelf</span>
								<span className="sm:hidden">Add</span>
							</>
						)}
					</button>
				)}

				{article.inMyShelf && (
					<Link
						href={`/dashboard?article=${article.id}`}
						onClick={(e) => e.stopPropagation()}
						className="block w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs sm:text-sm font-medium rounded-lg transition-colors text-center mt-auto"
					>
						<span className="hidden sm:inline">View in My Shelf</span>
						<span className="sm:hidden">In Shelf</span>
					</Link>
				)}

				{!isLoggedIn && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onShowLogin();
						}}
						className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-teal-500 hover:bg-teal-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2 mt-auto"
					>
						<svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						<span className="hidden sm:inline">Add to Shelf</span>
						<span className="sm:hidden">Add</span>
					</button>
				)}
			</div>
		</div>
	);
}
