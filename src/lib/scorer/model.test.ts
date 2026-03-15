import { describe, it, expect } from "vitest"
import { trainSynthetic, predict } from "./model"
import type { FeatureVector } from "./features"

describe("predict", () => {
  const coef = { bias: 0, debtAmountNorm: -2, regionCode: 0.5 }

  it("returns value in [0, 1]", () => {
    expect(predict(coef, { debtAmountNorm: 0, regionCode: 0 })).toBeGreaterThanOrEqual(0)
    expect(predict(coef, { debtAmountNorm: 0, regionCode: 0 })).toBeLessThanOrEqual(1)
    expect(predict(coef, { debtAmountNorm: 1, regionCode: 1 })).toBeGreaterThanOrEqual(0)
    expect(predict(coef, { debtAmountNorm: 1, regionCode: 1 })).toBeLessThanOrEqual(1)
  })

  it("gives higher score for lower debt when coefficient is negative", () => {
    const lowDebt = predict(coef, { debtAmountNorm: 0.2, regionCode: 0.5 })
    const highDebt = predict(coef, { debtAmountNorm: 0.9, regionCode: 0.5 })
    expect(lowDebt).toBeGreaterThan(highDebt)
  })
})

describe("trainSynthetic", () => {
  it("returns coefficients", () => {
    const coef = trainSynthetic()
    expect(coef).toHaveProperty("bias")
    expect(coef).toHaveProperty("debtAmountNorm")
    expect(coef).toHaveProperty("regionCode")
  })

  it("produces lower score for high debt", () => {
    const coef = trainSynthetic()
    const lowDebtScore = predict(coef, { debtAmountNorm: 0.1, regionCode: 0.2 })
    const highDebtScore = predict(coef, { debtAmountNorm: 0.95, regionCode: 0.2 })
    expect(lowDebtScore).toBeGreaterThan(highDebtScore)
  })
})
