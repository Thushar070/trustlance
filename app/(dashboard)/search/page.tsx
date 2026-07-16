"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Search, MapPin, Briefcase, Star, Award, SlidersHorizontal, AlertCircle } from "lucide-react";

interface SearchResultUser {
  id: string;
  name: string;
  role: string;
  businessName: string | null;
  bio: string | null;
  location: string | null;
  skills: string[];
  averageRating: number;
  completedProjectCount: number;
  createdAt?: string;
}

export default function SearchPage() {
  const { data: session, status } = useSession();
  const [results, setResults] = useState<SearchResultUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters state
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [sortBy, setSortBy] = useState<"rating" | "activity">("rating");

  const isClient = session?.user?.role === "CLIENT";
  const isFreelancer = session?.user?.role === "FREELANCER";
  
  // The role we are searching for
  const searchRole = isClient ? "FREELANCER" : isFreelancer ? "CLIENT" : "";

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchRole) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const params = new URLSearchParams({
        role: searchRole,
        query,
        minRating,
      });

      if (isClient && skill) {
        params.append("skill", skill);
      }

      const res = await fetch(`/api/users/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch search results.");
      }
      const data = await res.json();
      setResults(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [searchRole, query, minRating, isClient, skill]);

  // Run initial search once session resolves
  useEffect(() => {
    if (session?.user) {
      // Defer execution to avoid synchronous cascading state sets during effect run
      const timer = setTimeout(() => {
        handleSearch();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [session, handleSearch]);

  if (status === "loading") {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
          <p className="text-[var(--text-muted)] text-sm">Loading search console...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || (!isClient && !isFreelancer)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3 justify-center">
          <AlertCircle className="w-4.5 h-4.5 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[var(--status-negative-text)] font-semibold">
            Access Forbidden: Search features are only available to registered Clients and Freelancers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full min-w-0 animate-fadeIn">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
          <span>Enterprise</span>
          <span>&gt;</span>
          <span className="text-zinc-400 font-bold">Marketplace Search</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
          Search {isClient ? "Freelancers" : "Clients"}
        </h1>
        <p className="text-xs text-zinc-550 font-light mt-1">
          Discover verified talent and marketplace participants across TrustLance.
        </p>
      </div>

      {/* Filter Toolbar Card */}
      <form onSubmit={handleSearch} className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Search Filter Configuration
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Main search query */}
          <div className={`${isClient ? "md:col-span-5" : "md:col-span-8"} relative`}>
            <input
              type="text"
              placeholder="Search by name, business name, or bio..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white placeholder-zinc-700 focus:outline-none"
            />
          </div>

          {/* Skill query */}
          {isClient && (
            <div className="md:col-span-4 relative">
              <input
                type="text"
                placeholder="Filter by skill tag..."
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white placeholder-zinc-700 focus:outline-none"
              />
            </div>
          )}

          {/* Rating query */}
          <div className="md:col-span-3">
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-zinc-400 focus:outline-none cursor-pointer"
            >
              <option value="0">Any Star Rating</option>
              <option value="4">4.0 Stars & Above</option>
              <option value="4.5">4.5 Stars & Above</option>
              <option value="5">5.0 Stars (Perfect)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSkill("");
              setMinRating("0");
            }}
            className="border border-zinc-800 hover:border-zinc-750 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors cursor-pointer"
          >
            Clear All
          </button>
          <button
            type="submit"
            className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors cursor-pointer"
          >
            Search Directory
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs text-red-400 flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-white animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-16 text-center">
          <Search className="w-8 h-8 text-zinc-650 mx-auto mb-4" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">No Matches Found</h3>
          <p className="text-xs text-zinc-600 font-light max-w-sm mx-auto">
            Try adjusting your keywords, selecting different rating limits, or expanding the skill search query.
          </p>
        </div>
      ) : (() => {
        const sortedResults = [...results].sort((a, b) => {
          if (sortBy === "rating") {
            if (b.averageRating !== a.averageRating) {
              return b.averageRating - a.averageRating;
            }
            return b.completedProjectCount - a.completedProjectCount;
          } else {
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          }
        });

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-900 pb-4">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Search Results ({sortedResults.length})
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "rating" | "activity")}
                  className="px-3 py-1.5 text-[9px] bg-black border border-zinc-800 rounded focus:outline-none text-zinc-400 cursor-pointer font-bold uppercase tracking-widest"
                >
                  <option value="rating">Highest Rating</option>
                  <option value="activity">Recent Activity</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedResults.map((user) => (
                <div
                  key={user.id}
                  className="border border-zinc-850 bg-black rounded-lg p-5 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: name & rating */}
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white truncate hover:underline cursor-pointer">
                          {user.name}
                        </h3>
                        {user.businessName && (
                          <p className="text-[11px] text-zinc-450 font-medium truncate mt-0.5">
                            {user.businessName}
                          </p>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold border uppercase bg-zinc-950 text-zinc-450 border-zinc-800 shrink-0">
                        {user.role}
                      </span>
                    </div>

                    {/* Rating & Projects Row */}
                    <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-400 mb-4 bg-zinc-950 p-2 rounded border border-zinc-900">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />
                        <span className="text-white font-bold">{user.averageRating.toFixed(1)}</span>
                      </div>
                      <div className="w-px h-3 bg-zinc-900" />
                      <div className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{user.completedProjectCount} projects</span>
                      </div>
                    </div>

                    {/* Bio Snippet */}
                    {user.bio ? (
                      <p className="text-xs text-zinc-400 line-clamp-3 mb-4 leading-relaxed font-light">
                        {user.bio}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-650 italic mb-4 leading-relaxed font-light">
                        No bio summary provided by this user.
                      </p>
                    )}

                    {user.location && (
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-550 mb-4 font-mono">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{user.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Skills tags */}
                    {user.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 border-t border-zinc-900 pt-4">
                        {user.skills.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 bg-zinc-950 border border-zinc-900 rounded text-[9px] font-mono text-zinc-400"
                          >
                            {s}
                          </span>
                        ))}
                        {user.skills.length > 3 && (
                          <span className="text-[9px] font-mono text-zinc-550 py-0.5">
                            +{user.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    <Link
                      href={`/profiles/${user.id}`}
                      className="border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-white font-bold text-[10px] uppercase tracking-widest py-2 rounded transition-colors text-center block w-full"
                    >
                      View Public Profile
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
