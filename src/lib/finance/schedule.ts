import {
  LoanCalculationInput,
  LoanPreviewResult,
  ScheduleInstallment,
  RepaymentFrequency,
} from './types';
import {
  toDate,
  formatDateIso,
  addRepaymentInterval,
} from './dates';
import {
  getAnnualizedRateDecimal,
  getPeriodicRateDecimal,
  calculateSimpleInterest,
  calculateCompoundInterest,
  calculateReducingEmi,
  applyRounding,
} from './interest';
import { calculateXIRR, CashFlow } from './xirr';

export function calculateLoanSchedule(input: LoanCalculationInput): LoanPreviewResult {
  const {
    principal,
    interestType,
    interestRate,
    ratePeriod,
    compounding = 'NONE',
    disbursedOn,
    firstDueDate,
    tenureValue,
    tenureUnit,
    repaymentFrequency,
    customInstallmentAmount,
    upfrontDeduction = 0,
    advanceInterestDeducted = false,
    rounding = 'TWO_DECIMALS',
  } = input;

  const annualRateDecimal = getAnnualizedRateDecimal(interestRate, ratePeriod);
  const periodicRateDecimal = getPeriodicRateDecimal(annualRateDecimal, repaymentFrequency);

  // Determine number of installments based on tenure and frequency
  let numberOfInstallments = 1;
  let tenureInYears = 1;

  switch (tenureUnit) {
    case 'DAYS':
      tenureInYears = tenureValue / 365;
      numberOfInstallments =
        repaymentFrequency === 'DAILY'
          ? tenureValue
          : Math.max(1, Math.round(tenureValue / (repaymentFrequency === 'WEEKLY' ? 7 : 30)));
      break;

    case 'WEEKS':
      tenureInYears = tenureValue / 52;
      numberOfInstallments =
        repaymentFrequency === 'DAILY'
          ? tenureValue * 7
          : repaymentFrequency === 'WEEKLY'
          ? tenureValue
          : repaymentFrequency === 'BIWEEKLY'
          ? Math.max(1, Math.round(tenureValue / 2))
          : Math.max(1, Math.round(tenureValue / 4.33));
      break;

    case 'MONTHS':
      tenureInYears = tenureValue / 12;
      numberOfInstallments =
        repaymentFrequency === 'DAILY'
          ? tenureValue * 30
          : repaymentFrequency === 'WEEKLY'
          ? Math.round(tenureValue * 4.33)
          : repaymentFrequency === 'BIWEEKLY'
          ? tenureValue * 2
          : repaymentFrequency === 'BULLET'
          ? 1
          : tenureValue;
      break;

    case 'YEARS':
      tenureInYears = tenureValue;
      numberOfInstallments =
        repaymentFrequency === 'DAILY'
          ? tenureValue * 365
          : repaymentFrequency === 'WEEKLY'
          ? tenureValue * 52
          : repaymentFrequency === 'BIWEEKLY'
          ? tenureValue * 26
          : repaymentFrequency === 'BULLET'
          ? 1
          : tenureValue * 12;
      break;
  }

  numberOfInstallments = Math.max(1, Math.round(numberOfInstallments));

  const startDate = toDate(disbursedOn);
  const firstDate = firstDueDate ? toDate(firstDueDate) : addRepaymentInterval(startDate, 1, repaymentFrequency);

  const schedule: ScheduleInstallment[] = [];
  let totalInterest = 0;
  let installmentAmount = 0;

  // 1. REDUCING_BALANCE (standard EMI amortization table)
  if (interestType === 'REDUCING_BALANCE') {
    installmentAmount = customInstallmentAmount || calculateReducingEmi(principal, periodicRateDecimal, numberOfInstallments);
    installmentAmount = applyRounding(installmentAmount, rounding);

    let remainingPrincipal = principal;

    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = addRepaymentInterval(firstDate, i - 1, repaymentFrequency);
      const isLast = i === numberOfInstallments;

      // Periodic interest on current outstanding
      let interestDue = Math.round(remainingPrincipal * periodicRateDecimal);
      let principalDue = isLast
        ? remainingPrincipal
        : Math.min(remainingPrincipal, Math.max(0, installmentAmount - interestDue));

      if (isLast) {
        interestDue = Math.round(remainingPrincipal * periodicRateDecimal);
      }

      const totalDue = principalDue + interestDue;
      remainingPrincipal = Math.max(0, remainingPrincipal - principalDue);
      totalInterest += interestDue;

      schedule.push({
        installmentNo: i,
        dueDate: formatDateIso(dueDate),
        principalDue,
        interestDue,
        penaltyDue: 0,
        totalDue,
        paidAmount: 0,
        status: 'UPCOMING',
        remainingPrincipalBalance: remainingPrincipal,
      });
    }
  }

  // 2. FLAT RATE (interest on initial principal for tenure, equal installment)
  else if (interestType === 'FLAT') {
    totalInterest = Math.round(principal * annualRateDecimal * tenureInYears);
    totalInterest = applyRounding(totalInterest, rounding);

    const totalPayable = principal + totalInterest;
    installmentAmount = customInstallmentAmount || Math.round(totalPayable / numberOfInstallments);
    installmentAmount = applyRounding(installmentAmount, rounding);

    const principalPerPeriod = Math.round(principal / numberOfInstallments);
    const interestPerPeriod = Math.round(totalInterest / numberOfInstallments);

    let remainingPrincipal = principal;

    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = addRepaymentInterval(firstDate, i - 1, repaymentFrequency);
      const isLast = i === numberOfInstallments;

      const pDue = isLast ? remainingPrincipal : principalPerPeriod;
      const iDue = isLast ? totalInterest - interestPerPeriod * (numberOfInstallments - 1) : interestPerPeriod;
      remainingPrincipal = Math.max(0, remainingPrincipal - pDue);

      schedule.push({
        installmentNo: i,
        dueDate: formatDateIso(dueDate),
        principalDue: pDue,
        interestDue: iDue,
        penaltyDue: 0,
        totalDue: pDue + iDue,
        paidAmount: 0,
        status: 'UPCOMING',
        remainingPrincipalBalance: remainingPrincipal,
      });
    }
  }

  // 3. SIMPLE INTEREST (I = P * r * t)
  else if (interestType === 'SIMPLE') {
    totalInterest = calculateSimpleInterest(principal, annualRateDecimal, tenureInYears);
    totalInterest = applyRounding(totalInterest, rounding);

    const totalPayable = principal + totalInterest;
    installmentAmount = customInstallmentAmount || Math.round(totalPayable / numberOfInstallments);

    const principalPerPeriod = Math.round(principal / numberOfInstallments);
    const interestPerPeriod = Math.round(totalInterest / numberOfInstallments);

    let remainingPrincipal = principal;

    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = addRepaymentInterval(firstDate, i - 1, repaymentFrequency);
      const isLast = i === numberOfInstallments;

      const pDue = isLast ? remainingPrincipal : principalPerPeriod;
      const iDue = isLast ? totalInterest - interestPerPeriod * (numberOfInstallments - 1) : interestPerPeriod;
      remainingPrincipal = Math.max(0, remainingPrincipal - pDue);

      schedule.push({
        installmentNo: i,
        dueDate: formatDateIso(dueDate),
        principalDue: pDue,
        interestDue: iDue,
        penaltyDue: 0,
        totalDue: pDue + iDue,
        paidAmount: 0,
        status: 'UPCOMING',
        remainingPrincipalBalance: remainingPrincipal,
      });
    }
  }

  // 4. COMPOUND INTEREST
  else if (interestType === 'COMPOUND') {
    totalInterest = calculateCompoundInterest(principal, annualRateDecimal, tenureInYears, compounding);
    totalInterest = applyRounding(totalInterest, rounding);

    const totalPayable = principal + totalInterest;
    installmentAmount = customInstallmentAmount || Math.round(totalPayable / numberOfInstallments);

    let remainingPrincipal = principal;
    const principalPerPeriod = Math.round(principal / numberOfInstallments);
    const interestPerPeriod = Math.round(totalInterest / numberOfInstallments);

    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = addRepaymentInterval(firstDate, i - 1, repaymentFrequency);
      const isLast = i === numberOfInstallments;

      const pDue = isLast ? remainingPrincipal : principalPerPeriod;
      const iDue = isLast ? totalInterest - interestPerPeriod * (numberOfInstallments - 1) : interestPerPeriod;
      remainingPrincipal = Math.max(0, remainingPrincipal - pDue);

      schedule.push({
        installmentNo: i,
        dueDate: formatDateIso(dueDate),
        principalDue: pDue,
        interestDue: iDue,
        penaltyDue: 0,
        totalDue: pDue + iDue,
        paidAmount: 0,
        status: 'UPCOMING',
        remainingPrincipalBalance: remainingPrincipal,
      });
    }
  }

  // 5. INTEREST_ONLY (bullet principal at maturity)
  else if (interestType === 'INTEREST_ONLY') {
    const periodicInterest = Math.round(principal * periodicRateDecimal);
    totalInterest = periodicInterest * numberOfInstallments;
    installmentAmount = periodicInterest;

    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = addRepaymentInterval(firstDate, i - 1, repaymentFrequency);
      const isLast = i === numberOfInstallments;

      const pDue = isLast ? principal : 0;
      const iDue = periodicInterest;

      schedule.push({
        installmentNo: i,
        dueDate: formatDateIso(dueDate),
        principalDue: pDue,
        interestDue: iDue,
        penaltyDue: 0,
        totalDue: pDue + iDue,
        paidAmount: 0,
        status: 'UPCOMING',
        remainingPrincipalBalance: isLast ? 0 : principal,
      });
    }
  }

  // 6. ZERO_INTEREST
  else if (interestType === 'ZERO_INTEREST') {
    totalInterest = 0;
    installmentAmount = Math.round(principal / numberOfInstallments);
    let remainingPrincipal = principal;

    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = addRepaymentInterval(firstDate, i - 1, repaymentFrequency);
      const isLast = i === numberOfInstallments;
      const pDue = isLast ? remainingPrincipal : installmentAmount;
      remainingPrincipal = Math.max(0, remainingPrincipal - pDue);

      schedule.push({
        installmentNo: i,
        dueDate: formatDateIso(dueDate),
        principalDue: pDue,
        interestDue: 0,
        penaltyDue: 0,
        totalDue: pDue,
        paidAmount: 0,
        status: 'UPCOMING',
        remainingPrincipalBalance: remainingPrincipal,
      });
    }
  }

  // 7. FIXED_AMOUNT
  else {
    totalInterest = customInstallmentAmount ? customInstallmentAmount * numberOfInstallments - principal : 0;
    installmentAmount = customInstallmentAmount || Math.round(principal / numberOfInstallments);
    let remainingPrincipal = principal;

    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = addRepaymentInterval(firstDate, i - 1, repaymentFrequency);
      const isLast = i === numberOfInstallments;
      const pDue = isLast ? remainingPrincipal : Math.round(principal / numberOfInstallments);
      const iDue = Math.max(0, installmentAmount - pDue);
      remainingPrincipal = Math.max(0, remainingPrincipal - pDue);

      schedule.push({
        installmentNo: i,
        dueDate: formatDateIso(dueDate),
        principalDue: pDue,
        interestDue: iDue,
        penaltyDue: 0,
        totalDue: pDue + iDue,
        paidAmount: 0,
        status: 'UPCOMING',
        remainingPrincipalBalance: remainingPrincipal,
      });
    }
  }

  // Advance interest deduction handling:
  // If lender deducts first period's interest in advance, that interest is subtracted from actual cash disbursed
  let actualDisbursedAmount = principal - upfrontDeduction;
  if (advanceInterestDeducted && schedule.length > 0) {
    const firstPeriodInterest = schedule[0].interestDue;
    actualDisbursedAmount -= firstPeriodInterest;
    // Mark first installment's interest as already settled upfront
    schedule[0].paidAmount = firstPeriodInterest;
    schedule[0].status = schedule[0].principalDue === 0 ? 'PAID' : 'PARTIAL';
  }

  const maturityDate = schedule.length > 0 ? schedule[schedule.length - 1].dueDate : formatDateIso(firstDate);

  // Compute XIRR for admin visibility
  const cashFlows: CashFlow[] = [
    { date: startDate, amount: -actualDisbursedAmount },
    ...schedule.map((item) => ({
      date: item.dueDate,
      amount: item.totalDue - (advanceInterestDeducted && item.installmentNo === 1 ? item.interestDue : 0),
    })),
  ];

  const effectiveAnnualRate = calculateXIRR(cashFlows, annualRateDecimal || 0.15);

  return {
    principal,
    disbursedAmount: actualDisbursedAmount,
    totalInterest,
    totalPayable: principal + totalInterest,
    installmentAmount,
    numberOfInstallments,
    maturityDate,
    effectiveAnnualRate,
    schedule,
  };
}
