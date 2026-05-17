/**
 * All money math uses integer paise (1 rupee = 100 paise) to avoid float errors.
 */

/** Convert rupees (float) to paise (integer) */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

/** Convert paise (integer) back to rupees */
export function toRupees(paise: number): number {
  return paise / 100
}

/**
 * Equal split: divide totalRupees among friendIds.
 * Payer absorbs any rounding remainder (Decision 2B).
 * Returns array of { friend_id, amount_owed } in rupees (2dp).
 */
export function equalSplit(
  totalRupees: number,
  friendIds: string[]
): Array<{ friend_id: string; amount_owed: number }> {
  if (friendIds.length === 0) return []
  const totalPaise = toPaise(totalRupees)
  const perPersonPaise = Math.floor(totalPaise / friendIds.length)
  // Payer absorbs remainder — friends all get floor amount
  return friendIds.map((friend_id) => ({
    friend_id,
    amount_owed: toRupees(perPersonPaise),
  }))
}

/** Format rupees for display: ₹1,234.56 */
export function formatRupees(rupees: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees)
}

/** Sum of shares assigned so far (in rupees) */
export function sharesTotal(shares: Array<{ amount_owed: number }>): number {
  return toRupees(shares.reduce((s, sh) => s + toPaise(sh.amount_owed), 0))
}

/** Payer's remaining amount = total - sum(shares). Never goes negative in display. */
export function payerRemainder(
  totalRupees: number,
  shares: Array<{ amount_owed: number }>
): number {
  return toRupees(
    toPaise(totalRupees) -
      shares.reduce((s, sh) => s + toPaise(sh.amount_owed), 0)
  )
}
