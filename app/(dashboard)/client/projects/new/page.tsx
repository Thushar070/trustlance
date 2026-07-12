"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SKILL_GROUPS } from "@/lib/constants/skills";
import { Plus, IndianRupee, Calendar, Briefcase, AlertCircle, ArrowLeft } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setErrorMsg(null);

    const budgetNum = parseInt(budget, 10);

    const payload = {
      title,
      description,
      budget: isNaN(budgetNum) ? undefined : budgetNum,
      deadline,
      skills: selectedSkills,
    };

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          setErrors(data.details);
        } else {
          setErrorMsg(data.error || "Failed to create project");
        }
        setLoading(false);
        return;
      }

      router.push("/client/projects");
      router.refresh();
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] p-6 sm:p-10 relative overflow-hidden">
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-5 h-5 text-[var(--accent)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Post a New Project</h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
            Provide clear details to attract the best freelancers. Escrow funding is required upon assignment.
          </p>

          {errorMsg && (
            <div className="mb-6 bg-[var(--status-negative-bg)] border border-[var(--status-negative-border)] p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-[var(--status-negative-text)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--status-negative-text)] font-medium">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Title */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Project Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Build a secure escrow payment module for Next.js app"
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all"
              />
              {errors.title && (
                <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{errors.title[0]}</p>
              )}
            </div>

            {/* Project Description */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Project Description</label>
              <textarea
                required
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description of the tasks, project scope, and deliverables..."
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all leading-relaxed"
              />
              {errors.description && (
                <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{errors.description[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Project Budget */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Project Budget (INR)</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="5000"
                    className="w-full pl-8 pr-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all"
                  />
                </div>
                {errors.budget && (
                  <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{errors.budget[0]}</p>
                )}
              </div>

              {/* Project Deadline */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Project Deadline</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-sm transition-all text-[var(--text-secondary)]"
                  />
                </div>
                {errors.deadline && (
                  <p className="mt-1.5 text-xs text-[var(--status-negative-text)] font-medium">{errors.deadline[0]}</p>
                )}
              </div>
            </div>

            {/* Skill Selection */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Skills Required</label>
              <p className="text-[11px] text-[var(--text-muted)] mb-3 font-medium">Select at least one skill representing the tech stack required.</p>
              {errors.skills && (
                <p className="mb-3 text-xs text-[var(--status-negative-text)] font-medium">{errors.skills[0]}</p>
              )}

              <div className="space-y-4 border border-[var(--border)] rounded-lg p-4 bg-[var(--surface-subtle)] max-h-80 overflow-y-auto">
                {SKILL_GROUPS.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">{group.category}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {group.skills.map((skill) => {
                        const isSelected = selectedSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className={`text-[10px] px-2.5 py-1 rounded-md border font-medium cursor-pointer transition-all duration-150 ${
                              isSelected
                                ? "bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)] font-bold shadow-sm"
                                : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:border-[var(--text-muted)]"
                            }`}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 border-t border-[var(--border-subtle)] pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1 px-4 py-2.5 border border-[var(--border)] rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-sm disabled:opacity-50 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {loading ? "Posting Project..." : "Post Project"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
