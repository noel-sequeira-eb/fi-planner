// FI Planner – Smith Manoeuvre + Rentals
// All client-side: calculations + charts + CSV export.
// Not financial or tax advice.

const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
const fmt2 = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
const pct = (x) => `${(x*100).toFixed(1)}%`;
const dec = (x) => Number.isFinite(x) ? x : 0;

function yearlyInflate(amt, rate, years) {
  return amt * Math.pow(1 + rate, years);
}

function monthlyPayment(principal, annualRate, years) {
  const r = annualRate / 12;
  const n = Math.max(1, Math.round(years * 12));
  if (annualRate <= 0 || principal <= 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function addPropertyRow(name = "Rental #1", price=700000, capRate=6.5, month=6, useHeloc=true) {
  const tbody = $("#propertiesTable").querySelector("tbody");
  const idx = tbody.children.length + 1;
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" value="${name}" class="prop-name"></td>
    <td><input type="number" value="${price}" min="0" step="1000" class="prop-price"></td>
    <td><input type="number" value="${capRate}" min="0" step="0.1" class="prop-cap"></td>
    <td><input type="number" value="${month}" min="1" step="1" class="prop-month"></td>
    <td style="text-align:center"><input type="checkbox" class="prop-use-heloc" ${useHeloc ? 'checked' : ''}></td>
    <td><button class="btn btn-ghost btn-sm remove">Remove</button></td>
  `;
  tbody.appendChild(tr);
  tr.querySelector(".remove").addEventListener("click", () => tr.remove());
}

// Default two properties
addPropertyRow("Rental #1", 750000, 6.5, 6, true);
addPropertyRow("Rental #2", 750000, 6.75, 18, true);

// capacity snapshot update
function updateCapacity() {
  const homeVal = +$("#homeValue").value || 0;
  const mortBal = +$("#mortgageBalance").value || 0;
  const maxLtv = (+$("#maxLtv").value || 80) / 100;
  const maxHelocLtv = (+$("#maxHelocLtv").value || 65) / 100;
  const maxCLP = homeVal * maxLtv;
  const helocCap = homeVal * maxHelocLtv;
  const room = Math.max(0, maxCLP - mortBal);

  $("#maxCltv").textContent = fmt.format(maxCLP);
  $("#helocRoom").textContent = fmt.format(room);
  $("#helocCap").textContent = fmt.format(helocCap);
  $("#existingMortgage").textContent = fmt.format(mortBal);
}

["homeValue","mortgageBalance","maxLtv","maxHelocLtv"].forEach(id => {
  $(id).addEventListener("input", updateCapacity);
});
updateCapacity();

// Core simulation
function simulate() {
  // Inputs
  const inputs = {
    homeValue: +$("#homeValue").value,
    mortgageBalance: +$("#mortgageBalance").value,
    primaryRate: (+$("#primaryRate").value)/100,
    amortYears: +$("#amortYears").value,
    extraPrepay: +$("#extraPrepay").value,
    helocRate: (+$("#helocRate").value)/100,
    taxRate: (+$("#taxRate").value)/100,
    dividendYield: (+$("#dividendYield").value)/100,
    totalReturn: (+$("#totalReturn").value)/100,
    inflation: (+$("#inflation").value)/100,
    rentalRate: (+$("#rentalRate").value)/100,
    rentalAmortYears: +$("#rentalAmortYears").value,
    rentalLtv: (+$("#rentalLtv").value)/100,
    capitalizeInterest: $("#capitalizeInterest").checked,
    horizonYears: +$("#horizonYears").value,
    retirementYear: +$("#retirementYear").value,
    salaryTarget: +$("#salaryTarget").value,
    maxLtv: (+$("#maxLtv").value)/100,
    maxHelocLtv: (+$("#maxHelocLtv").value)/100,
  };

  const months = Math.max(12, Math.round(inputs.horizonYears * 12));

  // Properties
  const props = [];
  const rows = $("#propertiesTable").querySelector("tbody").children;
  for (let r of rows) {
    const name = r.querySelector(".prop-name").value;
    const price = +r.querySelector(".prop-price").value;
    const cap = (+r.querySelector(".prop-cap").value)/100;
    const m = +r.querySelector(".prop-month").value;
    const useHeloc = r.querySelector(".prop-use-heloc").checked;
    if (price > 0 && cap >= 0 && m >= 1) {
      props.push({ name, price, cap, month: Math.min(months, Math.max(1, Math.round(m))), useHeloc });
    }
  }

  // Derived
  const mortPmt = monthlyPayment(inputs.mortgageBalance, inputs.primaryRate, inputs.amortYears);
  let mortBal = inputs.mortgageBalance;
  let locBal = 0; // investment LOC
  let portBal = 0; // invested portfolio (non-registered)
  let interestAccruedThisYear = 0;
  let taxSavingsPool = 0;

  // Rentals setup
  const rentals = props.map(p => ({
    ...p,
    mortBal: p.price * inputs.rentalLtv,
    mortPmt: monthlyPayment(p.price * inputs.rentalLtv, inputs.rentalRate, inputs.rentalAmortYears),
    active: false,
  }));

  // Timeseries
  const monthsArr = [];
  const mortBalArr = [];
  const locBalArr = [];
  const portBalArr = [];
  const dividendsArr = [];
  const helocInterestArr = [];
  const rentalNetArr = [];
  const netCashflowArr = [];
  const taxSavingsAppliedArr = [];

  for (let m = 1; m <= months; m++) {
    // Turn on rentals at purchase month; draw down payment from LOC if flagged
    rentals.forEach(r => {
      if (!r.active && m >= r.month) {
        r.active = true;
        if (r.useHeloc) {
          const dp = r.price * (1 - inputs.rentalLtv);
          locBal += dp;     // draw on LOC for down payment
          portBal += 0;     // (down payment is going to property, not into portfolio)
        }
      }
    });

    // Mortgage period
    let mortInt = mortBal * (inputs.primaryRate / 12);
    let mortPrin = Math.min(mortPmt - mortInt, mortBal);
    if (mortPrin < 0) mortPrin = 0;
    mortBal = Math.max(0, mortBal - mortPrin);

    // Extra prepayment
    let extra = Math.min(inputs.extraPrepay, mortBal);
    mortBal = Math.max(0, mortBal - extra);

    // Re-borrow the principal + extra (Smith manoeuvre)
    const reborrow = mortPrin + extra;
    locBal += reborrow;
    // Invest reborrow
    portBal += reborrow;

    // HELOC interest
    const locInt = locBal * (inputs.helocRate / 12);
    interestAccruedThisYear += locInt;

    if (inputs.capitalizeInterest) {
      // Borrow to pay interest (capitalized)
      locBal += locInt; // increases balance; no cashflow hit
    }

    // Portfolio growth
    const div = portBal * (inputs.dividendYield / 12);
    const priceRet = inputs.totalReturn - inputs.dividendYield;
    const growth = portBal * (priceRet / 12);
    // Reinvest dividends by default
    portBal += growth + div;

    // Rental cashflow
    let monthlyRentalNet = 0;
    rentals.forEach(r => {
      if (!r.active) return;
      const noi = (r.price * r.cap) / 12; // NOI, net of expenses
      const rInt = r.mortBal * (inputs.rentalRate / 12);
      const rPrin = Math.min(r.mortPmt - rInt, r.mortBal);
      r.mortBal = Math.max(0, r.mortBal - rPrin);
      monthlyRentalNet += noi - r.mortPmt; // HELOC interest for DP already counted in locInt
    });

    // Apply tax savings at year-end as lump-sum to mortgage and re-borrow
    let taxApplied = 0;
    if (m % 12 === 0) {
      const taxSavings = interestAccruedThisYear * inputs.taxRate;
      taxApplied = Math.min(taxSavings, mortBal);
      mortBal = Math.max(0, mortBal - taxApplied);
      locBal += taxApplied;    // reborrowing the prepayment
      // Invest the reborrowed amount
      portBal += taxApplied;
      interestAccruedThisYear = 0;
    }

    // Net cashflow to user
    // If interest is NOT capitalized, it's an outflow. Dividends/re-allocations are reinvested here; for "spendable", we report separately later.
    const helocInterestPaid = inputs.capitalizeInterest ? 0 : locInt;
    const netCashflow = monthlyRentalNet - helocInterestPaid; // dividends reinvested in this base model

    // Store
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

  // Summaries at Year 5 and 10 (or horizon)
  function yearSummary(year) {
    const idx = Math.min(monthsArr.length, year * 12) - 1;
    if (idx < 0) return null;
    const mort = mortBalArr[idx];
    const loc = locBalArr[idx];
    const port = portBalArr[idx];

    // Annualized figures around that time
    const annDiv = dividendsArr.slice(idx-11, idx+1).reduce((a,b)=>a+b,0);
    const annLocInt = helocInterestArr.slice(idx-11, idx+1).reduce((a,b)=>a+b,0);
    const annRentalNet = rentalNetArr.slice(idx-11, idx+1).reduce((a,b)=>a+b,0);
    const annTaxSavings = annLocInt * inputs.taxRate;
    // Treat "spendable from investments" as dividends + rental net - (if interest paid in cash)
    const interestPaid = inputs.capitalizeInterest ? 0 : annLocInt;
    const netInvestIncome = annDiv + annRentalNet - interestPaid;

    return { mort, loc, port, annDiv, annLocInt, annRentalNet, annTaxSavings, netInvestIncome };
  }

  const y5 = Math.min(5, inputs.horizonYears);
  const y10 = Math.min(10, inputs.horizonYears);
  const s5 = yearSummary(y5);
  const s10 = yearSummary(y10);

  // Target adjustment for inflation
  const target5 = yearlyInflate(inputs.salaryTarget, inputs.inflation/100 ? inputs.inflation/100 : inputs.inflation, y5); // maintain backwards compat
  const target10 = yearlyInflate(inputs.salaryTarget, inputs.inflation/100 ? inputs.inflation/100 : inputs.inflation, y10);

  return {
    inputs, rentals, monthsArr, mortBalArr, locBalArr, portBalArr,
    dividendsArr, helocInterestArr, rentalNetArr, netCashflowArr, taxSavingsAppliedArr,
    s5, s10, target5, target10
  };
}

let balChart = null, cfChart = null;

function render(res) {
  const { s5, s10, target5 } = res;
  const fmt0 = (x) => fmt2.format(Math.round(x || 0));
  const badge = $("#targetBadge");

  if (s5) {
    $("#mortgage5").textContent = fmt0(s5.mort);
    $("#loc5").textContent = fmt0(s5.loc);
    $("#dividends5").textContent = fmt0(s5.annDiv);
    $("#interest5").textContent = fmt0(s5.annLocInt);
    $("#taxSavings5").textContent = fmt0(s5.annTaxSavings);
    $("#netIncome5").textContent = fmt0(s5.netInvestIncome);
    $("#target5").textContent = fmt0(target5);
    if (s5.netInvestIncome >= target5) {
      badge.textContent = "On track";
      badge.className = "badge success";
    } else {
      badge.textContent = "Shortfall";
      badge.className = "badge warn";
    }
  }
  if (s10) {
    $("#mortgage10").textContent = fmt0(s10.mort);
    $("#loc10").textContent = fmt0(s10.loc);
    $("#dividends10").textContent = fmt0(s10.annDiv);
    $("#interest10").textContent = fmt0(s10.annLocInt);
    $("#taxSavings10").textContent = fmt0(s10.annTaxSavings);
    $("#netIncome10").textContent = fmt0(s10.netInvestIncome);
  }

  // Charts: balances
  const labels = res.monthsArr.map(m => `M${m}`);
  const dataBal = {
    labels,
    datasets: [
      { label: "Non‑deductible mortgage", data: res.mortBalArr, borderWidth: 2, tension: 0.15 },
      { label: "Investment LOC", data: res.locBalArr, borderWidth: 2, tension: 0.15 },
      { label: "Investment portfolio", data: res.portBalArr, borderWidth: 2, tension: 0.15 },
    ]
  };
  const ctxBal = document.getElementById('balancesChart').getContext('2d');
  if (balChart) balChart.destroy();
  balChart = new Chart(ctxBal, {
    type: 'line',
    data: dataBal,
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top' } },
      scales: { y: { ticks: { callback: v => fmt2.format(v) } } }
    }
  });

  // Annual cashflows (grouped)
  const years = Math.ceil(labels.length / 12);
  const byYear = (arr) => Array.from({length: years}, (_,i) => arr.slice(i*12, i*12+12).reduce((a,b)=>a+b,0));
  const cfDiv = byYear(res.dividendsArr);
  const cfInt = byYear(res.helocInterestArr);
  const cfRent = byYear(res.rentalNetArr);
  const cfNet = cfDiv.map((d,i) => d + cfRent[i] - (res.inputs.capitalizeInterest ? 0 : cfInt[i]));

  const dataCF = {
    labels: Array.from({length: years}, (_,i) => `Year ${i+1}`),
    datasets: [
      { label: "Dividends", data: cfDiv, borderWidth: 2 },
      { label: "Rental net", data: cfRent, borderWidth: 2 },
      { label: "HELOC interest (paid cash)", data: res.inputs.capitalizeInterest ? cfDiv.map(_=>0) : cfInt, borderWidth: 2 },
      { label: "Net invest income", data: cfNet, borderWidth: 2 },
    ]
  };
  const ctxCF = document.getElementById('cashflowChart').getContext('2d');
  if (cfChart) cfChart.destroy();
  cfChart = new Chart(ctxCF, {
    type: 'line',
    data: dataCF,
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top' } },
      scales: { y: { ticks: { callback: v => fmt2.format(v) } } }
    }
  });
}

function runPlan() {
  const res = simulate();
  render(res);
  // store result for export
  window.__planResult = res;
}

$("#runPlan").addEventListener("click", runPlan);
$("#resetInputs").addEventListener("click", () => window.location.reload());
$("#addProperty").addEventListener("click", () => addPropertyRow(`Rental #${$("#propertiesTable").querySelector("tbody").children.length+1}`, 700000, 6.5, 24, true));

// Export CSV
$("#exportCsv").addEventListener("click", () => {
  const res = window.__planResult || simulate();
  const rows = [["Month","MortBal","LocBal","PortBal","Dividends","HelocInterest","RentalNet","NetCashflow","TaxApplied"]];
  res.monthsArr.forEach((m, i) => {
    rows.push([m, res.mortBalArr[i], res.locBalArr[i], res.portBalArr[i], res.dividendsArr[i], res.helocInterestArr[i], res.rentalNetArr[i], res.netCashflowArr[i], res.taxSavingsAppliedArr[i]]);
  });
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], {type: "text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fi_planner_timeseries.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// Download plan JSON
$("#downloadPlan").addEventListener("click", () => {
  const res = window.__planResult || simulate();
  const blob = new Blob([JSON.stringify(res, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fi_planner_plan.json";
  a.click();
  URL.revokeObjectURL(url);
});

// Theme toggle
(function() {
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const root = document.documentElement;
  const stored = localStorage.getItem("fi-theme");
  const light = stored ? stored === "light" : prefersLight;
  if (light) root.classList.add("light");
  $("#themeToggle").addEventListener("click", () => {
    root.classList.toggle("light");
    localStorage.setItem("fi-theme", root.classList.contains("light") ? "light" : "dark");
  });
})();

document.getElementById("year").textContent = new Date().getFullYear();

// Run once on load
runPlan();
