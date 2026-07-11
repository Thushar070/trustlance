export interface SkillGroup {
  category: string;
  skills: string[];
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    category: "Frontend",
    skills: ["React", "Next.js", "Vue.js", "Angular", "HTML/CSS", "Tailwind CSS", "TypeScript", "JavaScript"],
  },
  {
    category: "Backend",
    skills: ["Node.js", "Express", "NestJS", "Go", "Python", "Django", "Ruby on Rails", "FastAPI"],
  },
  {
    category: "Mobile",
    skills: ["React Native", "Flutter", "Swift", "Kotlin", "Objective-C"],
  },
  {
    category: "Database",
    skills: ["PostgreSQL", "MongoDB", "Redis", "MySQL", "Prisma ORM", "Cassandra"],
  },
  {
    category: "Cloud / DevOps",
    skills: ["AWS", "Docker", "Kubernetes", "Vercel", "GitHub Actions", "Google Cloud", "CI/CD"],
  },
  {
    category: "UI / UX",
    skills: ["Figma", "Adobe XD", "Sketch", "Prototyping"],
  },
  {
    category: "AI / ML",
    skills: ["TensorFlow", "PyTorch", "OpenAI API", "Machine Learning", "Data Science"],
  },
  {
    category: "Blockchain",
    skills: ["Solidity", "Web3.js", "Ethereum", "Smart Contracts"],
  },
  {
    category: "Testing",
    skills: ["Jest", "Playwright", "Cypress", "Testing Library"],
  },
];

// Flattened list of all valid skills for quick lookup and validation
export const ALL_SKILLS: string[] = SKILL_GROUPS.reduce<string[]>(
  (acc, group) => [...acc, ...group.skills],
  []
);

/**
 * Validates whether a given skill list consists entirely of predefined skills.
 */
export function isValidSkill(skill: string): boolean {
  return ALL_SKILLS.includes(skill);
}
