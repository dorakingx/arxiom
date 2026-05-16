import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Escrow = await ethers.getContractFactory("ArxiomEscrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  const stakeRequirement = await escrow.STAKE_REQUIREMENT();

  console.log("ArxiomEscrow deployed to:", address);
  console.log(
    "Solver stake requirement:",
    ethers.formatEther(stakeRequirement),
    "KITE"
  );
  console.log(
    "Agents must call registerAsSolver() with the exact stake amount before solving problems."
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
