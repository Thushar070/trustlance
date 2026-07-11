import { prisma } from "../lib/prisma";
import { EscrowService } from "../lib/services/escrow-service";
import { EscrowStatus } from "@prisma/client";

async function main() {
  const projectId = "cmrf7ua5d0007cpdlrggam77z";
  
  const escrow = await EscrowService.createEscrowForProject(projectId);
  
  if (escrow.status === EscrowStatus.CREATED) {
    await EscrowService.transition(escrow.id, EscrowStatus.HOLDING, "SYSTEM_AUTO_RELEASE");
    console.log("Escrow record created and transitioned to HOLDING successfully!");
  } else {
    console.log(`Escrow already exists in status: ${escrow.status}`);
  }
}

main().catch(console.error);
