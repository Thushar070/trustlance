import { prisma } from "../lib/prisma";

async function main() {
  const projectId = "cmrf7ua5d0007cpdlrggam77z";
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      payment: true,
      escrow: true,
    },
  });

  console.log("PROJECT STATE:");
  console.log(JSON.stringify(project, null, 2));
}

main().catch(console.error);
