export interface VariantSample {
  impressions: number
  clicks: number
  conversions: number
}

export interface SignificanceResult {
  winner: "a" | "b" | null
  confidence: number
  recommendation: string
}

const WINNER_CONFIDENCE_THRESHOLD = 95

function toCount(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

function erfc(x: number): number {
  const z = Math.abs(x)
  const t = 1 / (1 + 0.5 * z)
  const r =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t *
                                  (1.48851587 +
                                    t * (-0.82215223 + t * 0.17087277))))))))
    )
  return x >= 0 ? r : 2 - r
}

function pValueFromChiSquareDf1(chiSquare: number): number {
  if (!Number.isFinite(chiSquare) || chiSquare <= 0) return 1
  return erfc(Math.sqrt(chiSquare / 2))
}

function chiSquare2x2(aSuccess: number, aFailure: number, bSuccess: number, bFailure: number): number {
  const rowATotal = aSuccess + aFailure
  const rowBTotal = bSuccess + bFailure
  const colSuccessTotal = aSuccess + bSuccess
  const colFailureTotal = aFailure + bFailure
  const total = rowATotal + rowBTotal

  if (total === 0) return 0

  const expectedASuccess = (rowATotal * colSuccessTotal) / total
  const expectedAFailure = (rowATotal * colFailureTotal) / total
  const expectedBSuccess = (rowBTotal * colSuccessTotal) / total
  const expectedBFailure = (rowBTotal * colFailureTotal) / total

  const terms: Array<[number, number]> = [
    [aSuccess, expectedASuccess],
    [aFailure, expectedAFailure],
    [bSuccess, expectedBSuccess],
    [bFailure, expectedBFailure],
  ]

  return terms.reduce((sum, [observed, expected]) => {
    if (expected <= 0) return sum
    const delta = observed - expected
    return sum + (delta * delta) / expected
  }, 0)
}

function normalizeSample(variant: VariantSample) {
  const impressions = toCount(variant.impressions)
  const clicks = toCount(variant.clicks)
  const conversions = toCount(variant.conversions)

  // Conversion rate is computed on clicks when possible; otherwise impressions are used as fallback.
  const trialBase = clicks > 0 ? clicks : impressions
  const trials = Math.max(trialBase, conversions)
  const failures = Math.max(trials - conversions, 0)
  const rate = trials > 0 ? conversions / trials : 0

  return { impressions, clicks, conversions, trials, failures, rate }
}

export function evaluateSignificance(a: VariantSample, b: VariantSample): SignificanceResult {
  const sampleA = normalizeSample(a)
  const sampleB = normalizeSample(b)

  if (sampleA.trials === 0 || sampleB.trials === 0) {
    return {
      winner: null,
      confidence: 0,
      recommendation: "Not enough data to evaluate conversion rate significance yet.",
    }
  }

  const chiSquare = chiSquare2x2(
    sampleA.conversions,
    sampleA.failures,
    sampleB.conversions,
    sampleB.failures
  )
  const pValue = pValueFromChiSquareDf1(chiSquare)
  const confidence = Math.max(0, Math.min(100, (1 - pValue) * 100))

  const rateA = sampleA.rate
  const rateB = sampleB.rate
  const pctA = (rateA * 100).toFixed(2)
  const pctB = (rateB * 100).toFixed(2)
  const pctConfidence = confidence.toFixed(2)

  if (rateA === rateB) {
    return {
      winner: null,
      confidence,
      recommendation: `Both variants are tied at ${pctA}% conversion rate. Continue the test.`,
    }
  }

  if (confidence < WINNER_CONFIDENCE_THRESHOLD) {
    return {
      winner: null,
      confidence,
      recommendation: `No statistically significant winner yet (${pctA}% vs ${pctB}%, ${pctConfidence}% confidence).`,
    }
  }

  const winner: "a" | "b" = rateA > rateB ? "a" : "b"
  const winnerLabel = winner === "a" ? "A" : "B"
  return {
    winner,
    confidence,
    recommendation: `Declare variant ${winnerLabel} as winner (${pctA}% vs ${pctB}%, ${pctConfidence}% confidence).`,
  }
}

