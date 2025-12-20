export type AppLink = {
  name: string;
  description: string;
  href: string;
  icon: "table" | "tank" | "finance" | "sim";
};

export const apps: AppLink[] = [
  {
    name: "Aflossingstabel",
    description: "Mortgage / loan repayment table, deterministic and transparent.",
    href: "https://steefware.com/aflossingstabel",
    icon: "table",
  },
  {
    name: "Tank Level Calculator",
    description: "Simple calculator for tank fill levels.",
    href: "https://steefware.com/tanklevel",
    icon: "tank",
  },
  {
    name: "VVPRBIS",
    description: "Clear, focused tooling for Belgian VVPR-bis dividend planning.",
    href: "https://steefware.com/vvprbis",
    icon: "finance",
  },
  {
    name: "StockSim",
    description: "A minimal stock market simulator for learning and testing ideas.",
    href: "https://steefware.com/stocksim",
    icon: "sim",
  },
];
