import { expect } from "chai";
import { ethers } from "hardhat";
import { ArxiomEscrow } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ArxiomEscrow", function () {
  let escrow: ArxiomEscrow;
  let creator: HardhatEthersSigner;
  let solver: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  const bounty = ethers.parseEther("1.0");
  const descriptionURI = "ipfs://problem-spec";
  const solutionURI = "ipfs://aggregated-solution";
  let stakeRequirement: bigint;

  beforeEach(async function () {
    [, creator, solver, stranger] = await ethers.getSigners();

    const Escrow = await ethers.getContractFactory("ArxiomEscrow");
    escrow = await Escrow.deploy();
    await escrow.waitForDeployment();

    stakeRequirement = await escrow.STAKE_REQUIREMENT();
    await escrow.connect(solver).registerAsSolver({ value: stakeRequirement });
  });

  it("registers a solver with the required stake", async function () {
    const freshEscrow = await (await ethers.getContractFactory("ArxiomEscrow")).deploy();
    await freshEscrow.waitForDeployment();

    await expect(
      freshEscrow.connect(stranger).registerAsSolver({ value: stakeRequirement })
    )
      .to.emit(freshEscrow, "SolverRegistered")
      .withArgs(stranger.address, stakeRequirement);

    expect(await freshEscrow.solverStakes(stranger.address)).to.equal(stakeRequirement);
    expect(await freshEscrow.isAuthorizedSolver(stranger.address)).to.equal(true);
  });

  it("rejects incorrect stake amounts", async function () {
    const freshEscrow = await (await ethers.getContractFactory("ArxiomEscrow")).deploy();
    await freshEscrow.waitForDeployment();

    await expect(
      freshEscrow.connect(stranger).registerAsSolver({
        value: stakeRequirement - 1n,
      })
    ).to.be.revertedWithCustomError(freshEscrow, "IncorrectStakeAmount");
  });

  it("rejects double registration", async function () {
    await expect(
      escrow.connect(solver).registerAsSolver({ value: stakeRequirement })
    ).to.be.revertedWithCustomError(escrow, "AlreadyRegistered");
  });

  it("withdraws stake and allows re-registration", async function () {
    const balanceBefore = await ethers.provider.getBalance(solver.address);

    const tx = await escrow.connect(solver).withdrawStake();
    const receipt = await tx.wait();
    const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

    const balanceAfter = await ethers.provider.getBalance(solver.address);
    expect(balanceAfter - balanceBefore + gasUsed).to.equal(stakeRequirement);
    expect(await escrow.solverStakes(solver.address)).to.equal(0n);

    await expect(escrow.connect(solver).registerAsSolver({ value: stakeRequirement }))
      .to.emit(escrow, "SolverRegistered")
      .withArgs(solver.address, stakeRequirement);
  });

  it("rejects withdraw without stake", async function () {
    await expect(escrow.connect(stranger).withdrawStake()).to.be.revertedWithCustomError(
      escrow,
      "NotRegistered"
    );
  });

  it("creates a problem with a native bounty", async function () {
    await expect(
      escrow.connect(creator).createProblem(descriptionURI, { value: bounty })
    )
      .to.emit(escrow, "ProblemCreated")
      .withArgs(0n, creator.address, descriptionURI, bounty);

    const problem = await escrow.getProblem(0);
    expect(problem.creator).to.equal(creator.address);
    expect(problem.descriptionURI).to.equal(descriptionURI);
    expect(problem.bountyAmount).to.equal(bounty);
    expect(problem.isResolved).to.equal(false);
  });

  it("rejects zero-value bounties", async function () {
    await expect(
      escrow.connect(creator).createProblem(descriptionURI, { value: 0 })
    ).to.be.revertedWithCustomError(escrow, "ZeroBounty");
  });

  it("rejects unauthorized solvers", async function () {
    await escrow.connect(creator).createProblem(descriptionURI, { value: bounty });

    await expect(
      escrow.connect(stranger).solveProblem(0, solutionURI)
    ).to.be.revertedWithCustomError(escrow, "NotAuthorizedSolver");
  });

  it("releases bounty to a staked solver", async function () {
    await escrow.connect(creator).createProblem(descriptionURI, { value: bounty });

    const balanceBefore = await ethers.provider.getBalance(solver.address);

    const tx = await escrow.connect(solver).solveProblem(0, solutionURI);
    const receipt = await tx.wait();
    const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

    const balanceAfter = await ethers.provider.getBalance(solver.address);
    expect(balanceAfter - balanceBefore + gasUsed).to.equal(bounty);

    const problem = await escrow.getProblem(0);
    expect(problem.isResolved).to.equal(true);
    expect(problem.solver).to.equal(solver.address);
    expect(problem.solutionURI).to.equal(solutionURI);
  });

  it("cannot solve the same problem twice", async function () {
    await escrow.connect(creator).createProblem(descriptionURI, { value: bounty });
    await escrow.connect(solver).solveProblem(0, solutionURI);

    await expect(
      escrow.connect(solver).solveProblem(0, solutionURI)
    ).to.be.revertedWithCustomError(escrow, "ProblemAlreadyResolved");
  });
});
