import { z } from "zod";

// Financial planner types - no database needed, all client-side

export const propertySchema = z.object({
  name: z.string(),
  price: z.number().min(0),
  capRate: z.number().min(0).max(100),
  purchaseMonth: z.number().min(1),
  useHeloc: z.boolean(),
});

export const inputsSchema = z.object({
  // Home & HELOC
  homeValue: z.number().min(0),
  mortgageBalance: z.number().min(0),
  primaryRate: z.number().min(0).max(100),
  amortYears: z.number().min(1),
  extraPrepay: z.number().min(0),
  helocRate: z.number().min(0).max(100),
  maxLtv: z.number().min(1).max(95),
  maxHelocLtv: z.number().min(1).max(95),
  taxRate: z.number().min(0).max(100),
  capitalizeInterest: z.boolean(),
  
  // Portfolio
  dividendYield: z.number().min(0).max(100),
  totalReturn: z.number().min(0).max(100),
  inflation: z.number().min(0).max(100),
  
  // Rentals
  rentalRate: z.number().min(0).max(100),
  rentalAmortYears: z.number().min(1),
  rentalLtv: z.number().min(1).max(100),
  
  // Plan
  horizonYears: z.number().min(1),
  retirementYear: z.number().min(1),
  salaryTarget: z.number().min(0),
});

export type Property = z.infer<typeof propertySchema>;
export type PlanInputs = z.infer<typeof inputsSchema>;

export interface SimulationResults {
  inputs: PlanInputs;
  monthsArr: number[];
  mortBalArr: number[];
  locBalArr: number[];
  portBalArr: number[];
  dividendsArr: number[];
  helocInterestArr: number[];
  rentalNetArr: number[];
  netCashflowArr: number[];
  taxSavingsAppliedArr: number[];
  s5: YearSummary | null;
  s10: YearSummary | null;
  target5: number;
  target10: number;
}

export interface YearSummary {
  mort: number;
  loc: number;
  port: number;
  annDiv: number;
  annLocInt: number;
  annRentalNet: number;
  annTaxSavings: number;
  netInvestIncome: number;
}
