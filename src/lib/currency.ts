type FormatUSDOptions = {
  withSymbol?: boolean
  compact?: boolean
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

export const formatUSD = (value?: number | string | null, options: FormatUSDOptions = {}) => {
  const {
    withSymbol = false,
    compact = false,
    minimumFractionDigits = compact ? 1 : 2,
    maximumFractionDigits = compact ? 1 : 2,
  } = options

  const numericValue = Number(value ?? 0)
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0

  return new Intl.NumberFormat('en-US', {
    style: withSymbol ? 'currency' : 'decimal',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    compactDisplay: 'short',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(safeValue)
}

export const formatUSDWithSymbol = (value?: number | string | null) =>
  formatUSD(value, { withSymbol: true })

export const formatUSDCompact = (value?: number | string | null) =>
  formatUSD(value, { withSymbol: true, compact: true })
