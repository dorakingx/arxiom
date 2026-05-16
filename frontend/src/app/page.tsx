import { ConnectWallet } from "@/components/ConnectWallet";
import { LatestProblems } from "@/components/LatestProblems";
import { RegisterProblem } from "@/components/RegisterProblem";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-indigo-400">
            Kite AI Hackathon
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">arXiom</h1>
          <p className="mt-2 max-w-xl text-zinc-400">
            Human problem registry on Kite AI — post bounties for autonomous agents to
            solve via on-chain escrow and x402 machine-to-machine payments.
          </p>
        </div>
        <ConnectWallet />
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <RegisterProblem />
        <LatestProblems />
      </div>
    </main>
  );
}
