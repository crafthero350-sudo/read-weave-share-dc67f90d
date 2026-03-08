import { Search } from "lucide-react";
import { BookCard } from "@/components/BookCard";
import { books } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

export default function ReadingNowScreen() {
  const navigate = useNavigate();
  const current = books.filter((b) => b.progress > 0 && b.progress < 100);
  const finished = books.filter((b) => b.progress === 100);
  const wantToRead = books.filter((b) => b.progress === 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-2xl font-semibold tracking-tight">Reading Now</h1>
          <button className="p-2">
            <Search className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-8">
        {/* Current */}
        {current.length > 0 && (
          <section>
            <h2 className="section-title mb-4">Current</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {current.map((book, i) => (
                <BookCard
                  key={book.id}
                  book={book}
                  size="large"
                  index={i}
                  onClick={() => navigate(`/read/${book.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Finished */}
        {finished.length > 0 && (
          <section>
            <h2 className="section-title mb-4">Finished</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {finished.map((book, i) => (
                <BookCard key={book.id} book={book} size="medium" index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Want to Read */}
        {wantToRead.length > 0 && (
          <section>
            <h2 className="section-title mb-4">Want to Read</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {wantToRead.map((book, i) => (
                <BookCard key={book.id} book={book} size="medium" index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
