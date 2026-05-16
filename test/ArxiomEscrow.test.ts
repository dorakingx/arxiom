import { expect } from "chai";
import { ethers } from "hardhat";
import { ArxiomEscrow } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ArxiomEscrow", function () {
  let escrow: ArxiomEscrow;
  let owner: HardhatEthersSigner;
  let creator: HardhatEthersSigner;
  let solver: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  const bounty = ethers.parseEther("1.0");
  const descriptionURI = "ipfs://problem-spec";
  const solutionURI = "ipfs://aggregated-solution";

  beforeEach(async function () {
    [owner, creator, solver, stranger] = await ethers.getSigners();

    const Escrow = await ethers.getContractFactory("ArxiomEscrow");
    escrow = await Escrow.deploy(owner.address);
    await escrow.waitForDeployment();

    await escrow.connect(owner).authorizeSolver(solver.address);
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

  it("releases bounty to an authorized solver", async function () {
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
