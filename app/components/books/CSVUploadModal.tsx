'use client';

import { useState, useRef } from 'react';

interface CSVUploadModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

interface ParsedBook {
  title: string;
  author: string | null;
  genre: string;
  notes: string | null;
  priority: string | null;
}

export default function CSVUploadModal({ onClose, onImportComplete }: CSVUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedBooks, setParsedBooks] = useState<ParsedBook[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError('');
    setParsing(true);
    setParsedBooks([]);

    try {
      // Read the file content
      const csvContent = await selectedFile.text();

      // Send to Claude for parsing
      const response = await fetch('/api/parse-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to parse CSV');
      }

      const { books } = await response.json();
      setParsedBooks(books);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV');
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (parsedBooks.length === 0) {
      setError('No valid books to import');
      return;
    }

    setImporting(true);
    setProgress({ current: 0, total: parsedBooks.length });
    setError('');

    try {
      // Import in batches of 50
      const batchSize = 50;
      for (let i = 0; i < parsedBooks.length; i += batchSize) {
        const batch = parsedBooks.slice(i, i + batchSize);

        const response = await fetch('/api/user-books/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ books: batch }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to import books');
        }

        setProgress({ current: Math.min(i + batchSize, parsedBooks.length), total: parsedBooks.length });
      }

      onImportComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import books');
    } finally {
      setImporting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileChange({ target: { files: dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
      }
    } else {
      setError('Please drop a CSV file');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-zinc-900">Import from CSV</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center hover:border-amber-400 transition-colors"
          >
            <svg className="w-12 h-12 text-zinc-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-zinc-600 mb-2">Drag and drop your CSV file here</p>
            <p className="text-zinc-400 text-sm mb-4">or</p>
            <label className="inline-block px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg cursor-pointer transition-colors">
              Browse Files
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-zinc-400 mt-4">
              AI-powered parsing - works with any CSV format
            </p>
          </div>
        ) : parsing ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-600">Analyzing your reading list with AI...</p>
            <p className="text-sm text-zinc-400 mt-1">This may take a moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-900 truncate">{file.name}</p>
                <p className="text-sm text-zinc-500">{parsedBooks.length} books found</p>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setParsedBooks([]);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {parsedBooks.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-zinc-700">Title</th>
                      <th className="text-left px-3 py-2 font-medium text-zinc-700">Author</th>
                      <th className="text-left px-3 py-2 font-medium text-zinc-700">Genre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {parsedBooks.slice(0, 10).map((book, i) => (
                      <tr key={i} className="hover:bg-zinc-50">
                        <td className="px-3 py-2 text-zinc-900 truncate max-w-[150px]">{book.title}</td>
                        <td className="px-3 py-2 text-zinc-600 truncate max-w-[100px]">{book.author || '-'}</td>
                        <td className="px-3 py-2 text-zinc-600">{book.genre}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedBooks.length > 10 && (
                  <div className="px-3 py-2 bg-zinc-50 text-sm text-zinc-500 text-center">
                    ...and {parsedBooks.length - 10} more books
                  </div>
                )}
              </div>
            )}

            {importing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-zinc-600">
                  <span>Importing...</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={importing}
                className="flex-1 px-4 py-2 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || parsedBooks.length === 0}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : `Import ${parsedBooks.length} Books`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
