// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ArxiomEscrow
/// @notice Registers scientific/computational problems with native KITE bounties and releases escrow to authorized AI solvers.
contract ArxiomEscrow is Ownable, ReentrancyGuard {
    struct Problem {
        uint256 id;
        address creator;
        string descriptionURI;
        uint256 bountyAmount;
        bool isResolved;
        address solver;
        string solutionURI;
    }

    uint256 public nextProblemId;
    mapping(uint256 => Problem) public problems;
    mapping(address => bool) public authorizedSolvers;

    event ProblemCreated(
        uint256 indexed problemId,
        address indexed creator,
        string descriptionURI,
        uint256 bountyAmount
    );

    event ProblemSolved(
        uint256 indexed problemId,
        address indexed solver,
        string solutionURI
    );

    event SolverAuthorized(address indexed solver);
    event SolverRevoked(address indexed solver);

    error ZeroBounty();
    error ProblemNotFound();
    error ProblemAlreadyResolved();
    error NotAuthorizedSolver();
    error TransferFailed();

    modifier onlyAuthorizedSolver() {
        if (!authorizedSolvers[msg.sender]) {
            revert NotAuthorizedSolver();
        }
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Register a new problem and lock a native KITE bounty.
    function createProblem(
        string calldata descriptionURI
    ) external payable returns (uint256 problemId) {
        if (msg.value == 0) {
            revert ZeroBounty();
        }

        problemId = nextProblemId++;
        problems[problemId] = Problem({
            id: problemId,
            creator: msg.sender,
            descriptionURI: descriptionURI,
            bountyAmount: msg.value,
            isResolved: false,
            solver: address(0),
            solutionURI: ""
        });

        emit ProblemCreated(problemId, msg.sender, descriptionURI, msg.value);
    }

    /// @notice Submit a solution and release the bounty to the calling authorized solver.
    function solveProblem(
        uint256 problemId,
        string calldata solutionURI
    ) external onlyAuthorizedSolver nonReentrant {
        Problem storage problem = problems[problemId];
        if (problem.creator == address(0)) {
            revert ProblemNotFound();
        }
        if (problem.isResolved) {
            revert ProblemAlreadyResolved();
        }

        uint256 bounty = problem.bountyAmount;
        problem.isResolved = true;
        problem.solver = msg.sender;
        problem.solutionURI = solutionURI;

        emit ProblemSolved(problemId, msg.sender, solutionURI);

        (bool success, ) = payable(msg.sender).call{value: bounty}("");
        if (!success) {
            revert TransferFailed();
        }
    }

    /// @notice Register an AI agent wallet allowed to call solveProblem.
    function authorizeSolver(address solver) external onlyOwner {
        authorizedSolvers[solver] = true;
        emit SolverAuthorized(solver);
    }

    /// @notice Revoke solver permissions for an agent wallet.
    function revokeSolver(address solver) external onlyOwner {
        authorizedSolvers[solver] = false;
        emit SolverRevoked(solver);
    }

    /// @notice Read a problem by id.
    function getProblem(
        uint256 problemId
    )
        external
        view
        returns (
            uint256 id,
            address creator,
            string memory descriptionURI,
            uint256 bountyAmount,
            bool isResolved,
            address solver,
            string memory solutionURI
        )
    {
        Problem storage problem = problems[problemId];
        if (problem.creator == address(0)) {
            revert ProblemNotFound();
        }
        return (
            problem.id,
            problem.creator,
            problem.descriptionURI,
            problem.bountyAmount,
            problem.isResolved,
            problem.solver,
            problem.solutionURI
        );
    }
}
