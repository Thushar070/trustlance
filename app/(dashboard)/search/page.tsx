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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full min-w-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight mb-1 flex items-center gap-2">
          <Search className="w-6 h-6 text-[var(--accent)]" />
          Search {isClient ? "Freelancers" : "Clients"}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Discover verified talent and marketplace participants across TrustLance.
        </p>
      </div>

      {/* Filter Toolbar Card */}
      <form onSubmit={handleSearch} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-sm mb-8 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
          <SlidersHorizontal className="w-4 h-4 text-[var(--accent)]" />
          Search Filters
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Main search query */}
          <div className={`${isClient ? "md:col-span-5" : "md:col-span-8"} relative`}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by name, business name, or bio..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all bg-[var(--input-bg)] text-[var(--text-primary)]"
            />
          </div>

          {/* Skill query (Only displayed when Client searches Freelancer) */}
          {isClient && (
            <div className="md:col-span-4 relative">
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Filter by skill tag..."
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all bg-[var(--input-bg)] text-[var(--text-primary)]"
              />
            </div>
          )}

          {/* Rating query */}
          <div className="md:col-span-3">
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all bg-[var(--input-bg)] text-[var(--text-primary)] cursor-pointer"
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
            className="px-4 py-2 border border-[var(--border)] hover:bg-[var(--surface-subtle)] text-sm font-semibold rounded-lg transition-colors cursor-pointer text-[var(--text-secondary)]"
          >
            Clear All
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Search Directory
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="mb-6 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[var(--status-negative-text)] font-semibold">{errorMsg}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
            <Search className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No Matches Found</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
            Try adjusting your keywords, selecting different rating limits, or expanding the skill search query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((user) => (
            <div
              key={user.id}
              className="bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header: name & rating */}
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                      {user.name}
                    </h3>
                    {user.businessName && (
                      <p className="text-xs text-[var(--text-secondary)] font-medium truncate mt-0.5">
                        {user.businessName}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-[var(--accent-light)] text-[var(--accent)] border-[var(--border)] uppercase shrink-0">
                    {user.role}
                  </span>
                </div>

                {/* Rating & Projects Row */}
                <div className="flex items-center gap-4 text-xs font-semibold text-[var(--text-secondary)] mb-4 bg-[var(--surface-subtle)] p-2 rounded-lg border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    <span className="text-[var(--text-primary)]">{user.averageRating}</span>
                  </div>
                  <div className="w-px h-3 bg-[var(--border)]" />
                  <div className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    <span>{user.completedProjectCount} projects</span>
                  </div>
                </div>

                {/* Bio Snippet */}
                {user.bio ? (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 mb-4 leading-relaxed">
                    {user.bio}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic mb-4 leading-relaxed">
                    No bio summary provided by this user.
                  </p>
                )}

                {/* Location */}
                {user.location && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-4">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{user.location}</span>
                  </div>
                )}
              </div>

              <div>
                {/* Skills tags */}
                {user.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-5 border-t border-[var(--border-subtle)] pt-4">
                    {user.skills.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded text-[10px] font-bold text-[var(--text-secondary)]"
                      >
                        {s}
                      </span>
                    ))}
                    {user.skills.length > 3 && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                        +{user.skills.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                <Link
                  href={`/profiles/${user.id}`}
                  className="block w-full text-center py-2 bg-[var(--surface-subtle)] hover:bg-[var(--accent)] hover:text-white border border-[var(--border)] hover:border-[var(--accent)] rounded-lg text-xs font-bold text-[var(--text-secondary)] transition-all cursor-pointer"
                >
                  View Public Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
