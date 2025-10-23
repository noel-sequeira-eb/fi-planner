import type { PlanInputs, Property, SimulationResults, YearSummary } from "@shared/schema";

export function yearlyInflate(amt: number, rate: number, years: number): number {
  return amt * Math.pow(1 + rate, years);
}

export function monthlyPayment(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 12;
  const n = Math.max(1, Math.round(years * 12));
  if (annualRate <= 0 || principal <= 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

interface RentalState extends Property {
  mortBal: number;
  mortPmt: number;
  active: boolean;
}

export function simulate(inputs: PlanInputs, properties: Property[]): SimulationResults {
  const months = Math.max(12, Math.round(inputs.horizonYears * 12));

  // Convert percentages to decimals
  const primaryRate = inputs.primaryRate / 100;
  const helocRate = inputs.helocRate / 100;
  const taxRate = inputs.taxRate / 100;
  const dividendYield = inputs.dividendYield / 100;
  const totalReturn = inputs.totalReturn / 100;
  const inflation = inputs.inflation / 100;
  const rentalRate = inputs.rentalRate / 100;
  const rentalLtv = inputs.rentalLtv / 100;
  const maxLtv = inputs.maxLtv / 100;
  const maxHelocLtv = inputs.maxHelocLtv / 100;

  // Calculate mortgage payment
  const mortPmt = monthlyPayment(inputs.mortgageBalance, primaryRate, inputs.amortYears);
  
  let mortBal = inputs.mortgageBalance;
  let locBal = 0;
  let portBal = 0;
  let interestAccruedThisYear = 0;

  // Setup rentals
  const rentals: RentalState[] = properties.map(p => ({
    ...p,
    capRate: p.capRate / 100,
    mortBal: p.price * rentalLtv,
    mortPmt: monthlyPayment(p.price * rentalLtv, rentalRate, inputs.rentalAmortYears),
    active: false,
  }));

  // Time series arrays
  const monthsArr: number[] = [];
  const mortBalArr: number[] = [];
  const locBalArr: number[] = [];
  const portBalArr: number[] = [];
  const dividendsArr: number[] = [];
  const helocInterestArr: number[] = [];
  const rentalNetArr: number[] = [];
  const netCashflowArr: number[] = [];
  const taxSavingsAppliedArr: number[] = [];

  for (let m = 1; m <= months; m++) {
    const currentHomeValue = inputs.homeValue; // Could model appreciation if needed
    const maxCombined = currentHomeValue * maxLtv; // Max combined mortgage + HELOC
    const maxHelocOnly = currentHomeValue * maxHelocLtv; // Max HELOC standalone
    
    // Helper function to calculate current available HELOC room
    const calculateAvailableRoom = () => Math.max(0, Math.min(
      maxCombined - (mortBal + locBal),
      maxHelocOnly - locBal
    ));

    // Activate rentals at purchase month
    rentals.forEach(r => {
      if (!r.active && m >= r.purchaseMonth) {
        r.active = true;
        if (r.useHeloc) {
          const dp = r.price * (1 - rentalLtv);
          // Only draw down payment if room available
          const availableRoom = calculateAvailableRoom();
          const actualDraw = Math.min(dp, availableRoom);
          locBal += actualDraw;
          // Note: If insufficient room, the remainder would need alternative financing
        }
      }
    });

    // Primary mortgage payment
    const mortInt = mortBal * (primaryRate / 12);
    let mortPrin = Math.min(mortPmt - mortInt, mortBal);
    if (mortPrin < 0) mortPrin = 0;
    mortBal = Math.max(0, mortBal - mortPrin);

    // Extra prepayment
    const extra = Math.min(inputs.extraPrepay, mortBal);
    mortBal = Math.max(0, mortBal - extra);

    // Smith manoeuvre: reborrow principal + extra, but cap to available HELOC room
    // Calculate room AFTER mortgage payments to capture freed-up capacity
    const desiredReborrow = mortPrin + extra;
    const availableRoom = calculateAvailableRoom();
    const actualReborrow = Math.min(desiredReborrow, availableRoom);
    locBal += actualReborrow;
    portBal += actualReborrow;

    // HELOC interest
    const locInt = locBal * (helocRate / 12);
    interestAccruedThisYear += locInt;

    if (inputs.capitalizeInterest) {
      // Cap capitalized interest to available HELOC room
      const roomForInterest = calculateAvailableRoom();
      const actualCapitalized = Math.min(locInt, roomForInterest);
      locBal += actualCapitalized;
      // Note: If room is insufficient, the remainder would need to be paid in cash
    }

    // Portfolio growth
    const div = portBal * (dividendYield / 12);
    const priceRet = totalReturn - dividendYield;
    const growth = portBal * (priceRet / 12);
    portBal += growth + div;

    // Rental cashflow
    let monthlyRentalNet = 0;
    rentals.forEach(r => {
      if (!r.active) return;
      const noi = (r.price * r.capRate) / 12;
      const rInt = r.mortBal * (rentalRate / 12);
      const rPrin = Math.min(r.mortPmt - rInt, r.mortBal);
      r.mortBal = Math.max(0, r.mortBal - rPrin);
      monthlyRentalNet += noi - r.mortPmt;
    });

    // Year-end tax savings applied to mortgage
    let taxApplied = 0;
    if (m % 12 === 0) {
      const taxSavings = interestAccruedThisYear * taxRate;
      // Can only apply tax savings up to available HELOC room and existing mortgage balance
      const currentAvailableRoom = calculateAvailableRoom();
      taxApplied = Math.min(taxSavings, mortBal, currentAvailableRoom);
      mortBal = Math.max(0, mortBal - taxApplied);
      locBal += taxApplied;
      portBal += taxApplied;
      interestAccruedThisYear = 0;
    }

    // Net cashflow
    const helocInterestPaid = inputs.capitalizeInterest ? 0 : locInt;
    const netCashflow = monthlyRentalNet - helocInterestPaid;

    // Store values
    monthsArr.push(m);
    mortBalArr.push(mortBal);
    locBalArr.push(locBal);
    portBalArr.push(portBal);
    dividendsArr.push(div);
    helocInterestArr.push(locInt);
    rentalNetArr.push(monthlyRentalNet);
    netCashflowArr.push(netCashflow);
    taxSavingsAppliedArr.push(taxApplied);
  }

  // Year summaries
  function yearSummary(year: number): YearSummary | null {
    const idx = Math.min(monthsArr.length, year * 12) - 1;
    if (idx < 0) return null;
    
    const mort = mortBalArr[idx];
    const loc = locBalArr[idx];
    const port = portBalArr[idx];

    const annDiv = dividendsArr.slice(Math.max(0, idx - 11), idx + 1).reduce((a, b) => a + b, 0);
    const annLocInt = helocInterestArr.slice(Math.max(0, idx - 11), idx + 1).reduce((a, b) => a + b, 0);
    const annRentalNet = rentalNetArr.slice(Math.max(0, idx - 11), idx + 1).reduce((a, b) => a + b, 0);
    const annTaxSavings = annLocInt * taxRate;
    const interestPaid = inputs.capitalizeInterest ? 0 : annLocInt;
    const netInvestIncome = annDiv + annRentalNet - interestPaid;

    return { mort, loc, port, annDiv, annLocInt, annRentalNet, annTaxSavings, netInvestIncome };
  }

  const y5 = Math.min(5, inputs.horizonYears);
  const y10 = Math.min(10, inputs.horizonYears);
  const s5 = yearSummary(y5);
  const s10 = yearSummary(y10);

  const target5 = yearlyInflate(inputs.salaryTarget, inflation, y5);
  const target10 = yearlyInflate(inputs.salaryTarget, inflation, y10);

  return {
    inputs,
    monthsArr,
    mortBalArr,
    locBalArr,
    portBalArr,
    dividendsArr,
    helocInterestArr,
    rentalNetArr,
    netCashflowArr,
    taxSavingsAppliedArr,
    s5,
    s10,
    target5,
    target10,
  };
}
