// ============================================
// PROMOMIX 2026 — CONFIGURATION
// Promotional pricing for 13 eligible products
// Names must match exactly with database product names
// ============================================

// Business rules
export const PROMOMIX_MINIMUM = 300000     // $300.000 COP minimum at promo prices
export const PROMOMIX_YEAR = 2026

// ============================================
// PRODUCT TYPES
// ============================================

export type PromoMixCategory = 'hogar' | 'capilar'

export type PromoMixProduct = {
  id: string
  name: string
  category: PromoMixCategory
  size: string
  basePrice: number   // PVP+IVA (precio regular)
  promoPrice: number  // PVC+IVA (precio kit)
}

// ============================================
// HOGAR PRODUCTS — Precios especiales
// 5 products
// ============================================

export const HOGAR_PRODUCTS: PromoMixProduct[] = [
  { id: 'desengrasante-multiusos', name: 'Desengrasante Multiusos', category: 'hogar', size: '250 ml', basePrice: 55200, promoPrice: 52550 },
  { id: 'detergente-neutro', name: 'Detergente Neutro', category: 'hogar', size: '250 ml', basePrice: 55200, promoPrice: 52550 },
  { id: 'limpia-vidrios', name: 'Limpia Vidrios', category: 'hogar', size: '250 ml', basePrice: 51750, promoPrice: 49266 },
  { id: 'limpia-pisos', name: 'Limpia Pisos', category: 'hogar', size: '250 ml', basePrice: 51750, promoPrice: 49266 },
  { id: 'lustra-muebles', name: 'Lustra Muebles', category: 'hogar', size: '250 ml', basePrice: 51750, promoPrice: 49266 },
]

// ============================================
// CAPILAR PRODUCTS — Precios especiales
// 8 products — names match DB exactly
// ============================================
// TODO: Mascarilla Revitalizante is MISSING from client's price list.
//       Confirm with client if this product should exist or was intentionally removed.

export const CAPILAR_PRODUCTS: PromoMixProduct[] = [
  { id: 'shampoo-suave-y-liso', name: 'Shampoo Suave y Liso (237 ml)', category: 'capilar', size: '237 ml', basePrice: 49500, promoPrice: 35343 },
  { id: 'mascarilla-suave-y-liso', name: 'Mascarilla Suave y Liso (177 ml)', category: 'capilar', size: '177 ml', basePrice: 62000, promoPrice: 44268 },
  { id: 'locion-suave-y-liso', name: 'Loción Suave y Liso (177 ml)', category: 'capilar', size: '177 ml', basePrice: 55000, promoPrice: 39270 },
  { id: 'shampoo-revitalizante', name: 'Shampoo Revitalizante (237 ml)', category: 'capilar', size: '237 ml', basePrice: 49500, promoPrice: 35343 },
  { id: 'mascarilla-reparacion-intensa', name: 'Mascarilla Reparación Intensa (177 ml)', category: 'capilar', size: '177 ml', basePrice: 62000, promoPrice: 44268 },
  { id: 'locion-revitalizante', name: 'Loción Revitalizante (177 ml)', category: 'capilar', size: '177 ml', basePrice: 55000, promoPrice: 39270 },
  { id: 'shampoo-reparacion-intensa', name: 'Shampoo Reparación Intensa (237 ml)', category: 'capilar', size: '237 ml', basePrice: 49500, promoPrice: 35343 },
  { id: 'locion-reparacion-intensa', name: 'Loción Reparación Intensa (177 ml)', category: 'capilar', size: '177 ml', basePrice: 55000, promoPrice: 39270 },
]

// ============================================
// COMBINED LIST
// ============================================

export const ALL_PROMOMIX_PRODUCTS: PromoMixProduct[] = [
  ...HOGAR_PRODUCTS,
  ...CAPILAR_PRODUCTS,
]

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the PromoMix price for a product by its slug ID
 * Returns null if the product is not PromoMix-eligible
 */
export function getPromoPrice(productId: string): number | null {
  const product = ALL_PROMOMIX_PRODUCTS.find(p => p.id === productId)
  return product?.promoPrice ?? null
}

/**
 * Check if a product is eligible for PromoMix by its slug ID
 */
export function isPromoMixEligible(productId: string): boolean {
  return ALL_PROMOMIX_PRODUCTS.some(p => p.id === productId)
}

/**
 * Find a PromoMix product by matching its name (case-insensitive)
 * Useful for matching DB products to PromoMix config
 */
export function findPromoMixByName(productName: string): PromoMixProduct | null {
  const normalized = productName.toLowerCase().trim()
  return ALL_PROMOMIX_PRODUCTS.find(
    p => p.name.toLowerCase() === normalized
  ) ?? null
}
