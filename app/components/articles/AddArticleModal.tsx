'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AddArticleModalProps {
	onClose: () => void;
	onArticleAdded: () => void;
}

interface ArticleMetadata {
	title: string;
	author?: string;
	publication?: string;
	publicationDate?: string;
	articleUrl: string;
	thumbnailImage?: string;
	description?: string;
	section?: string;
}

type WizardStep = 'form' | 'confirm';

export default function AddArticleModal({
	onClose,
	onArticleAdded,
}: AddArticleModalProps) {
	const [step, setStep] = useState<WizardStep>('form');

	// Form state
	const [url, setUrl] = useState('');
	const [title, setTitle] = useState('');
	const [author, setAuthor] = useState('');
	const [publication, setPublication] = useState('');
	const [notes, setNotes] = useState('');
	const [priority, setPriority] = useState('');
	const [read, setRead] = useState(false);

	// Parsed metadata
	const [metadata, setMetadata] = useState<ArticleMetadata | null>(null);

	// UI state
	const [loading, setLoading] = useState(false);
	const [parsing, setParsing] = useState(false);
	const [error, setError] = useState('');

	const parseUrl = async () => {
		if (!url.trim()) {
			setError('URL is required');
			return;
		}

		// Validate URL format
		try {
			new URL(url.trim());
		} catch {
			setError('Please enter a valid URL');
			return;
		}

		setParsing(true);
		setError('');

		try {
			const response = await fetch('/api/articles/parse-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: url.trim() }),
			});

			const data = await response.json();

			if (!response.ok) {
				// Use fallback if available
				if (data.fallback) {
					setMetadata({
						title: data.fallback.title || 'Unknown Article',
						articleUrl: url.trim(),
					});
					setTitle(data.fallback.title || '');
					setStep('confirm');
					return;
				}
				throw new Error(data.error || 'Failed to parse URL');
			}

			setMetadata(data);
			setTitle(data.title || '');
			setAuthor(data.author || '');
			setPublication(data.publication || '');
			setStep('confirm');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to parse URL');
		} finally {
			setParsing(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await parseUrl();
	};

	const handleBackToForm = () => {
		setStep('form');
		setMetadata(null);
		setError('');
	};

	const addArticle = async () => {
		if (!url.trim() && !metadata?.articleUrl) {
			setError('URL is required');
			return;
		}

		setLoading(true);
		setError('');

		try {
			const response = await fetch('/api/user-articles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title.trim() || metadata?.title || 'Unknown Article',
					author: author.trim() || metadata?.author || null,
					publication: publication.trim() || metadata?.publication || null,
					publication_date: metadata?.publicationDate || null,
					article_url: metadata?.articleUrl || url.trim(),
					description: metadata?.description || null,
					thumbnail_image: metadata?.thumbnailImage || null,
					section: metadata?.section || null,
					notes: notes.trim() || null,
					priority: priority || null,
					read,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to add article');
			}

			onArticleAdded();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to add article');
		} finally {
			setLoading(false);
		}
	};

	const renderFormStep = () => (
		<form onSubmit={handleSubmit} className="space-y-4">
			{error && (
				<div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
					{error}
				</div>
			)}

			<div className="p-4 bg-teal-50 rounded-lg text-sm text-teal-800">
				<p className="font-medium mb-1">Supported publications:</p>
				<p className="text-teal-600">
					The New York Times, Financial Times, Substack, and more
				</p>
			</div>

			<div>
				<label
					htmlFor="url"
					className="block text-sm font-medium text-zinc-700 mb-1"
				>
					Article URL <span className="text-red-500">*</span>
				</label>
				<input
					type="url"
					id="url"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
					placeholder="https://www.nytimes.com/2024/..."
					autoFocus
				/>
				<p className="mt-1 text-xs text-zinc-500">
					Paste the article URL and we&apos;ll automatically extract the title,
					author, and other details.
				</p>
			</div>

			<div>
				<label
					htmlFor="priority"
					className="block text-sm font-medium text-zinc-700 mb-1"
				>
					Priority
				</label>
				<select
					id="priority"
					value={priority}
					onChange={(e) => setPriority(e.target.value)}
					className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors bg-white"
				>
					<option value="">No priority</option>
					<option value="A">A - High</option>
					<option value="B">B - Medium</option>
					<option value="C">C - Low</option>
				</select>
			</div>

			<div>
				<label
					htmlFor="notes"
					className="block text-sm font-medium text-zinc-700 mb-1"
				>
					Notes
				</label>
				<textarea
					id="notes"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					rows={2}
					className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors resize-none"
					placeholder="Why do you want to read this article?"
				/>
			</div>

			<div className="flex items-center gap-2">
				<input
					type="checkbox"
					id="read"
					checked={read}
					onChange={(e) => setRead(e.target.checked)}
					className="w-4 h-4 text-teal-500 border-zinc-300 rounded focus:ring-teal-500"
				/>
				<label htmlFor="read" className="text-sm text-zinc-700">
					I&apos;ve already read this article
				</label>
			</div>

			<div className="flex gap-3 pt-2">
				<button
					type="button"
					onClick={onClose}
					className="flex-1 px-4 py-2 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 font-medium rounded-lg transition-colors"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={loading || parsing}
					className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{parsing ? 'Parsing...' : 'Continue'}
				</button>
			</div>
		</form>
	);

	const renderConfirmStep = () => (
		<div className="space-y-4">
			{error && (
				<div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
					{error}
				</div>
			)}

			{/* Article Preview */}
			<div className="flex gap-4 p-4 bg-zinc-50 rounded-lg">
				{metadata?.thumbnailImage ? (
					<Image
						src={metadata.thumbnailImage}
						alt={metadata.title}
						width={80}
						height={80}
						className="w-20 h-20 object-cover rounded shadow flex-shrink-0"
					/>
				) : (
					<div className="w-20 h-20 bg-zinc-200 rounded shadow flex items-center justify-center flex-shrink-0">
						<svg
							className="w-8 h-8 text-zinc-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
							/>
						</svg>
					</div>
				)}
				<div className="flex-1 min-w-0">
					{metadata?.publication && (
						<p className="text-xs font-medium text-teal-600 mb-1">
							{metadata.publication}
						</p>
					)}
					<h3 className="font-bold text-zinc-900 line-clamp-2">
						{metadata?.title || title || 'Unknown Article'}
					</h3>
					{metadata?.author && (
						<p className="text-sm text-zinc-600 mt-1">by {metadata.author}</p>
					)}
					{metadata?.section && (
						<span className="inline-block mt-1 text-xs bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded">
							{metadata.section}
						</span>
					)}
				</div>
			</div>

			{/* Editable fields */}
			<div>
				<label
					htmlFor="title-confirm"
					className="block text-sm font-medium text-zinc-700 mb-1"
				>
					Title
				</label>
				<input
					type="text"
					id="title-confirm"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
					placeholder="Article title"
				/>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div>
					<label
						htmlFor="author-confirm"
						className="block text-sm font-medium text-zinc-700 mb-1"
					>
						Author
					</label>
					<input
						type="text"
						id="author-confirm"
						value={author}
						onChange={(e) => setAuthor(e.target.value)}
						className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
						placeholder="Author name"
					/>
				</div>
				<div>
					<label
						htmlFor="publication-confirm"
						className="block text-sm font-medium text-zinc-700 mb-1"
					>
						Publication
					</label>
					<input
						type="text"
						id="publication-confirm"
						value={publication}
						onChange={(e) => setPublication(e.target.value)}
						className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
						placeholder="Publication name"
					/>
				</div>
			</div>

			<div>
				<label
					htmlFor="priority-confirm"
					className="block text-sm font-medium text-zinc-700 mb-1"
				>
					Priority
				</label>
				<select
					id="priority-confirm"
					value={priority}
					onChange={(e) => setPriority(e.target.value)}
					className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors bg-white"
				>
					<option value="">No priority</option>
					<option value="A">A - High</option>
					<option value="B">B - Medium</option>
					<option value="C">C - Low</option>
				</select>
			</div>

			<div>
				<label
					htmlFor="notes-confirm"
					className="block text-sm font-medium text-zinc-700 mb-1"
				>
					Notes
				</label>
				<textarea
					id="notes-confirm"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					rows={2}
					className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors resize-none"
					placeholder="Any notes about this article..."
				/>
			</div>

			<div className="flex items-center gap-2">
				<input
					type="checkbox"
					id="read-confirm"
					checked={read}
					onChange={(e) => setRead(e.target.checked)}
					className="w-4 h-4 text-teal-500 border-zinc-300 rounded focus:ring-teal-500"
				/>
				<label htmlFor="read-confirm" className="text-sm text-zinc-700">
					I&apos;ve already read this article
				</label>
			</div>

			<div className="flex gap-3 pt-2">
				<button
					type="button"
					onClick={handleBackToForm}
					className="flex-1 px-4 py-2 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 font-medium rounded-lg transition-colors"
				>
					Back
				</button>
				<button
					type="button"
					onClick={addArticle}
					disabled={loading}
					className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Adding...' : 'Add to Shelf'}
				</button>
			</div>
		</div>
	);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-xl font-bold text-zinc-900">
						{step === 'form' && 'Add an Article'}
						{step === 'confirm' && 'Confirm Article'}
					</h2>
					<button
						onClick={onClose}
						className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				{step === 'form' && renderFormStep()}
				{step === 'confirm' && renderConfirmStep()}
			</div>
		</div>
	);
}
