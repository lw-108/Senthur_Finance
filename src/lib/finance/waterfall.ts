import {
  PaymentAllocationResult,
  ScheduleInstallment,
  RepaymentFrequency,
} from './types';
import { calculateReducingEmi } from './interest';

export interface AllocationOrder {
  first: 'penalty' | 'interest' | 'principal';
  second: 'penalty' | 'interest' | 'principal';
  third: 'penalty' | 'interest' | 'principal';
}

export const DEFAULT_ALLOCATION_ORDER: AllocationOrder = {
  first: 'penalty',
  second: 'interest',
  third: 'principal',
};

/**
 * Allocate an incoming payment amount against outstanding penalty, interest, and principal.
 */
export function allocatePaymentWaterfall(
  paymentAmountInPaise: number,
  outstandingPenalty: number,
  outstandingInterest: number,
  outstandingPrincipal: number,
  order: AllocationOrder = DEFAULT_ALLOCATION_ORDER
): PaymentAllocationResult {
  let remainingPayment = Math.max(0, paymentAmountInPaise);

  let allocatedPenalty = 0;
  let allocatedInterest = 0;
  let allocatedPrincipal = 0;

  const dues = {
    penalty: outstandingPenalty,
    interest: outstandingInterest,
    principal: outstandingPrincipal,
  };

  const steps = [order.first, order.second, order.third];

  for (const step of steps) {
    if (remainingPayment <= 0) break;

    if (step === 'penalty') {
      const pay = Math.min(remainingPayment, dues.penalty);
      allocatedPenalty += pay;
      remainingPayment -= pay;
    } else if (step === 'interest') {
      const pay = Math.min(remainingPayment, dues.interest);
      allocatedInterest += pay;
      remainingPayment -= pay;
    } else if (step === 'principal') {
      const pay = Math.min(remainingPayment, dues.principal);
      allocatedPrincipal += pay;
      remainingPayment -= pay;
    }
  }

  const remainingPrincipal = Math.max(0, outstandingPrincipal - allocatedPrincipal);
  const isFullySettled =
    remainingPrincipal === 0 &&
    outstandingInterest - allocatedInterest === 0 &&
    outstandingPenalty - allocatedPenalty === 0;

  return {
    allocatedPenalty,
    allocatedInterest,
    allocatedPrincipal,
    unallocatedExcess: remainingPayment,
    remainingPrincipal,
    isFullySettled,
  };
}

/**
 * Re-amortize schedule after part-payment or prepayment.
 * Option A: Reduce EMI (keep same remaining tenure)
 * Option B: Reduce Tenure (keep same EMI amount, reduce remaining installments)
 */
export function reAmortizeAfterPrepayment(
  newPrincipalInPaise: number,
  periodicRateDecimal: number,
  remainingInstallmentsCount: number,
  currentEmiInPaise: number,
  strategy: 'REDUCE_EMI' | 'REDUCE_TENURE'
): {
  newEmiInPaise: number;
  newInstallmentsCount: number;
} {
  if (newPrincipalInPaise <= 0) {
    return { newEmiInPaise: 0, newInstallmentsCount: 0 };
  }

  if (strategy === 'REDUCE_EMI') {
    const newEmi = calculateReducingEmi(
      newPrincipalInPaise,
      periodicRateDecimal,
      remainingInstallmentsCount
    );
    return {
      newEmiInPaise: newEmi,
      newInstallmentsCount: remainingInstallmentsCount,
    };
  }

  // REDUCE_TENURE: Keep EMI the same, recalculate n
  // n = -ln(1 - (P * r / EMI)) / ln(1 + r)
  if (periodicRateDecimal <= 0) {
    const count = Math.ceil(newPrincipalInPaise / currentEmiInPaise);
    return { newEmiInPaise: currentEmiInPaise, newInstallmentsCount: count };
  }

  const r = periodicRateDecimal;
  const p = newPrincipalInPaise;
  const emi = currentEmiInPaise;

  const numerator = 1 - (p * r) / emi;
  if (numerator <= 0) {
    // Current EMI does not even cover 1 period's interest
    return {
      newEmiInPaise: calculateReducingEmi(p, r, remainingInstallmentsCount),
      newInstallmentsCount: remainingInstallmentsCount,
    };
  }

  const n = Math.ceil(-Math.log(numerator) / Math.log(1 + r));
  return {
    newEmiInPaise: currentEmiInPaise,
    newInstallmentsCount: Math.min(n, remainingInstallmentsCount),
  };
}
