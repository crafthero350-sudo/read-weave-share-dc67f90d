import { Search } from "lucide-react";
import { StoriesRow } from "@/components/StoriesRow";
import { PostCard } from "@/components/PostCard";
import { posts } from "@/data/mockData";
import bookappLogo from "@/assets/bookapp-logo.png";

export default function HomeScreen() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={bookappLogo} alt="BookApp" className="w-7 h-7" />
            <h1 className="bookapp-title text-2xl">BookApp</h1>
          </div>
          <button className="p-2">
            <Search className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Stories */}
      <div className="border-b border-border">
        <StoriesRow />
      </div>

      {/* Feed */}
      <div className="pt-4">
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} index={i} />
        ))}
      </div>
    </div>
  );
}
