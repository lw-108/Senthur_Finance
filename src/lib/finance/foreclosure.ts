import { ForeclosureQuote } from './types';
import { calculateAccruedInterest } from './interest';
import { formatDateIso } from './dates';

export function calculateForeclosureQuote(
  outstandingPrincipalInPaise: number,
  annualRateDecimal: number,
  lastPaymentDate: Date | string,
  asOfDate: Date | string,
  accruedPenaltyInPaise: number = 0,
  foreclosureFeePercent: number = 0 // e.g. 0% or 2% foreclosure fee
): ForeclosureQuote {
  const accruedInterest = calculateAccruedInterest(
    outstandingPrincipalInPaise,
    annualRateDecimal,
    lastPaymentDate,
    asOfDate
  );

  const foreclosureFee = Math.round(
    (outstandingPrincipalInPaise * foreclosureFeePercent) / 100
  );

  const totalSettlementAmount =
    outstandingPrincipalInPaise +
    accruedInterest +
    accruedPenaltyInPaise +
    foreclosureFee;

  return {
    asOfDate: formatDateIso(asOfDate),
    outstandingPrincipal: outstandingPrincipalInPaise,
    accruedInterest,
    accruedPenalty: accruedPenaltyInPaise,
    foreclosureFee,
    totalSettlementAmount,
  };
}
