import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Escrow = await ethers.getContractFactory("ArxiomEscrow");
  const escrow = await Escrow.deploy(deployer.address);
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("ArxiomEscrow deployed to:", address);

  const masterAgentAddress = process.env.MASTER_AGENT_ADDRESS;
  if (masterAgentAddress) {
    const tx = await escrow.authorizeSolver(masterAgentAddress);
    await tx.wait();
    console.log("Authorized master agent solver:", masterAgentAddress);
  } else {
    console.log(
      "Set MASTER_AGENT_ADDRESS in .env to authorize the master agent after deploy."
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
