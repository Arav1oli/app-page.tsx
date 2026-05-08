import { SHOW_BOATS } from "./show-boats"

export type Payer = "Schaefer" | "Flagship" | "Owner" | "FS" | "TBD"

export type PayerAllocation = {
  boat: string
  payer: Payer
  amount: number
  note?: string
}

// Allocations from the verbal brief; "TBD" rows still need a decision.
// NOTE: Pred 64 cost is $9,800 but the brief said "owner pays 10k, FS pays rest".
// Capped owner share at the line cost; flag with the team to confirm.
export const PAYER_ALLOCATIONS: PayerAllocation[] = [
  { boat: "Schaefer V44",            payer: "Schaefer", amount: 5561.86 },
  { boat: "Schaefer 380",            payer: "Schaefer", amount: 4431.90 },
  { boat: "Schaefer 375",            payer: "Schaefer", amount: 4116.00 },

  { boat: "Nordhavn 68",             payer: "Flagship", amount: 12595.55 },
  { boat: "Nordhavn 41",             payer: "Flagship", amount: 5235.55 },

  { boat: "Nordhavn 55",             payer: "Owner",    amount: 9194.76 },
  { boat: "Saxdor 320",              payer: "Owner",    amount: 3123.06 },
  { boat: "Grady White 303",         payer: "Owner",    amount: 2916.48 },
  { boat: "Sunseeker 64 Predator",   payer: "Owner",    amount: 9800.00, note: "Owner cap $10k; cost only $9,800 — confirm" },
  { boat: "Sunseeker 64 Predator",   payer: "FS",       amount: 0,       note: "Top-up over $10k owner cap; nothing due unless cost rises" },

  { boat: "Marex 330 Scandinavia",   payer: "TBD",      amount: 3332.00 },
  { boat: "Sunseeker 82 Predator",   payer: "TBD",      amount: 14700.00, note: "Audrey raising" },
  { boat: "Sunseeker 95",            payer: "TBD",      amount: 17836.00, note: "audrey" },
  { boat: "Schaefer 510 fly",        payer: "TBD",      amount: 3391.34 },
]

export function tallyByPayer(): Record<Payer, number> {
  const out: Record<Payer, number> = { Schaefer: 0, Flagship: 0, Owner: 0, FS: 0, TBD: 0 }
  for (const a of PAYER_ALLOCATIONS) out[a.payer] += a.amount
  return out
}

export const GRAND_TOTAL = SHOW_BOATS.reduce((s, b) => s + b.costAt98PerM2, 0)
