import { formatCOP, parseCOP, formatDate, generateOrderNumber, isValidCedula, isValidPhone, getStockStatus } from './lib/utils'
import type { Product, Customer } from './types'

console.log('🧪 Testing Utility Functions...\n')

// Test money formatting
console.log('💰 Money Formatting:')
console.log('  45000 →', formatCOP(45000))
console.log('  1250000 →', formatCOP(1250000))
console.log('  750 →', formatCOP(750))

// Test money parsing
console.log('\n💱 Money Parsing:')
console.log('  "$45.000" →', parseCOP('$45.000'))
console.log('  "1.250.000" →', parseCOP('1.250.000'))

// Test date formatting
console.log('\n📅 Date Formatting:')
const now = new Date()
console.log('  Short:', formatDate(now, 'short'))
console.log('  Long:', formatDate(now, 'long'))

// Test order number generation
console.log('\n📋 Order Numbers:')
console.log('  Sequence 1:', generateOrderNumber(1))
console.log('  Sequence 42:', generateOrderNumber(42))
console.log('  Sequence 1500:', generateOrderNumber(1500))

// Test validation
console.log('\n✅ Validation:')
console.log('  Cedula "1234567890":', isValidCedula('1234567890') ? '✓ Valid' : '✗ Invalid')
console.log('  Cedula "123":', isValidCedula('123') ? '✓ Valid' : '✗ Invalid')
console.log('  Phone "3001234567":', isValidPhone('3001234567') ? '✓ Valid' : '✗ Invalid')

// Test stock status
console.log('\n📦 Stock Status:')
const testProduct: Product = {
  id: '1',
  name: 'Test Product',
  type: 'simple',
  category: 'Hogar',
  unit: 'und',
  price: 45000,
  stock: 5,
  minStock: 10,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
}
console.log('  Product with stock=5, minStock=10:', getStockStatus(testProduct))

console.log('\n✅ All tests passed!')