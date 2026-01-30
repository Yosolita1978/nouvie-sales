// ============================================
// PROMOMIX 2026 — CALCULATION & VALIDATION
// Used by both the API and the order creation UI
// ============================================

import {
  PROMOMIX_MINIMUM,
  ALL_PROMOMIX_PRODUCTS,
} from './promomix-config'

// ============================================
// TYPES
// ============================================

export type PromoMixItem = {
  productId: string
  quantity: number
}

export type PromoMixCalculation = {
  subtotalPromo: number    // Total at promo prices (before IVA)
  subtotalRegular: number  // Total at regular prices (before IVA)
  iva: number              // 19% of subtotalPromo
  total: number            // subtotalPromo + iva
  savings: number          // subtotalRegular - subtotalPromo
  isValid: boolean         // true if subtotalPromo >= $300.000
  remaining: number        // How much more needed to reach minimum (0 if already met)
  overage: number          // How much over $300.000 (0 if under or exact)
}

export type PromoMixValidation = {
  valid: boolean
  error?: string
}

// ============================================
// CALCULATION
// ============================================

/**
 * Calculate totals for a PromoMix order
 * Throws if any product is not PromoMix-eligible
 */
export function calculatePromoMixOrder(items: PromoMixItem[]): PromoMixCalculation {
  let subtotalPromo = 0
  let subtotalRegular = 0

  for (const item of items) {
    const product = ALL_PROMOMIX_PRODUCTS.find(p => p.id === item.productId)
    if (!product) {
      throw new Error(`Producto no elegible para PromoMix: ${item.productId}`)
    }
    subtotalPromo += product.promoPrice * item.quantity
    subtotalRegular += product.basePrice * item.quantity
  }

  const iva = Math.round(subtotalPromo * 0.19)
  const total = subtotalPromo + iva
  const savings = subtotalRegular - subtotalPromo
  const isValid = subtotalPromo >= PROMOMIX_MINIMUM
  const remaining = isValid ? 0 : PROMOMIX_MINIMUM - subtotalPromo
  const overage = subtotalPromo > PROMOMIX_MINIMUM ? subtotalPromo - PROMOMIX_MINIMUM : 0

  return {
    subtotalPromo,
    subtotalRegular,
    iva,
    total,
    savings,
    isValid,
    remaining,
    overage,
  }
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate a PromoMix order:
 * - All items must be PromoMix-eligible
 * - Subtotal at promo prices must be >= $300.000
 */
export function validatePromoMixOrder(items: PromoMixItem[]): PromoMixValidation {
  if (items.length === 0) {
    return { valid: false, error: 'El pedido PromoMix debe tener al menos un producto' }
  }

  for (const item of items) {
    const product = ALL_PROMOMIX_PRODUCTS.find(p => p.id === item.productId)
    if (!product) {
      return { valid: false, error: `Producto no elegible para PromoMix: ${item.productId}` }
    }
    if (item.quantity < 1) {
      return { valid: false, error: `Cantidad inválida para ${product.name}` }
    }
  }

  const calc = calculatePromoMixOrder(items)
  if (!calc.isValid) {
    return {
      valid: false,
      error: `El PromoMix requiere mínimo $300.000. Faltan $${calc.remaining.toLocaleString('es-CO')}`,
    }
  }

  return { valid: true }
}
