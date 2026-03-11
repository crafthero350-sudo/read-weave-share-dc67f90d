import { useState, useEffect, useCallback } from "react";
import { Search, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface UserBook {
  id: string;
  book_id: string;
  status: string;
  progress: number;
  current_page: number;
  book: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
  };
}

export default function ReadingNowScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserBooks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_books")
      .select("id, book_id, status, progress, current_page, book:books(id, title, author, cover_url)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (data) {
      // Flatten the book join
      const mapped = data.map((ub: any) => ({
        ...ub,
        book: ub.book,
        progress: ub.progress || 0,
        current_page: ub.current_page || 0,
      }));
      setUserBooks(mapped);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchUserBooks(); }, [fetchUserBooks]);

  const updateProgress = async (userBookId: string, newProgress: number) => {
    const status = newProgress >= 100 ? "finished" : newProgress > 0 ? "reading" : "want_to_read";
    await supabase
      .from("user_books")
      .update({
        progress: Math.min(newProgress, 100),
        status,
        ...(newProgress >= 100 ? { finished_at: new Date().toISOString() } : {}),
        ...(newProgress > 0 && status === "reading" ? { started_at: new Date().toISOString() } : {}),
      })
      .eq("id", userBookId);

    if (user) {
      await supabase.from("activity_log").insert({
        user_id: user.id,
        activity_type: "reading",
        metadata: { progress: newProgress },
      });
    }

    fetchUserBooks();
  };

  const current = userBooks.filter((ub) => ub.status === "reading");
  const finished = userBooks.filter((ub) => ub.status === "finished");
  const wantToRead = userBooks.filter((ub) => ub.status === "want_to_read");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-2xl font-semibold tracking-tight">Reading Now</h1>
          <button onClick={() => navigate("/search")} className="p-2">
            <Plus className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-8">
        {/* Reading Goals Card */}
        <ReadingGoalsCard currentBook={current[0]} onNavigate={navigate} />
        {userBooks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm mb-3">Your library is empty</p>
            <button
              onClick={() => navigate("/search")}
              className="px-4 py-2 bg-foreground text-background rounded-full text-sm font-medium"
            >
              Browse Books
            </button>
          </div>
        ) : (
          <>
            {current.length > 0 && (
              <Section title="Currently Reading">
                {current.map((ub, i) => (
                  <ReadingCard key={ub.id} userBook={ub} index={i} onUpdateProgress={updateProgress} />
                ))}
              </Section>
            )}
            {wantToRead.length > 0 && (
              <Section title="Want to Read">
                {wantToRead.map((ub, i) => (
                  <ReadingCard key={ub.id} userBook={ub} index={i} onUpdateProgress={updateProgress} />
                ))}
              </Section>
            )}
            {finished.length > 0 && (
              <Section title="Finished">
                {finished.map((ub, i) => (
                  <ReadingCard key={ub.id} userBook={ub} index={i} onUpdateProgress={updateProgress} />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="section-title mb-4">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">{children}</div>
    </section>
  );
}

function ReadingCard({
  userBook,
  index,
  onUpdateProgress,
}: {
  userBook: UserBook;
  index: number;
  onUpdateProgress: (id: string, progress: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex flex-col gap-2 flex-shrink-0 w-36"
    >
      <div className="w-36 h-52 rounded-lg overflow-hidden shadow-sm bg-muted">
        {userBook.book.cover_url ? (
          <img src={userBook.book.cover_url} alt={userBook.book.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
            {userBook.book.title}
          </div>
        )}
      </div>
      <div className="w-36">
        <p className="text-xs font-medium truncate">{userBook.book.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{userBook.book.author}</p>
        {userBook.status === "reading" && (
          <>
            <div className="book-progress-bar mt-1">
              <div className="book-progress-fill" style={{ width: `${userBook.progress}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">{userBook.progress}%</span>
              <button
                onClick={() => onUpdateProgress(userBook.id, Math.min(userBook.progress + 10, 100))}
                className="text-[10px] font-medium text-foreground"
              >
                +10%
              </button>
            </div>
          </>
        )}
        {userBook.status === "finished" && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><img src="https://fonts.gstatic.com/s/e/notoemoji/latest/2714_fe0f/512.png" alt="✓" className="w-3 h-3 inline" /> Finished</span>
        )}
        {userBook.status === "want_to_read" && (
          <button
            onClick={() => onUpdateProgress(userBook.id, 1)}
            className="text-[10px] font-medium text-foreground mt-1"
          >
            Start Reading
          </button>
        )}
      </div>
    </motion.div>
  );
}

function ReadingGoalsCard({ currentBook, onNavigate }: { currentBook?: UserBook; onNavigate: (path: string) => void }) {
  // Mock reading time — in production this would come from reading_sessions
  const readMinutes = 4;
  const readSeconds = 24;
  const goalMinutes = 15;
  const progress = Math.min(((readMinutes + readSeconds / 60) / goalMinutes) * 100, 100);
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm p-6 text-center space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Reading Goals</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Read every day, see your stats soar, and finish more books.
        </p>
      </div>

      {/* Circular Progress */}
      <div className="flex justify-center">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] text-muted-foreground font-medium">Today's Reading</span>
            <span className="text-3xl font-bold tracking-tight leading-none mt-1">
              {readMinutes}:{readSeconds.toString().padStart(2, "0")}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">
              goal &rsaquo;
            </span>
          </div>
        </div>
      </div>

      {/* Keep Reading Button */}
      <button
        onClick={() => {
          if (currentBook) onNavigate(`/read/${currentBook.book_id}`);
          else onNavigate("/search");
        }}
        className="w-full max-w-[240px] mx-auto flex flex-col items-center py-3 px-6 rounded-xl bg-foreground text-background"
      >
        <span className="text-sm font-semibold">Keep Reading</span>
        {currentBook && (
          <span className="text-[11px] opacity-70 mt-0.5">{currentBook.book.title}</span>
        )}
      </button>
    </div>
  );
}
