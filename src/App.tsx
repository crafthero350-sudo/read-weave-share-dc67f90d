import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import HomeScreen from "@/pages/HomeScreen";
import ReadingNowScreen from "@/pages/ReadingNowScreen";
import ReaderView from "@/pages/ReaderView";
import ProfilePage from "@/pages/ProfilePage";
import SearchScreen from "@/pages/SearchScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="max-w-lg mx-auto bg-background min-h-screen relative">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/reading" element={<ReadingNowScreen />} />
            <Route path="/read/:id" element={<ReaderView />} />
            <Route path="/search" element={<SearchScreen />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
