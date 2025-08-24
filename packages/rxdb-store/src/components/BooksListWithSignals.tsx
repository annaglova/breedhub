import React, { useState } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { booksStore } from '../stores/books.signal-store';
import { Book } from '../types/book.types';

export const BooksListWithSignals: React.FC = () => {
  useSignals();
  
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    genre: '',
    year: new Date().getFullYear(),
    pages: 0,
    rating: 0,
    available: true,
    description: ''
  });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Book>>({});

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title.trim() || !newBook.author.trim()) return;
    
    try {
      await booksStore.addBook({
        ...newBook,
        year: newBook.year || null,
        pages: newBook.pages || null,
        rating: newBook.rating || null
      });
      
      setNewBook({
        title: '',
        author: '',
        genre: '',
        year: new Date().getFullYear(),
        pages: 0,
        rating: 0,
        available: true,
        description: ''
      });
    } catch (error) {
      console.error('Failed to add book:', error);
    }
  };

  const handleEdit = (book: Book) => {
    setEditingId(book.id);
    setEditForm({
      title: book.title,
      author: book.author,
      genre: book.genre,
      year: book.year,
      pages: book.pages,
      rating: book.rating,
      available: book.available,
      description: book.description
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    try {
      await booksStore.updateBook(editingId, editForm);
      setEditingId(null);
      setEditForm({});
    } catch (error) {
      console.error('Failed to update book:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this book?')) {
      try {
        await booksStore.deleteBook(id);
      } catch (error) {
        console.error('Failed to delete book:', error);
      }
    }
  };

  const books = booksStore.booksList.value;
  const loading = booksStore.loading.value;
  const error = booksStore.error.value;
  const totalCount = booksStore.totalCount.value;
  const availableCount = booksStore.availableCount.value;

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Books Library (Preact Signals)</h2>
        
        <div className="flex gap-4 mb-4 text-sm">
          <span className="px-3 py-1 bg-blue-100 rounded">
            Total: {totalCount} books
          </span>
          <span className="px-3 py-1 bg-green-100 rounded">
            Available: {availableCount} books
          </span>
          <span className="px-3 py-1 bg-gray-100 rounded">
            Showing: All books (sorted by updated date)
          </span>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleAddBook} className="bg-white p-4 rounded shadow mb-4">
          <h3 className="font-semibold mb-3">Add New Book</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Title *"
              value={newBook.title}
              onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
              className="px-3 py-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Author *"
              value={newBook.author}
              onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
              className="px-3 py-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Genre"
              value={newBook.genre}
              onChange={(e) => setNewBook({ ...newBook, genre: e.target.value })}
              className="px-3 py-2 border rounded"
            />
            <input
              type="number"
              placeholder="Year"
              value={newBook.year}
              onChange={(e) => setNewBook({ ...newBook, year: parseInt(e.target.value) || 0 })}
              className="px-3 py-2 border rounded"
              min="0"
              max="9999"
            />
            <input
              type="number"
              placeholder="Pages"
              value={newBook.pages}
              onChange={(e) => setNewBook({ ...newBook, pages: parseInt(e.target.value) || 0 })}
              className="px-3 py-2 border rounded"
              min="0"
            />
            <input
              type="number"
              placeholder="Rating (0-5)"
              value={newBook.rating}
              onChange={(e) => setNewBook({ ...newBook, rating: parseFloat(e.target.value) || 0 })}
              className="px-3 py-2 border rounded"
              min="0"
              max="5"
              step="0.1"
            />
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newBook.available}
                  onChange={(e) => setNewBook({ ...newBook, available: e.target.checked })}
                  className="mr-2"
                />
                Available
              </label>
            </div>
            <textarea
              placeholder="Description"
              value={newBook.description}
              onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
              className="px-3 py-2 border rounded col-span-2"
              rows={2}
            />
          </div>
          <button
            type="submit"
            className="mt-3 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={loading}
          >
            Add Book
          </button>
        </form>

        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}

        <div className="space-y-2">
          {books.map((book) => (
            <div key={book.id} className="bg-white p-4 rounded shadow">
              {editingId === book.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <input
                    type="text"
                    value={editForm.author}
                    onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <input
                    type="text"
                    value={editForm.genre || ''}
                    onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Genre"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={editForm.year || ''}
                      onChange={(e) => setEditForm({ ...editForm, year: parseInt(e.target.value) || null })}
                      className="px-3 py-2 border rounded"
                      placeholder="Year"
                    />
                    <input
                      type="number"
                      value={editForm.pages || ''}
                      onChange={(e) => setEditForm({ ...editForm, pages: parseInt(e.target.value) || null })}
                      className="px-3 py-2 border rounded"
                      placeholder="Pages"
                    />
                    <input
                      type="number"
                      value={editForm.rating || ''}
                      onChange={(e) => setEditForm({ ...editForm, rating: parseFloat(e.target.value) || null })}
                      className="px-3 py-2 border rounded"
                      placeholder="Rating"
                      step="0.1"
                      min="0"
                      max="5"
                    />
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editForm.available}
                      onChange={(e) => setEditForm({ ...editForm, available: e.target.checked })}
                      className="mr-2"
                    />
                    Available
                  </label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    rows={2}
                    placeholder="Description"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditForm({});
                      }}
                      className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{book.title}</h3>
                      <p className="text-gray-600">by {book.author}</p>
                      <div className="flex flex-wrap gap-2 mt-2 text-sm">
                        {book.genre && (
                          <span className="px-2 py-1 bg-purple-100 rounded">{book.genre}</span>
                        )}
                        {book.year && (
                          <span className="px-2 py-1 bg-blue-100 rounded">{book.year}</span>
                        )}
                        {book.pages && (
                          <span className="px-2 py-1 bg-gray-100 rounded">{book.pages} pages</span>
                        )}
                        {book.rating && (
                          <span className="px-2 py-1 bg-yellow-100 rounded">★ {book.rating}</span>
                        )}
                        <span className={`px-2 py-1 rounded ${book.available ? 'bg-green-100' : 'bg-red-100'}`}>
                          {book.available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      {book.description && (
                        <p className="text-gray-600 mt-2 text-sm">{book.description}</p>
                      )}
                      {book.tags && book.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {book.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-200 rounded text-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        ID: {book.id} | Updated: {new Date(book.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(book)}
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(book.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {books.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No books found. Add some books to get started!
          </div>
        )}
      </div>
    </div>
  );
};