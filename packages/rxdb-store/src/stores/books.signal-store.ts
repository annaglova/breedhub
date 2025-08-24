import { signal, computed, effect, batch } from '@preact/signals-react';
import { getDatabase, resetDatabase } from '../services/database.service';
import { Book, BookDocument } from '../types/book.types';
import { booksReplicationService } from '../services/books-replication.service';
import { Subscription } from 'rxjs';

class BooksSignalStore {
  private static instance: BooksSignalStore;
  
  // Signals
  books = signal<Map<string, Book>>(new Map());
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  syncEnabled = signal<boolean>(false);
  
  // Computed values
  booksList = computed(() => {
    const booksMap = this.books.value;
    return Array.from(booksMap.values())
      .filter(book => {
        // RxDB soft delete behavior:
        // - _deleted can be boolean, number, or string
        // - We consider a book deleted if _deleted is truthy and not "0"
        const isDeleted = book._deleted === true || 
                         book._deleted === 1 || 
                         book._deleted === "1" || 
                         book._deleted === "true";
        
        return !isDeleted;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      // Removed limit - show all books
  });
  
  totalCount = computed(() => {
    return Array.from(this.books.value.values()).filter(b => {
      const isDeleted = b._deleted === true || b._deleted === 1 || b._deleted === "1" || b._deleted === "true";
      return !isDeleted;
    }).length;
  });

  availableCount = computed(() => {
    return Array.from(this.books.value.values()).filter(b => {
      const isDeleted = b._deleted === true || b._deleted === 1 || b._deleted === "1" || b._deleted === "true";
      return !isDeleted && b.available;
    }).length;
  });
  
  private dbSubscription: Subscription | null = null;
  
  private constructor() {
    this.initializeStore();
  }
  
  static getInstance(): BooksSignalStore {
    if (!BooksSignalStore.instance) {
      BooksSignalStore.instance = new BooksSignalStore();
    }
    return BooksSignalStore.instance;
  }
  
  private async initializeStore() {
    console.log('[BooksStore] Initializing store...');
    
    try {
      this.loading.value = true;
      const db = await getDatabase();
      
      if (!db.books) {
        console.error('[BooksStore] Books collection not found');
        this.error.value = 'Books collection not initialized';
        return;
      }
      
      // Load initial data
      const allBooks = await db.books.find().exec();
      const booksMap = new Map<string, Book>();
      
      allBooks.forEach((doc: BookDocument) => {
        booksMap.set(doc.id, doc.toJSON() as Book);
      });
      
      this.books.value = booksMap;
      
      // Subscribe to changes
      this.dbSubscription = db.books.$.subscribe((changeEvent: any) => {
        console.log('[BooksStore] Database change event:', {
          operation: changeEvent.operation,
          documentId: changeEvent.documentId,
          documentData: changeEvent.documentData,
          previousDocumentData: changeEvent.previousDocumentData
        });
        
        if (changeEvent.operation === 'INSERT' || changeEvent.operation === 'UPDATE') {
          const newBooks = new Map(this.books.value);
          const bookData = changeEvent.documentData;
          
          if (bookData && bookData.id) {
            newBooks.set(bookData.id, bookData);
            console.log('[BooksStore] Updated book in store:', bookData.id);
          } else {
            console.warn('[BooksStore] No valid document data in change event');
          }
          
          this.books.value = newBooks;
        } else if (changeEvent.operation === 'DELETE') {
          const newBooks = new Map(this.books.value);
          const deleteId = changeEvent.documentId || changeEvent.documentData?.id;
          
          if (deleteId) {
            newBooks.delete(deleteId);
            console.log('[BooksStore] Removed book from store:', deleteId);
          }
          
          this.books.value = newBooks;
        }
      });
      
      console.log('[BooksStore] Store initialized with', this.books.value.size, 'books');
    } catch (error) {
      console.error('[BooksStore] Initialization error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to initialize store';
    } finally {
      this.loading.value = false;
    }
  }
  
  async addBook(bookData: Partial<Book>) {
    console.log('[BooksStore] Adding book:', bookData);
    
    try {
      this.loading.value = true;
      this.error.value = null;
      
      const db = await getDatabase();
      // Generate a proper UUID v4
      const id = crypto.randomUUID();
      
      const newBook: Book = {
        id,
        title: bookData.title || 'Untitled',
        author: bookData.author || 'Unknown',
        isbn: bookData.isbn,
        genre: bookData.genre,
        year: bookData.year,
        pages: bookData.pages,
        rating: bookData.rating,
        available: bookData.available !== undefined ? bookData.available : true,
        description: bookData.description,
        tags: bookData.tags || [],
        metadata: bookData.metadata || {},
        accountId: bookData.accountId,
        spaceId: bookData.spaceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _deleted: false
      };
      
      await db.books.insert(newBook);
      console.log('[BooksStore] Book added successfully:', id);
      
      return newBook;
    } catch (error) {
      console.error('[BooksStore] Add book error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to add book';
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  async updateBook(id: string, updates: Partial<Book>) {
    console.log('[BooksStore] Updating book:', id, updates);
    
    try {
      this.loading.value = true;
      this.error.value = null;
      
      const db = await getDatabase();
      const doc = await db.books.findOne(id).exec();
      
      if (!doc) {
        throw new Error(`Book ${id} not found`);
      }
      
      console.log('[BooksStore] Before update:', doc.toJSON());
      
      await doc.patch({
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      // Force save to ensure IndexedDB is updated
      await doc.save();
      
      // Verify the update
      const updatedDoc = await db.books.findOne(id).exec();
      console.log('[BooksStore] After update:', updatedDoc?.toJSON());
      
      // Also check in our local store
      const bookInStore = this.books.value.get(id);
      console.log('[BooksStore] Book in signal store:', bookInStore);
      
      console.log('[BooksStore] Book updated successfully:', id);
    } catch (error) {
      console.error('[BooksStore] Update book error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to update book';
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  async deleteBook(id: string) {
    console.log('[BooksStore] Deleting book:', id);
    
    try {
      this.loading.value = true;
      this.error.value = null;
      
      const db = await getDatabase();
      const doc = await db.books.findOne(id).exec();
      
      if (!doc) {
        throw new Error(`Book ${id} not found`);
      }
      
      console.log('[BooksStore] Before delete, _deleted:', doc._deleted, 'type:', typeof doc._deleted);
      
      // Soft delete - ensure it's a boolean
      await doc.patch({
        _deleted: true,
        updatedAt: new Date().toISOString()
      });
      
      // Verify the change
      const updatedDoc = await db.books.findOne(id).exec();
      console.log('[BooksStore] After delete, _deleted:', updatedDoc?._deleted, 'type:', typeof updatedDoc?._deleted);
      
      // Remove from local store immediately
      const newBooks = new Map(this.books.value);
      newBooks.delete(id);
      this.books.value = newBooks;
      
      console.log('[BooksStore] Book deleted successfully:', id);
    } catch (error) {
      console.error('[BooksStore] Delete book error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to delete book';
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  async clearAllBooks() {
    console.log('[BooksStore] Clearing all books...');
    
    try {
      this.loading.value = true;
      this.error.value = null;
      
      const db = await getDatabase();
      await db.books.remove();
      
      this.books.value = new Map();
      console.log('[BooksStore] All books cleared');
    } catch (error) {
      console.error('[BooksStore] Clear books error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to clear books';
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  async addTestBooks() {
    console.log('[BooksStore] Adding test books...');
    
    const testBooks = [
      { 
        title: 'JavaScript: The Good Parts', 
        author: 'Douglas Crockford', 
        genre: 'Programming',
        year: 2008,
        pages: 176,
        rating: 4.3,
        available: true,
        description: 'Most programming languages contain good and bad parts, but JavaScript has more than its share of the bad',
        tags: ['javascript', 'programming', 'web']
      },
      { 
        title: 'Clean Code', 
        author: 'Robert C. Martin',
        genre: 'Programming',
        year: 2008,
        pages: 464,
        rating: 4.7,
        available: false,
        description: 'A Handbook of Agile Software Craftsmanship',
        tags: ['programming', 'best-practices', 'agile']
      },
      { 
        title: 'Design Patterns', 
        author: 'Gang of Four',
        genre: 'Computer Science',
        year: 1994,
        pages: 395,
        rating: 4.5,
        available: true,
        description: 'Elements of Reusable Object-Oriented Software',
        tags: ['patterns', 'oop', 'architecture']
      },
      { 
        title: 'The Pragmatic Programmer', 
        author: 'David Thomas, Andrew Hunt',
        genre: 'Programming',
        year: 2019,
        pages: 352,
        rating: 4.8,
        available: true,
        description: 'Your Journey to Mastery',
        tags: ['programming', 'career', 'craftsmanship']
      },
      { 
        title: 'Structure and Interpretation of Computer Programs', 
        author: 'Harold Abelson, Gerald Jay Sussman',
        genre: 'Computer Science',
        year: 1996,
        pages: 657,
        rating: 4.9,
        available: true,
        description: 'The Wizard Book - MIT electrical engineering and computer science',
        tags: ['lisp', 'algorithms', 'mit']
      }
    ];
    
    try {
      for (const bookData of testBooks) {
        await this.addBook(bookData);
      }
      console.log('[BooksStore] Test books added successfully');
    } catch (error) {
      console.error('[BooksStore] Failed to add test books:', error);
    }
  }
  
  async enableSync() {
    console.log('[BooksStore] Enabling Supabase sync...');
    
    try {
      this.loading.value = true;
      
      // Ensure database is initialized first
      const db = await getDatabase();
      if (!db.books) {
        console.error('[BooksStore] Books collection not found, cannot enable sync');
        this.error.value = 'Books collection not initialized';
        return;
      }
      
      await booksReplicationService.setupBooksReplication();
      this.syncEnabled.value = true;
      console.log('[BooksStore] Sync enabled');
    } catch (error) {
      console.error('[BooksStore] Enable sync error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to enable sync';
    } finally {
      this.loading.value = false;
    }
  }
  
  async disableSync() {
    console.log('[BooksStore] Disabling Supabase sync...');
    
    try {
      this.loading.value = true;
      await booksReplicationService.stopReplication();
      this.syncEnabled.value = false;
      console.log('[BooksStore] Sync disabled');
    } catch (error) {
      console.error('[BooksStore] Disable sync error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to disable sync';
    } finally {
      this.loading.value = false;
    }
  }
  
  async resetStore() {
    console.log('[BooksStore] Resetting store...');
    
    try {
      this.loading.value = true;
      
      // Clean up subscriptions
      if (this.dbSubscription) {
        this.dbSubscription.unsubscribe();
        this.dbSubscription = null;
      }
      
      // Stop sync if active
      if (this.syncEnabled.value) {
        await this.disableSync();
      }
      
      // Reset database
      await resetDatabase();
      
      // Reinitialize
      await this.initializeStore();
      
      console.log('[BooksStore] Store reset complete');
    } catch (error) {
      console.error('[BooksStore] Reset store error:', error);
      this.error.value = error instanceof Error ? error.message : 'Failed to reset store';
    } finally {
      this.loading.value = false;
    }
  }
  
  async runCleanup() {
    console.log('[BooksStore] Running manual cleanup...');
    
    try {
      const db = await getDatabase();
      
      // Force cleanup on books collection
      if (db.books && db.books.cleanup) {
        const result = await db.books.cleanup(0); // 0 = cleanup all deleted documents immediately
        console.log('[BooksStore] Cleanup result:', result);
        return result;
      } else {
        console.log('[BooksStore] Cleanup not available for books collection');
      }
    } catch (error) {
      console.error('[BooksStore] Cleanup error:', error);
      throw error;
    }
  }
  
  dispose() {
    if (this.dbSubscription) {
      this.dbSubscription.unsubscribe();
      this.dbSubscription = null;
    }
  }
}

export const booksStore = BooksSignalStore.getInstance();