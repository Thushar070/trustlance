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
  const [skillsOpen, setSkillsOpen] = useState(false);

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
    <div className="space-y-8 w-full max-w-4xl mx-auto min-w-0">
      {/* Context Breadcrumbs */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          <span className="hover:text-white transition-colors cursor-pointer" onClick={() => router.push("/client/projects")}>Enterprise</span>
          <span>&gt;</span>
          <span className="hover:text-white transition-colors cursor-pointer" onClick={() => router.push("/client/projects")}>Projects</span>
          <span>&gt;</span>
          <span className="text-zinc-400">Create</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
          Post a New Project
        </h1>
        <p className="text-xs text-zinc-550 font-light">
          Specify project details, deliverables timeline, and allocate initial budget resources.
        </p>
      </div>

      <div className="border border-zinc-800 bg-[#09090b]/40 rounded-lg p-6 sm:p-8 space-y-6">
        {errorMsg && (
          <div className="bg-red-950/20 border border-red-900/50 p-4 rounded text-xs text-red-400 flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="font-semibold">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {/* Project Title */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Project Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build a secure escrow payment module for web application"
              className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white placeholder-zinc-700 focus:outline-none"
            />
            {errors.title && (
              <p className="text-[9px] text-red-400 font-semibold mt-1">{errors.title[0]}</p>
            )}
          </div>

          {/* Project Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Project Description</label>
            <textarea
              required
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of the tasks, project scope, and deliverables..."
              className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white placeholder-zinc-700 focus:outline-none leading-relaxed resize-none"
            />
            {errors.description && (
              <p className="text-[9px] text-red-400 font-semibold mt-1">{errors.description[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Project Budget */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Project Budget (INR)</label>
              <input
                type="number"
                required
                min="1"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-white placeholder-zinc-700 focus:outline-none"
              />
              {errors.budget && (
                <p className="text-[9px] text-red-400 font-semibold mt-1">{errors.budget[0]}</p>
              )}
            </div>

            {/* Project Deadline */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Project Deadline</label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded text-xs text-zinc-400 focus:outline-none"
              />
              {errors.deadline && (
                <p className="text-[9px] text-red-400 font-semibold mt-1">{errors.deadline[0]}</p>
              )}
            </div>
          </div>

          {/* Skill Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSkillsOpen(!skillsOpen)}
                className="text-[10px] font-bold text-white uppercase tracking-wider hover:underline cursor-pointer"
              >
                {skillsOpen ? "− Hide skills selection" : "+ Add relevant skills (optional)"}
              </button>
            </div>
            {errors.skills && (
              <p className="text-[9px] text-red-400 font-semibold">{errors.skills[0]}</p>
            )}

            {skillsOpen && (
              <div className="border border-zinc-800 rounded p-4 bg-zinc-950 max-h-80 overflow-y-auto space-y-4">
                {SKILL_GROUPS.map((group) => (
                  <div key={group.category} className="space-y-1.5">
                    <h3 className="text-[8px] font-bold uppercase tracking-widest text-zinc-550">{group.category}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {group.skills.map((skill) => {
                        const isSelected = selectedSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className={`text-[9px] px-2 py-0.5 rounded transition-colors duration-150 cursor-pointer ${
                              isSelected
                                ? "bg-white text-black font-bold border border-white"
                                : "bg-transparent border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400"
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
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 border-t border-zinc-900 pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="border border-zinc-800 hover:border-zinc-750 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-white hover:bg-zinc-200 text-black font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Posting Project..." : "Post Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
