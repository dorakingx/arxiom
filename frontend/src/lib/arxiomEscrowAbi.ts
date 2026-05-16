export const arxiomEscrowAbi = [
  {
    "inputs": [],
    "name": "AlreadyRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "IncorrectStakeAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotAuthorizedSolver",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ProblemAlreadyResolved",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ProblemNotFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroBounty",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "problemId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "descriptionURI",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "bountyAmount",
        "type": "uint256"
      }
    ],
    "name": "ProblemCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "problemId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "solver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "solutionURI",
        "type": "string"
      }
    ],
    "name": "ProblemSolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "solver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "SolverRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "solver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "SolverWithdrawn",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "STAKE_REQUIREMENT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "descriptionURI",
        "type": "string"
      }
    ],
    "name": "createProblem",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "problemId",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "problemId",
        "type": "uint256"
      }
    ],
    "name": "getProblem",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "descriptionURI",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "bountyAmount",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isResolved",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "solver",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "solutionURI",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "isAuthorizedSolver",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextProblemId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "problems",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "descriptionURI",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "bountyAmount",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isResolved",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "solver",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "solutionURI",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "registerAsSolver",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "problemId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "solutionURI",
        "type": "string"
      }
    ],
    "name": "solveProblem",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "solverStakes",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawStake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
