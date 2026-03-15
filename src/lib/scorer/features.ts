/**
 * Фичи для скоринговой модели: сумма долга (нормализованная), регион (числовой код).
 */

export interface DebtorRow {
  id: string
  debt_amount: number
  region: string | null
}

export interface FeatureVector {
  debtAmountNorm: number
  regionCode: number
}

const REGION_ORDER = [
  "Москва",
  "Московская область",
  "Санкт-Петербург",
  "Ленинградская область",
  "Краснодарский край",
  "Новосибирская область",
  "Свердловская область",
]

/** Нормализация суммы долга в [0, 1]: 0 = малый долг, 1 = очень большой. */
const DEBT_MAX = 500_000

export function extractFeatures(debtor: DebtorRow): FeatureVector {
  const debtAmountNorm = Math.min(
    1,
    Math.max(0, Number(debtor.debt_amount) / DEBT_MAX)
  )
  const regionIdx = debtor.region
    ? REGION_ORDER.indexOf(debtor.region)
    : -1
  const regionCode = regionIdx >= 0 ? regionIdx / Math.max(REGION_ORDER.length - 1, 1) : 0.5
  return { debtAmountNorm, regionCode }
}
