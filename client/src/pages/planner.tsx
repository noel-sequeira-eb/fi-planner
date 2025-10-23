import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, Download, FileDown, Plus, X } from "lucide-react";
import type { Property, PlanInputs, SimulationResults } from "@shared/schema";
import { simulate } from "@/lib/calculations";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const fmt = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });

export default function PlannerPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [results, setResults] = useState<SimulationResults | null>(null);

  // Inputs state
  const [inputs, setInputs] = useState<PlanInputs>({
    homeValue: 1200000,
    mortgageBalance: 320836.56, // Mortgage 1 balance
    primaryRate: 5.5,
    amortYears: 25,
    extraPrepay: 2000,
    helocRate: 6.7,
    maxLtv: 80,
    maxHelocLtv: 65,
    taxRate: 40,
    capitalizeInterest: true,
    
    // Credit Line Details
    totalCreditLine: 620000, // Total HELOC credit available
    mortgage2Balance: 174787.24, // Investment LOC already borrowed
    mortgage2Rate: 6.7, // Rate on existing investment LOC
    
    // Payment Details
    mortgage1PaymentAmount: 2100, // User-entered payment amount
    mortgage1PaymentFreq: "monthly" as const,
    mortgage2PaymentAmount: 1200, // User-entered payment amount
    mortgage2PaymentFreq: "monthly" as const,
    
    dividendYield: 4.5,
    totalReturn: 6.0,
    inflation: 2.5,
    rentalRate: 5.5,
    rentalAmortYears: 30,
    rentalLtv: 80,
    horizonYears: 10,
    retirementYear: 5,
    salaryTarget: 150000,
  });

  const [properties, setProperties] = useState<Property[]>([
    { name: "Rental #1", price: 750000, capRate: 6.5, purchaseMonth: 6, useHeloc: true },
    { name: "Rental #2", price: 750000, capRate: 6.75, purchaseMonth: 18, useHeloc: true },
  ]);

  // Theme toggle
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Use user-entered payment amounts
  const mortgage1Payment = inputs.mortgage1PaymentAmount;
  const mortgage2Payment = inputs.mortgage2PaymentAmount;

  // Calculate capacity - based on actual credit line
  const totalUsed = inputs.mortgageBalance + inputs.mortgage2Balance;
  const creditAvailable = Math.max(0, inputs.totalCreditLine - totalUsed);
  const maxCltv = inputs.homeValue * (inputs.maxLtv / 100);
  const helocCap = inputs.homeValue * (inputs.maxHelocLtv / 100);
  const helocRoom = Math.max(0, maxCltv - inputs.mortgageBalance);

  // Update input
  const updateInput = (key: keyof PlanInputs, value: number | boolean) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  // Property management
  const addProperty = () => {
    setProperties(prev => [...prev, {
      name: `Rental #${prev.length + 1}`,
      price: 750000,
      capRate: 6.5,
      purchaseMonth: 6,
      useHeloc: true,
    }]);
  };

  const removeProperty = (index: number) => {
    setProperties(prev => prev.filter((_, i) => i !== index));
  };

  const updateProperty = (index: number, key: keyof Property, value: string | number | boolean) => {
    setProperties(prev => prev.map((p, i) => 
      i === index ? { ...p, [key]: value } : p
    ));
  };

  // Run simulation
  const runPlan = () => {
    const res = simulate(inputs, properties);
    setResults(res);
  };

  // Reset
  const resetInputs = () => {
    setInputs({
      homeValue: 1200000,
      mortgageBalance: 320836.56, // Mortgage 1 balance
      primaryRate: 5.5,
      amortYears: 25,
      extraPrepay: 2000,
      helocRate: 6.7,
      maxLtv: 80,
      maxHelocLtv: 65,
      taxRate: 40,
      capitalizeInterest: true,
      
      // Credit Line Details
      totalCreditLine: 620000, // Total HELOC credit available
      mortgage2Balance: 174787.24, // Investment LOC already borrowed
      mortgage2Rate: 6.7, // Rate on existing investment LOC
      
      // Payment Details
      mortgage1PaymentAmount: 2100, // User-entered payment amount
      mortgage1PaymentFreq: "monthly" as const,
      mortgage2PaymentAmount: 1200, // User-entered payment amount
      mortgage2PaymentFreq: "monthly" as const,
      
      dividendYield: 4.5,
      totalReturn: 6.0,
      inflation: 2.5,
      rentalRate: 5.5,
      rentalAmortYears: 30,
      rentalLtv: 80,
      horizonYears: 10,
      retirementYear: 5,
      salaryTarget: 150000,
    });
    setProperties([
      { name: "Rental #1", price: 750000, capRate: 6.5, purchaseMonth: 6, useHeloc: true },
      { name: "Rental #2", price: 750000, capRate: 6.75, purchaseMonth: 18, useHeloc: true },
    ]);
    setResults(null);
  };

  // Export CSV
  const exportCsv = () => {
    if (!results) return;
    
    const headers = ['Month', 'Mortgage', 'Investment LOC', 'Portfolio', 'Dividends', 'HELOC Interest', 'Rental Net', 'Net Cashflow'];
    const rows = results.monthsArr.map((m, i) => [
      m,
      results.mortBalArr[i].toFixed(2),
      results.locBalArr[i].toFixed(2),
      results.portBalArr[i].toFixed(2),
      results.dividendsArr[i].toFixed(2),
      results.helocInterestArr[i].toFixed(2),
      results.rentalNetArr[i].toFixed(2),
      results.netCashflowArr[i].toFixed(2),
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fi-planner-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download JSON
  const downloadPlan = () => {
    const data = { inputs, properties, results };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fi-plan.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Chart data
  const balancesChartData = results ? {
    labels: results.monthsArr.map(m => `M${m}`),
    datasets: [
      {
        label: 'Non-deductible mortgage',
        data: results.mortBalArr,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        borderWidth: 2,
        tension: 0.15,
      },
      {
        label: 'Investment LOC',
        data: results.locBalArr,
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        borderWidth: 2,
        tension: 0.15,
      },
      {
        label: 'Investment portfolio',
        data: results.portBalArr,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        borderWidth: 2,
        tension: 0.15,
      },
    ],
  } : null;

  const cashflowChartData = results ? (() => {
    const years = Math.ceil(results.monthsArr.length / 12);
    const byYear = (arr: number[]) => Array.from({ length: years }, (_, i) => 
      arr.slice(i * 12, i * 12 + 12).reduce((a, b) => a + b, 0)
    );
    
    const cfDiv = byYear(results.dividendsArr);
    const cfInt = byYear(results.helocInterestArr);
    const cfRent = byYear(results.rentalNetArr);
    const cfNet = cfDiv.map((d, i) => d + cfRent[i] - (inputs.capitalizeInterest ? 0 : cfInt[i]));

    return {
      labels: Array.from({ length: years }, (_, i) => `Year ${i + 1}`),
      datasets: [
        {
          label: 'Dividends',
          data: cfDiv,
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.1)',
          borderWidth: 2,
        },
        {
          label: 'Rental net',
          data: cfRent,
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.1)',
          borderWidth: 2,
        },
        {
          label: 'HELOC interest (paid cash)',
          data: inputs.capitalizeInterest ? cfDiv.map(() => 0) : cfInt,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderWidth: 2,
        },
        {
          label: 'Net invest income',
          data: cfNet,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          borderWidth: 2,
        },
      ],
    };
  })() : null;

  const chartOptions = {
    responsive: true,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const },
    },
    scales: {
      y: {
        ticks: {
          callback: (value: number | string) => fmt.format(Number(value)),
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/60 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" className="text-primary" aria-hidden="true">
              <path fill="currentColor" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 14h-2v-2h2Zm0-4h-2V6h2Z"/>
            </svg>
            <span className="font-bold text-lg" data-testid="text-title">FI Planner</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title="Toggle theme"
              data-testid="button-theme-toggle"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button
              variant="default"
              onClick={exportCsv}
              disabled={!results}
              data-testid="button-export-csv"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="py-12 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 items-start">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold mb-4" data-testid="heading-main">
                  Smith Manoeuvre + Rentals
                </h1>
                <p className="text-muted-foreground text-lg mb-4">
                  Model a readvanceable mortgage strategy, investment LOC, and rental acquisitions to replace your salary. 
                  See balances, cashflows, and whether you'll hit your Year-5 target.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" data-testid="badge-clientside">Client-side • No sign-in</Badge>
                  <Badge variant="outline" data-testid="badge-csv">Exportable CSV</Badge>
                  <Badge variant="outline" data-testid="badge-education">Educational only</Badge>
                </div>
              </div>
              
              <Card className="p-6">
                <h3 className="font-bold mb-4" data-testid="heading-capacity">Credit Line & Payments</h3>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <div className="text-muted-foreground mb-1">Total Credit Line</div>
                    <div className="font-bold tabular-nums" data-testid="value-total-credit">{fmt.format(inputs.totalCreditLine)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Credit Available Now</div>
                    <div className="font-bold tabular-nums text-green-600" data-testid="value-credit-available">{fmt.format(creditAvailable)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Total Used</div>
                    <div className="font-bold tabular-nums" data-testid="value-total-used">{fmt.format(totalUsed)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Utilization</div>
                    <div className="font-bold tabular-nums" data-testid="value-utilization">{((totalUsed / inputs.totalCreditLine) * 100).toFixed(1)}%</div>
                  </div>
                </div>
                
                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold mb-3">Mortgage Payment Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-3 p-3 border border-red-200 rounded-lg bg-red-50/30">
                      <div className="text-red-700 font-semibold">Mortgage 1 (Primary)</div>
                      <div className="space-y-1">
                        <div>Balance: <span className="font-bold tabular-nums">{fmt.format(inputs.mortgageBalance)}</span></div>
                        <div>Rate: <span className="font-bold">{inputs.primaryRate}%</span></div>
                        <div>Payment: <span className="font-bold tabular-nums text-red-600">{fmt.format(mortgage1Payment)}</span></div>
                        <div className="text-xs text-muted-foreground">
                          <span className="capitalize font-medium">{inputs.mortgage1PaymentFreq}</span> payments
                          {inputs.mortgage1PaymentFreq === 'bi-weekly' && ' (26/year)'}
                          {inputs.mortgage1PaymentFreq === 'weekly' && ' (52/year)'}
                          {inputs.mortgage1PaymentFreq === 'monthly' && ' (12/year)'}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 p-3 border border-blue-200 rounded-lg bg-blue-50/30">
                      <div className="text-blue-700 font-semibold">Mortgage 2 (Investment)</div>
                      <div className="space-y-1">
                        <div>Balance: <span className="font-bold tabular-nums">{fmt.format(inputs.mortgage2Balance)}</span></div>
                        <div>Rate: <span className="font-bold text-blue-600">{inputs.mortgage2Rate}%</span></div>
                        <div>Payment: <span className="font-bold tabular-nums text-blue-600">{fmt.format(mortgage2Payment)}</span></div>
                        <div className="text-xs text-muted-foreground">
                          <span className="capitalize font-medium">{inputs.mortgage2PaymentFreq}</span> payments
                          {inputs.mortgage2PaymentFreq === 'bi-weekly' && ' (26/year)'}
                          {inputs.mortgage2PaymentFreq === 'weekly' && ' (52/year)'}
                          {inputs.mortgage2PaymentFreq === 'monthly' && ' (12/year)'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-center text-muted-foreground">
                    Total payments: <span className="font-bold">{fmt.format(mortgage1Payment + mortgage2Payment)}</span> per payment period
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mt-4">
                  Primary mortgage (red) is non-deductible. Investment mortgage (blue) interest is tax-deductible.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Main calculator */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-[1.05fr_1fr] gap-6">
              {/* Inputs panel */}
              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-6" data-testid="heading-inputs">Inputs</h2>
                  
                  {/* Home & HELOC */}
                  <div className="border border-dashed border-border rounded-lg p-4 mb-6">
                    <h3 className="font-semibold mb-4">Home &amp; HELOC</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="homeValue">Home value ($)</Label>
                        <Input
                          id="homeValue"
                          type="number"
                          value={inputs.homeValue}
                          onChange={(e) => updateInput('homeValue', Number(e.target.value))}
                          data-testid="input-home-value"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mortgageBalance">Mortgage 1 balance (Primary) ($)</Label>
                        <Input
                          id="mortgageBalance"
                          type="number"
                          value={inputs.mortgageBalance}
                          onChange={(e) => updateInput('mortgageBalance', Number(e.target.value))}
                          data-testid="input-mortgage-balance"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="totalCreditLine">Total HELOC Credit Line ($)</Label>
                          <Input
                            id="totalCreditLine"
                            type="number"
                            value={inputs.totalCreditLine}
                            onChange={(e) => updateInput('totalCreditLine', Number(e.target.value))}
                            data-testid="input-total-credit-line"
                          />
                        </div>
                        <div>
                          <Label htmlFor="mortgage2Balance">Mortgage 2 balance (Investment LOC) ($)</Label>
                          <Input
                            id="mortgage2Balance"
                            type="number"
                            value={inputs.mortgage2Balance}
                            onChange={(e) => updateInput('mortgage2Balance', Number(e.target.value))}
                            data-testid="input-mortgage2-balance"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="primaryRate">Primary mortgage rate (%)</Label>
                          <Input
                            id="primaryRate"
                            type="number"
                            step="0.01"
                            value={inputs.primaryRate}
                            onChange={(e) => updateInput('primaryRate', Number(e.target.value))}
                            data-testid="input-primary-rate"
                          />
                        </div>
                        <div>
                          <Label htmlFor="mortgage1PaymentAmount">Payment amount ($)</Label>
                          <Input
                            id="mortgage1PaymentAmount"
                            type="number"
                            value={inputs.mortgage1PaymentAmount}
                            onChange={(e) => updateInput('mortgage1PaymentAmount', Number(e.target.value))}
                            data-testid="input-mortgage1-payment"
                          />
                        </div>
                        <div>
                          <Label htmlFor="mortgage1PaymentFreq">Payment frequency</Label>
                          <Select
                            value={inputs.mortgage1PaymentFreq}
                            onValueChange={(value: any) => updateInput('mortgage1PaymentFreq', value)}
                          >
                            <SelectTrigger data-testid="select-mortgage1-freq">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="amortYears">Amortization (years)</Label>
                          <Input
                            id="amortYears"
                            type="number"
                            value={inputs.amortYears}
                            onChange={(e) => updateInput('amortYears', Number(e.target.value))}
                            data-testid="input-amort-years"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="extraPrepay">Extra monthly prepayment ($)</Label>
                          <Input
                            id="extraPrepay"
                            type="number"
                            value={inputs.extraPrepay}
                            onChange={(e) => updateInput('extraPrepay', Number(e.target.value))}
                            data-testid="input-extra-prepay"
                          />
                        </div>
                        <div>
                          <Label htmlFor="helocRate">HELOC rate (%)</Label>
                          <Input
                            id="helocRate"
                            type="number"
                            step="0.01"
                            value={inputs.helocRate}
                            onChange={(e) => updateInput('helocRate', Number(e.target.value))}
                            data-testid="input-heloc-rate"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="maxLtv">Max CLTV (%)</Label>
                          <Input
                            id="maxLtv"
                            type="number"
                            step="0.1"
                            value={inputs.maxLtv}
                            onChange={(e) => updateInput('maxLtv', Number(e.target.value))}
                            data-testid="input-max-ltv"
                          />
                        </div>
                        <div>
                          <Label htmlFor="maxHelocLtv">Max HELOC LTV (%)</Label>
                          <Input
                            id="maxHelocLtv"
                            type="number"
                            step="0.1"
                            value={inputs.maxHelocLtv}
                            onChange={(e) => updateInput('maxHelocLtv', Number(e.target.value))}
                            data-testid="input-max-heloc-ltv"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="taxRate">Marginal tax rate (%)</Label>
                          <Input
                            id="taxRate"
                            type="number"
                            step="0.1"
                            value={inputs.taxRate}
                            onChange={(e) => updateInput('taxRate', Number(e.target.value))}
                            data-testid="input-tax-rate"
                          />
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={inputs.capitalizeInterest}
                              onCheckedChange={(checked) => updateInput('capitalizeInterest', !!checked)}
                              data-testid="checkbox-capitalize-interest"
                            />
                            <span className="text-sm">Capitalize investment interest</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Portfolio */}
                  <div className="border border-dashed border-border rounded-lg p-4 mb-6">
                    <h3 className="font-semibold mb-4">Portfolio & Investment Financing</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label htmlFor="dividendYield">Dividend yield (%)</Label>
                        <Input
                          id="dividendYield"
                          type="number"
                          step="0.1"
                          value={inputs.dividendYield}
                          onChange={(e) => updateInput('dividendYield', Number(e.target.value))}
                          data-testid="input-dividend-yield"
                        />
                      </div>
                      <div>
                        <Label htmlFor="totalReturn">Total return (incl. yield) (%)</Label>
                        <Input
                          id="totalReturn"
                          type="number"
                          step="0.1"
                          value={inputs.totalReturn}
                          onChange={(e) => updateInput('totalReturn', Number(e.target.value))}
                          data-testid="input-total-return"
                        />
                      </div>
                      <div>
                        <Label htmlFor="inflation">Inflation (%)</Label>
                        <Input
                          id="inflation"
                          type="number"
                          step="0.1"
                          value={inputs.inflation}
                          onChange={(e) => updateInput('inflation', Number(e.target.value))}
                          data-testid="input-inflation"
                        />
                      </div>
                    </div>
                    
                    <div className="border-t border-border pt-4">
                      <h4 className="font-medium mb-3 text-blue-600">Investment Mortgage (Tax-Deductible)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="mortgage2Rate">Investment LOC rate (%)</Label>
                          <Input
                            id="mortgage2Rate"
                            type="number"
                            step="0.01"
                            value={inputs.mortgage2Rate}
                            onChange={(e) => updateInput('mortgage2Rate', Number(e.target.value))}
                            data-testid="input-mortgage2-rate"
                          />
                        </div>
                        <div>
                          <Label htmlFor="mortgage2PaymentAmount">Payment amount ($)</Label>
                          <Input
                            id="mortgage2PaymentAmount"
                            type="number"
                            value={inputs.mortgage2PaymentAmount}
                            onChange={(e) => updateInput('mortgage2PaymentAmount', Number(e.target.value))}
                            data-testid="input-mortgage2-payment"
                          />
                        </div>
                        <div>
                          <Label htmlFor="mortgage2PaymentFreq">Payment frequency</Label>
                          <Select
                            value={inputs.mortgage2PaymentFreq}
                            onValueChange={(value: any) => updateInput('mortgage2PaymentFreq', value)}
                          >
                            <SelectTrigger data-testid="select-mortgage2-freq">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Investment mortgage interest is tax-deductible, reducing after-tax borrowing cost.
                      </p>
                    </div>
                  </div>

                  {/* Rentals */}
                  <div className="border border-dashed border-border rounded-lg p-4 mb-6">
                    <h3 className="font-semibold mb-4">Rentals</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label htmlFor="rentalRate">Rental rate (%)</Label>
                        <Input
                          id="rentalRate"
                          type="number"
                          step="0.1"
                          value={inputs.rentalRate}
                          onChange={(e) => updateInput('rentalRate', Number(e.target.value))}
                          data-testid="input-rental-rate"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rentalAmortYears">Amortization (years)</Label>
                        <Input
                          id="rentalAmortYears"
                          type="number"
                          value={inputs.rentalAmortYears}
                          onChange={(e) => updateInput('rentalAmortYears', Number(e.target.value))}
                          data-testid="input-rental-amort-years"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rentalLtv">Rental LTV (%)</Label>
                        <Input
                          id="rentalLtv"
                          type="number"
                          step="0.1"
                          value={inputs.rentalLtv}
                          onChange={(e) => updateInput('rentalLtv', Number(e.target.value))}
                          data-testid="input-rental-ltv"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2">Property</th>
                            <th className="text-left py-2 px-2">Price ($)</th>
                            <th className="text-left py-2 px-2">Cap rate (%)</th>
                            <th className="text-left py-2 px-2">Purchase month</th>
                            <th className="text-center py-2 px-2">Use HELOC for 20% DP</th>
                            <th className="py-2 px-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {properties.map((prop, idx) => (
                            <tr key={idx} className="border-b border-border hover-elevate">
                              <td className="py-2 px-2">
                                <Input
                                  type="text"
                                  value={prop.name}
                                  onChange={(e) => updateProperty(idx, 'name', e.target.value)}
                                  className="h-8"
                                  data-testid={`input-property-name-${idx}`}
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input
                                  type="number"
                                  value={prop.price}
                                  onChange={(e) => updateProperty(idx, 'price', Number(e.target.value))}
                                  className="h-8"
                                  data-testid={`input-property-price-${idx}`}
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={prop.capRate}
                                  onChange={(e) => updateProperty(idx, 'capRate', Number(e.target.value))}
                                  className="h-8"
                                  data-testid={`input-property-cap-${idx}`}
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input
                                  type="number"
                                  value={prop.purchaseMonth}
                                  onChange={(e) => updateProperty(idx, 'purchaseMonth', Number(e.target.value))}
                                  className="h-8"
                                  data-testid={`input-property-month-${idx}`}
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <Checkbox
                                  checked={prop.useHeloc}
                                  onCheckedChange={(checked) => updateProperty(idx, 'useHeloc', !!checked)}
                                  data-testid={`checkbox-property-heloc-${idx}`}
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeProperty(idx)}
                                  data-testid={`button-remove-property-${idx}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <Button
                      variant="ghost"
                      onClick={addProperty}
                      data-testid="button-add-property"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add property
                    </Button>
                  </div>

                  {/* Plan */}
                  <div className="border border-dashed border-border rounded-lg p-4 mb-6">
                    <h3 className="font-semibold mb-4">Plan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label htmlFor="horizonYears">Horizon (years)</Label>
                        <Input
                          id="horizonYears"
                          type="number"
                          value={inputs.horizonYears}
                          onChange={(e) => updateInput('horizonYears', Number(e.target.value))}
                          data-testid="input-horizon-years"
                        />
                      </div>
                      <div>
                        <Label htmlFor="retirementYear">Stop working in year</Label>
                        <Input
                          id="retirementYear"
                          type="number"
                          value={inputs.retirementYear}
                          onChange={(e) => updateInput('retirementYear', Number(e.target.value))}
                          data-testid="input-retirement-year"
                        />
                      </div>
                      <div>
                        <Label htmlFor="salaryTarget">Target salary replacement (today $)</Label>
                        <Input
                          id="salaryTarget"
                          type="number"
                          value={inputs.salaryTarget}
                          onChange={(e) => updateInput('salaryTarget', Number(e.target.value))}
                          data-testid="input-salary-target"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={runPlan} data-testid="button-run-plan">
                        Run plan
                      </Button>
                      <Button variant="ghost" onClick={resetInputs} data-testid="button-reset">
                        Reset
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    This tool is for education only and simplifies tax and financing rules. Always consult a CPA and mortgage professional before implementing leverage strategies.
                  </p>
                </Card>
              </div>

              {/* Results panel */}
              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-6" data-testid="heading-results">Results</h2>
                  
                  {!results && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Click "Run plan" to see your results</p>
                    </div>
                  )}

                  {results && (
                    <>
                      {/* Year 5 snapshot */}
                      <Card className="p-4 mb-4">
                        <h3 className="font-bold mb-3">Year-{Math.min(5, inputs.horizonYears)} Snapshot</h3>
                        {results.s5 && (
                          <>
                            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                              <div>
                                <div className="text-muted-foreground text-xs mb-1">Non-deductible mortgage</div>
                                <div className="font-bold tabular-nums" data-testid="value-mortgage-5">{fmt.format(results.s5.mort)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground text-xs mb-1">Investment LOC balance</div>
                                <div className="font-bold tabular-nums" data-testid="value-loc-5">{fmt.format(results.s5.loc)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground text-xs mb-1">Dividends (annual)</div>
                                <div className="font-bold tabular-nums" data-testid="value-dividends-5">{fmt.format(results.s5.annDiv)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground text-xs mb-1">LOC interest (annual)</div>
                                <div className="font-bold tabular-nums" data-testid="value-interest-5">{fmt.format(results.s5.annLocInt)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground text-xs mb-1">Tax savings (annual)</div>
                                <div className="font-bold tabular-nums" data-testid="value-tax-savings-5">{fmt.format(results.s5.annTaxSavings)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground text-xs mb-1">Net invest income</div>
                                <div className="font-bold tabular-nums" data-testid="value-net-income-5">{fmt.format(results.s5.netInvestIncome)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 pt-3 border-t border-border">
                              <span className="text-sm text-muted-foreground">Target in Year-{Math.min(5, inputs.horizonYears)} dollars:</span>
                              <span className="font-bold tabular-nums" data-testid="value-target-5">{fmt.format(results.target5)}</span>
                              <Badge 
                                variant={results.s5.netInvestIncome >= results.target5 ? "default" : "destructive"}
                                data-testid="badge-target-status"
                              >
                                {results.s5.netInvestIncome >= results.target5 ? "On track" : "Shortfall"}
                              </Badge>
                            </div>
                          </>
                        )}
                      </Card>

                      {/* Scenario Analysis */}
                      {results && results.s5 && results.s5.netInvestIncome < results.target5 && (
                        <Card className="p-4 mb-6 border-orange-200 bg-orange-50/30">
                          <h3 className="font-bold mb-3 text-orange-700">💡 Scenario Analysis: How to Eliminate Shortfall</h3>
                          
                          <div className="space-y-4">
                            <div className="text-sm text-muted-foreground mb-3">
                              You need <span className="font-bold text-orange-600">{fmt.format(results.target5 - results.s5.netInvestIncome)}</span> more annual income to reach your target.
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">📈 Strategy 1: Increase Investment Borrowing</h4>
                                <div className="text-xs text-muted-foreground space-y-1">
                                  <div>Current credit available: <span className="font-bold text-green-600">{fmt.format(creditAvailable)}</span></div>
                                  <div>Additional investment needed: <span className="font-bold">{fmt.format((results.target5 - results.s5.netInvestIncome) / (inputs.dividendYield / 100))}</span></div>
                                  <div>• Use more of your HELOC for investments</div>
                                  <div>• Generate {inputs.dividendYield}% dividend yield</div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">🏠 Strategy 2: Add More Rental Properties</h4>
                                <div className="text-xs text-muted-foreground space-y-1">
                                  <div>Additional rental income needed: <span className="font-bold">{fmt.format(results.target5 - results.s5.netInvestIncome)}</span></div>
                                  <div>• Add higher cap rate properties</div>
                                  <div>• Purchase earlier in timeline</div>
                                  <div>• Consider duplex/triplex properties</div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="border-t border-orange-200 pt-3 mt-4">
                              <h4 className="font-semibold text-sm mb-2">🎯 Quick Fixes to Try:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                <div className="p-2 bg-white rounded border">
                                  <div className="font-medium">Increase Dividend Yield</div>
                                  <div className="text-muted-foreground">Change from {inputs.dividendYield}% to 6%+</div>
                                </div>
                                <div className="p-2 bg-white rounded border">
                                  <div className="font-medium">Extend Timeline</div>
                                  <div className="text-muted-foreground">Target Year 7-10 instead of Year {inputs.retirementYear}</div>
                                </div>
                                <div className="p-2 bg-white rounded border">
                                  <div className="font-medium">Add Property</div>
                                  <div className="text-muted-foreground">Add one more 7%+ cap rate rental</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}

                      {/* Year 10 projection */}
                      <Card className="p-4 mb-6">
                        <h3 className="font-bold mb-3">Year-{Math.min(10, inputs.horizonYears)} Projection</h3>
                        {results.s10 && (
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-muted-foreground text-xs mb-1">Non-deductible mortgage</div>
                              <div className="font-bold tabular-nums" data-testid="value-mortgage-10">{fmt.format(results.s10.mort)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs mb-1">Investment LOC balance</div>
                              <div className="font-bold tabular-nums" data-testid="value-loc-10">{fmt.format(results.s10.loc)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs mb-1">Dividends (annual)</div>
                              <div className="font-bold tabular-nums" data-testid="value-dividends-10">{fmt.format(results.s10.annDiv)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs mb-1">LOC interest (annual)</div>
                              <div className="font-bold tabular-nums" data-testid="value-interest-10">{fmt.format(results.s10.annLocInt)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs mb-1">Tax savings (annual)</div>
                              <div className="font-bold tabular-nums" data-testid="value-tax-savings-10">{fmt.format(results.s10.annTaxSavings)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs mb-1">Net invest income</div>
                              <div className="font-bold tabular-nums" data-testid="value-net-income-10">{fmt.format(results.s10.netInvestIncome)}</div>
                            </div>
                          </div>
                        )}
                      </Card>

                      {/* Charts */}
                      {balancesChartData && (
                        <Card className="p-4 mb-4">
                          <h3 className="font-bold mb-3">Balances over time</h3>
                          <Line data={balancesChartData} options={chartOptions} />
                        </Card>
                      )}

                      {cashflowChartData && (
                        <Card className="p-4">
                          <h3 className="font-bold mb-3">Annual cashflows</h3>
                          <Line data={cashflowChartData} options={chartOptions} />
                        </Card>
                      )}
                    </>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} FI Planner • Educational only</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadPlan}
            disabled={!results}
            data-testid="button-download-json"
          >
            <Download className="h-4 w-4 mr-2" />
            Download plan JSON
          </Button>
        </div>
      </footer>
    </div>
  );
}
