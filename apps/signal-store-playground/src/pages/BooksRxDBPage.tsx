import React, { useState, useEffect } from 'react';
import { BooksListWithSignals } from '@breedhub/rxdb-store/src/components/BooksListWithSignals';
import { booksStore } from '@breedhub/rxdb-store/src/stores/books.signal-store';
import { booksReplicationService } from '@breedhub/rxdb-store/src/services/books-replication.service';
import { cleanAllDatabases, resetDatabase } from '@breedhub/rxdb-store/src/services/database.service';

export const BooksRxDBPage: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  useEffect(() => {
    console.log('[BooksRxDBPage] Component mounted');
    
    return () => {
      console.log('[BooksRxDBPage] Component unmounting');
    };
  }, []);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleToggleSync = async () => {
    setIsLoading(true);
    try {
      if (syncStatus) {
        await booksStore.disableSync();
        setSyncStatus(false);
        showMessage('info', 'Supabase sync disabled');
      } else {
        await booksStore.enableSync();
        setSyncStatus(true);
        showMessage('success', 'Supabase sync enabled');
      }
    } catch (error) {
      console.error('Failed to toggle sync:', error);
      showMessage('error', `Failed to toggle sync: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTestData = async () => {
    setIsLoading(true);
    try {
      await booksStore.addTestBooks();
      showMessage('success', 'Test books added successfully');
    } catch (error) {
      console.error('Failed to add test data:', error);
      showMessage('error', `Failed to add test data: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all local books data?')) return;
    
    setIsLoading(true);
    try {
      await booksStore.clearAllBooks();
      showMessage('success', 'All local books cleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
      showMessage('error', `Failed to clear data: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDB = async () => {
    if (!confirm('This will completely reset the database. Are you sure?')) return;
    
    setIsLoading(true);
    try {
      await booksStore.resetStore();
      showMessage('success', 'Database reset complete');
    } catch (error) {
      console.error('Failed to reset database:', error);
      showMessage('error', `Failed to reset database: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanAllDBs = async () => {
    if (!confirm('This will delete ALL IndexedDB databases. Are you absolutely sure?')) return;
    
    setIsLoading(true);
    try {
      await cleanAllDatabases();
      showMessage('success', 'All databases cleaned. Please refresh the page.');
    } catch (error) {
      console.error('Failed to clean databases:', error);
      showMessage('error', `Failed to clean databases: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchFromSupabase = async () => {
    setIsLoading(true);
    try {
      const books = await booksReplicationService.fetchBooksFromSupabase(); // No limit
      showMessage('info', `Fetched ${books.length} books from Supabase`);
      console.log('Fetched books:', books);
    } catch (error) {
      console.error('Failed to fetch from Supabase:', error);
      showMessage('error', `Failed to fetch from Supabase: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTestBooks = async () => {
    if (!confirm('This will delete all test books from Supabase. Are you sure?')) return;
    
    setIsLoading(true);
    try {
      const result = await booksReplicationService.deleteTestBooks();
      if (result.error) {
        showMessage('error', `Failed to delete test books: ${result.error}`);
      } else {
        showMessage('success', `Deleted ${result.deleted} test books from Supabase`);
      }
    } catch (error) {
      console.error('Failed to delete test books:', error);
      showMessage('error', `Failed to delete test books: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">📚 Books RxDB + Supabase Sync Test</h1>
        
        {message && (
          <div className={`mb-4 p-4 rounded ${
            message.type === 'success' ? 'bg-green-100 text-green-700' :
            message.type === 'error' ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="mb-6 space-y-4">
          {/* Main Controls */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-3">Main Controls</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleToggleSync}
                disabled={isLoading}
                className={`px-4 py-2 rounded font-medium ${
                  syncStatus 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                } disabled:opacity-50`}
              >
                {syncStatus ? 'Disable' : 'Enable'} Supabase Sync
              </button>
              
              <button
                onClick={handleAddTestData}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
              >
                Add Test Books
              </button>
              
              <button
                onClick={handleClearData}
                disabled={isLoading}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded disabled:opacity-50"
              >
                Clear All Books
              </button>
              
              <button
                onClick={handleResetDB}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded disabled:opacity-50"
              >
                Reset Database
              </button>
              
              <button
                onClick={handleCleanAllDBs}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
              >
                Clean ALL DBs
              </button>
            </div>
          </div>

          {/* Supabase Operations */}
          <div className="bg-yellow-50 p-4 rounded shadow border border-yellow-200">
            <h2 className="font-semibold mb-3">Supabase Operations</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleFetchFromSupabase}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
              >
                Fetch Books from Supabase
              </button>
              
              <button
                onClick={handleDeleteTestBooks}
                disabled={isLoading}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
              >
                Delete Test Books from Supabase
              </button>
            </div>
          </div>

          {/* Status Info */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-3">Status</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${syncStatus ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>Sync Status: {syncStatus ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span>Loading: {isLoading ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Books List Component */}
        <BooksListWithSignals />
        
        {/* Info Footer */}
        <div className="mt-8 p-4 bg-gray-100 rounded text-sm text-gray-600">
          <h3 className="font-semibold mb-2">ℹ️ Info</h3>
          <ul className="space-y-1">
            <li>• This page tests RxDB sync with Supabase using the 'books' table</li>
            <li>• Books are stored locally in IndexedDB via RxDB</li>
            <li>• When sync is enabled, changes are pushed to/pulled from Supabase</li>
            <li>• The list shows the top 20 books sorted by update date</li>
            <li>• All operations are logged to the browser console</li>
          </ul>
        </div>
      </div>
    </div>
  );
};