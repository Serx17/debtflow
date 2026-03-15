/**
 * Простая логистическая регрессия для скоринга вероятности возврата долга.
 * Обучение на синтетических данных; предсказание по фичам.
 */

import type { FeatureVector } from "./features"

export interface LogisticCoefficients {
  bias: number
  debtAmountNorm: number
  regionCode: number
}

/** Сигмоида. */
function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, z))))
}

/**
 * Предсказывает вероятность «возврата» (0–1) по коэффициентам и фичам.
 * Высокий score = выше вероятность возврата.
 */
export function predict(
  coef: LogisticCoefficients,
  f: FeatureVector
): number {
  const z =
    coef.bias +
    coef.debtAmountNorm * f.debtAmountNorm +
    coef.regionCode * f.regionCode
  return sigmoid(z)
}

/**
 * «Обучает» модель на синтетических данных: низкий долг и «хороший» регион -> 1,
 * высокий долг -> 0. Возвращает коэффициенты для предсказания.
 */
export function trainSynthetic(): LogisticCoefficients {
  const synthetic: { features: FeatureVector; label: number }[] = []
  const regions = [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1]
  for (const debtNorm of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    for (const regionCode of regions) {
      const f: FeatureVector = { debtAmountNorm: debtNorm, regionCode }
      const label = debtNorm <= 0.4 && regionCode <= 0.5 ? 1 : debtNorm >= 0.8 ? 0 : 0.5
      synthetic.push({ features: f, label })
    }
  }

  let bias = 0
  let wDebt = -1
  let wRegion = 0.5
  const lr = 0.3
  const epochs = 200

  for (let e = 0; e < epochs; e++) {
    let dBias = 0
    let dDebt = 0
    let dRegion = 0
    for (const { features, label } of synthetic) {
      const pred = sigmoid(
        bias + wDebt * features.debtAmountNorm + wRegion * features.regionCode
      )
      const err = pred - label
      dBias += err
      dDebt += err * features.debtAmountNorm
      dRegion += err * features.regionCode
    }
    const n = synthetic.length
    bias -= lr * (dBias / n)
    wDebt -= lr * (dDebt / n)
    wRegion -= lr * (dRegion / n)
  }

  return {
    bias,
    debtAmountNorm: wDebt,
    regionCode: wRegion,
  }
}
