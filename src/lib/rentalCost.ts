export type RentalFeeUnit = 'unknown' | 'monthly' | 'person' | 'usage'
export type RentalFee = { rate: number | null; unit: RentalFeeUnit; usage: number | null }
export type RentalCostScenario = { rent: number | null; occupants: number; electricity: RentalFee; water: RentalFee; internet: number | null; otherMonthly: number | null; deposit: number | null; initialFees: number | null }

function validAmount(value: number | null): value is number {
  return value != null && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000
}

function feeTotal(fee: RentalFee, occupants: number): number | null {
  if (!validAmount(fee.rate) || fee.unit === 'unknown') return null
  if (fee.unit === 'monthly') return fee.rate
  if (fee.unit === 'person') return fee.rate * occupants
  return fee.unit === 'usage' && validAmount(fee.usage) && fee.usage <= 100_000 ? Math.round(fee.rate * fee.usage) : null
}

/** Zero is known only when the user explicitly supplies it; null always stays unknown. */
export function calculateRentalCost(scenario: RentalCostScenario) {
  if ((scenario.rent !== null && !validAmount(scenario.rent)) || !Number.isInteger(scenario.occupants) || scenario.occupants < 1 || scenario.occupants > 20)
    throw new Error('Tiền thuê hoặc số người không hợp lệ.')
  const electricity = feeTotal(scenario.electricity, scenario.occupants)
  const water = feeTotal(scenario.water, scenario.occupants)
  const parts = { rent: scenario.rent, electricity, water,
    internet: validAmount(scenario.internet) ? scenario.internet : null,
    otherMonthly: validAmount(scenario.otherMonthly) ? scenario.otherMonthly : null }
  const unknown = Object.entries(parts).filter(([, value]) => value == null).map(([key]) => key)
  const knownMonthly = Object.values(parts).reduce<number>((total, value) => total + (value ?? 0), 0)
  const monthly = unknown.length ? null : knownMonthly
  // Deposit is a separate initial payment, never a monthly expense.
  const initial = validAmount(scenario.rent) && validAmount(scenario.deposit) && validAmount(scenario.initialFees)
    ? scenario.rent + scenario.deposit + scenario.initialFees : null
  return { parts, unknown, knownMonthly, monthly, initial }
}
