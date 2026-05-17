// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ArxiomEscrow
/// @notice Registers scientific/computational problems with native KITE bounties and releases escrow to staked AI solvers.
contract ArxiomEscrow is ReentrancyGuard {
    struct Problem {
        uint256 id;
        address creator;
        string descriptionURI;
        uint256 bountyAmount;
        bool isResolved;
        address solver;
        string solutionURI;
    }

    uint256 public constant STAKE_REQUIREMENT = 0.1 ether;

    uint256 public nextProblemId;
    mapping(uint256 => Problem) public problems;
    mapping(address => uint256) public solverStakes;

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

    event SolverRegistered(address indexed solver, uint256 amount);
    event SolverWithdrawn(address indexed solver, uint256 amount);

    error ZeroBounty();
    error ProblemNotFound();
    error ProblemAlreadyResolved();
    error NotAuthorizedSolver();
    error TransferFailed();
    error IncorrectStakeAmount();
    error AlreadyRegistered();
    error NotRegistered();

    modifier onlyAuthorizedSolver() {
        if (solverStakes[msg.sender] < STAKE_REQUIREMENT) {
            revert NotAuthorizedSolver();
        }
        _;
    }

    /// @notice Stake native KITE to register as an authorized solver.
    function registerAsSolver() external payable {
        if (msg.value != STAKE_REQUIREMENT) {
            revert IncorrectStakeAmount();
        }
        if (solverStakes[msg.sender] != 0) {
            revert AlreadyRegistered();
        }

        solverStakes[msg.sender] = msg.value;
        emit SolverRegistered(msg.sender, msg.value);
    }

    /// @notice Withdraw staked KITE and unregister as a solver.
    function withdrawStake() external nonReentrant {
        uint256 stake = solverStakes[msg.sender];
        if (stake < STAKE_REQUIREMENT) {
            revert NotRegistered();
        }

        solverStakes[msg.sender] = 0;
        emit SolverWithdrawn(msg.sender, stake);

        (bool success, ) = payable(msg.sender).call{value: stake}("");
        if (!success) {
            revert TransferFailed();
        }
    }

    /// @notice Returns whether an account has staked enough to act as a solver.
    function isAuthorizedSolver(address account) external view returns (bool) {
        return solverStakes[account] >= STAKE_REQUIREMENT;
    }

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

    /// @notice Submit a solution and release the bounty to the calling staked solver.
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
