-- Create books test table for RxDB sync testing
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    genre TEXT,
    year INTEGER,
    pages INTEGER,
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    available BOOLEAN DEFAULT true,
    description TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    account_id TEXT,
    space_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_books_title ON public.books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON public.books(author);
CREATE INDEX IF NOT EXISTS idx_books_deleted ON public.books(deleted);
CREATE INDEX IF NOT EXISTS idx_books_updated_at ON public.books(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_account_id ON public.books(account_id);

-- Enable RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous access (for testing)
CREATE POLICY "Allow anonymous access to books" ON public.books
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO public.books (title, author, isbn, genre, year, pages, rating, available, description, tags, metadata) VALUES
    ('The Great Gatsby', 'F. Scott Fitzgerald', '978-0-7432-7356-5', 'Classic Fiction', 1925, 180, 4.5, true, 'A story about the Jazz Age in the United States', ARRAY['classic', 'american', 'romance'], '{"publisher": "Scribner"}'),
    ('1984', 'George Orwell', '978-0-452-28423-4', 'Dystopian Fiction', 1949, 328, 4.8, true, 'A dystopian social science fiction novel', ARRAY['dystopian', 'political', 'classic'], '{"publisher": "Secker & Warburg"}'),
    ('To Kill a Mockingbird', 'Harper Lee', '978-0-06-112008-4', 'Southern Gothic', 1960, 281, 4.7, false, 'A novel about racial injustice in the American South', ARRAY['classic', 'legal', 'racism'], '{"publisher": "J. B. Lippincott & Co."}'),
    ('Pride and Prejudice', 'Jane Austen', '978-0-14-143951-8', 'Romance', 1813, 432, 4.6, true, 'A romantic novel of manners', ARRAY['romance', 'classic', 'british'], '{"publisher": "T. Egerton"}'),
    ('The Catcher in the Rye', 'J.D. Salinger', '978-0-316-76948-0', 'Coming-of-age', 1951, 277, 3.9, true, 'A story about teenage rebellion and angst', ARRAY['coming-of-age', 'american', 'classic'], '{"publisher": "Little, Brown and Company"}'),
    ('The Hobbit', 'J.R.R. Tolkien', '978-0-547-92822-7', 'Fantasy', 1937, 310, 4.9, true, 'A fantasy adventure about a hobbit''s journey', ARRAY['fantasy', 'adventure', 'classic'], '{"publisher": "George Allen & Unwin"}'),
    ('Harry Potter and the Sorcerer''s Stone', 'J.K. Rowling', '978-0-439-70818-8', 'Fantasy', 1997, 309, 4.8, false, 'The first book in the Harry Potter series', ARRAY['fantasy', 'magic', 'young-adult'], '{"publisher": "Bloomsbury"}'),
    ('The Da Vinci Code', 'Dan Brown', '978-0-385-50420-5', 'Thriller', 2003, 689, 3.8, true, 'A mystery thriller novel', ARRAY['thriller', 'mystery', 'conspiracy'], '{"publisher": "Doubleday"}'),
    ('The Hunger Games', 'Suzanne Collins', '978-0-439-02348-1', 'Dystopian', 2008, 374, 4.3, true, 'A dystopian novel set in post-apocalyptic North America', ARRAY['dystopian', 'young-adult', 'action'], '{"publisher": "Scholastic"}'),
    ('The Alchemist', 'Paulo Coelho', '978-0-06-112241-5', 'Philosophical Fiction', 1988, 208, 4.2, true, 'A philosophical story about following your dreams', ARRAY['philosophy', 'adventure', 'spiritual'], '{"publisher": "HarperOne"}');