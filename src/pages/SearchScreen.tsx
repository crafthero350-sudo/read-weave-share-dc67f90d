import { useState } from "react";
import { Search as SearchIcon, ArrowLeft } from "lucide-react";
import { books } from "@/data/mockData";
import { BookCard } from "@/components/BookCard";
import { motion } from "framer-motion";

const categories = ["Books", "Authors", "Quotes", "Readers", "Discussions"];

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Books");

  const filtered = query
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(query.toLowerCase()) ||
          b.author.toLowerCase().includes(query.toLowerCase())
      )
    : books;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <SearchIcon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search books, authors, quotes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-foreground text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-6">
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((book, i) => (
            <BookCard key={book.id} book={book} size="medium" index={i} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-12">No results found</p>
        )}
      </div>
    </div>
  );
}
