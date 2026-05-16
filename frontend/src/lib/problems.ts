import type { Address } from "viem";

export type ProblemStatus = "Open" | "Solved";

export type ProblemRow = {
  id: bigint;
  creator: Address;
  descriptionURI: string;
  bountyAmount: bigint;
  status: ProblemStatus;
  solver?: Address;
  solutionURI?: string;
};

export function mergeProblemCreated(
  problems: Map<string, ProblemRow>,
  problemId: bigint,
  creator: Address,
  descriptionURI: string,
  bountyAmount: bigint,
): Map<string, ProblemRow> {
  const next = new Map(problems);
  const key = problemId.toString();
  const existing = next.get(key);
  next.set(key, {
    id: problemId,
    creator,
    descriptionURI,
    bountyAmount,
    status: existing?.status === "Solved" ? "Solved" : "Open",
    solver: existing?.solver,
    solutionURI: existing?.solutionURI,
  });
  return next;
}

export function mergeProblemSolved(
  problems: Map<string, ProblemRow>,
  problemId: bigint,
  solver: Address,
  solutionURI: string,
): Map<string, ProblemRow> {
  const next = new Map(problems);
  const key = problemId.toString();
  const existing = next.get(key);
  next.set(key, {
    id: problemId,
    creator: existing?.creator ?? ("0x0000000000000000000000000000000000000000" as Address),
    descriptionURI: existing?.descriptionURI ?? "",
    bountyAmount: existing?.bountyAmount ?? BigInt(0),
    status: "Solved",
    solver,
    solutionURI,
  });
  return next;
}

export function sortProblems(problems: Map<string, ProblemRow>): ProblemRow[] {
  return Array.from(problems.values()).sort((a, b) =>
    a.id > b.id ? -1 : a.id < b.id ? 1 : 0,
  );
}
