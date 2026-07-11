"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SKILL_GROUPS } from "@/lib/constants/skills";

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-100 p-6 sm:p-10 relative overflow-hidden">
        {/* Decorative background gradient blob */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-indigo-100/30 to-violet-100/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Post a New Project</h1>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Provide clear details to attract the best freelancers. Escrow funding is required upon assignment.
          </p>

          {errorMsg && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
              <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Title */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Build a secure escrow payment module for Next.js app"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 text-sm transition-all"
              />
              {errors.title && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.title[0]}</p>
              )}
            </div>

            {/* Project Description */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project Description</label>
              <textarea
                required
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description of the tasks, project scope, and deliverables..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 text-sm transition-all leading-relaxed"
              />
              {errors.description && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.description[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Project Budget */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project Budget (INR)</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="5000"
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 text-sm transition-all"
                  />
                </div>
                {errors.budget && (
                  <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.budget[0]}</p>
                )}
              </div>

              {/* Project Deadline */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project Deadline</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 text-sm transition-all text-slate-700"
                />
                {errors.deadline && (
                  <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.deadline[0]}</p>
                )}
              </div>
            </div>

            {/* Skill Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Skills Required</label>
              <p className="text-[11px] text-slate-450 mb-3">Select at least one skill representing the tech stack required.</p>
              {errors.skills && (
                <p className="mb-3 text-xs text-red-600 font-medium">{errors.skills[0]}</p>
              )}

              <div className="space-y-5 border border-slate-100 rounded-2xl p-4.5 bg-slate-50/50 max-h-80 overflow-y-auto">
                {SKILL_GROUPS.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{group.category}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {group.skills.map((skill) => {
                        const isSelected = selectedSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className={`text-[11px] px-3 py-1.5 rounded-lg border font-semibold cursor-pointer transition-all duration-150 ${
                              isSelected
                                ? "bg-indigo-650 border-indigo-650 text-white shadow-sm shadow-indigo-100/50"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-150 hover:border-slate-300"
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
            <div className="flex justify-end space-x-4 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-sm shadow-indigo-200/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer transition-all duration-200"
              >
                {loading ? "Posting Project..." : "Post Project"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
