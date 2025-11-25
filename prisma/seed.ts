import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import Papa from 'papaparse'
import ExcelJS from 'exceljs'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// ============================================
// TYPE DEFINITIONS
// ============================================
// These describe the structure of each data source

// Customer CSV columns
interface CustomerRow {
  'Tipo Identificación *': string
  'Identificación *': string
  'Primer Nombre ó Razon Social*': string
  'Segundo Nombre': string
  'Primer Apellido *': string
  'Segundo Apellido': string
  'Email *': string
  'Teléfonos *': string
  'Dirección *': string
  'Ciudad Dirección *': string
}

// Inventory CSV columns
interface InventoryRow {
  'Uso': string
  'Producto': string
  'UM': string
  'Inventario final': string
}

// Price data from Excel
interface PriceData {
  code: string
  name: string
  unit: string
  category: string
  price: number
}

// Final consolidated product
interface ConsolidatedProduct {
  name: string
  code: string | null
  category: string
  unit: string
  price: number
  stock: number
  minStock: number
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Build full customer name from separate parts
function buildFullName(row: CustomerRow): string {
  const parts = [
    row['Primer Nombre ó Razon Social*'],
    row['Segundo Nombre'],
    row['Primer Apellido *'],
    row['Segundo Apellido']
  ].filter(part => part && part.trim() !== '')
  
  return parts.join(' ')
}

// Normalize product names for comparison
// Removes accents, lowercase, trims spaces
function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove accents
    .replace(/\s+/g, ' ')              // Normalize spaces
    .replace(/[()]/g, '')              // Remove parentheses
    .trim()
}

// Calculate how similar two product names are (0 to 1)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeProductName(str1)
  const s2 = normalizeProductName(str2)
  
  // Exact match
  if (s1 === s2) return 1
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9
  
  // Count matching words
  const words1 = s1.split(' ')
  const words2 = s2.split(' ')
  const matchingWords = words1.filter(w => w.length > 2 && words2.some(w2 => w2.includes(w) || w.includes(w2)))
  
  if (matchingWords.length === 0) return 0
  
  return matchingWords.length / Math.max(words1.length, words2.length)
}

// Find the best matching price entry for an inventory item
function findBestPriceMatch(inventoryName: string, priceData: PriceData[]): PriceData | null {
  let bestMatch: PriceData | null = null
  let bestScore = 0.4  // Minimum 40% match required
  
  for (const priceEntry of priceData) {
    const score = calculateSimilarity(inventoryName, priceEntry.name)
    if (score > bestScore) {
      bestScore = score
      bestMatch = priceEntry
    }
  }
  
  return bestMatch
}

// Map CSV "Uso" category to readable category
function mapCategory(uso: string): string {
  const categoryMap: Record<string, string> = {
    'Producto': 'Productos',
    'Envase': 'Envases',
    'Merchandising': 'Merchandising',
    'Eiqueta': 'Etiquetas',  // Note: typo in original CSV
    'Etiqueta': 'Etiquetas'
  }
  return categoryMap[uso] || 'Otros'
}

// Estimate price for items without Excel price data
function estimatePrice(uso: string, productName: string): number {
  // Shampoos and hair products
  if (productName.toLowerCase().includes('shampoo') || 
      productName.toLowerCase().includes('mascarilla') ||
      productName.toLowerCase().includes('loción')) {
    return 45000
  }
  
  // Cleaning products (by volume)
  if (uso === 'Producto') {
    return 40000
  }
  
  // Containers/packaging
  if (uso === 'Envase') {
    if (productName.toLowerCase().includes('galón') || productName.toLowerCase().includes('galon')) {
      return 8000
    }
    if (productName.toLowerCase().includes('litro')) {
      return 5000
    }
    return 3000
  }
  
  // Labels
  if (uso === 'Eiqueta' || uso === 'Etiqueta') {
    return 500
  }
  
  // Merchandising
  if (uso === 'Merchandising') {
    if (productName.toLowerCase().includes('gorra')) return 25000
    if (productName.toLowerCase().includes('morral')) return 35000
    if (productName.toLowerCase().includes('manilla')) return 2000
    if (productName.toLowerCase().includes('esfero')) return 3000
    return 10000
  }
  
  return 10000  // Default
}

// ============================================
// DATA LOADING FUNCTIONS
// ============================================

// Load customers from CSV
async function loadCustomersCSV(): Promise<CustomerRow[]> {
  const filePath = path.join(__dirname, 'data', 'customers.csv')
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  
  const parsed = Papa.parse<CustomerRow>(fileContent, {
    header: true,
    skipEmptyLines: true
  })
  
  return parsed.data
}

// Load inventory from CSV
async function loadInventoryCSV(): Promise<InventoryRow[]> {
  const filePath = path.join(__dirname, 'data', 'inventory.csv')
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  
  const parsed = Papa.parse<InventoryRow>(fileContent, {
    header: true,
    skipEmptyLines: true
  })
  
  return parsed.data
}

// Load prices from Excel
async function loadPricesExcel(): Promise<PriceData[]> {
  const filePath = path.join(__dirname, 'data', 'prices.xlsx')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)
  
  const worksheet = workbook.worksheets[0]
  const priceData: PriceData[] = []
  
  // Skip header row, start from row 2
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return  // Skip header
    
    const code = row.getCell(1).value?.toString().trim() || ''
    const name = row.getCell(2).value?.toString().trim() || ''
    const unit = row.getCell(3).value?.toString().trim() || 'und'
    const category = row.getCell(6).value?.toString().trim() || 'Otros'
    const priceValue = row.getCell(7).value
    
    // Parse price (handle different formats)
    let price = 0
    if (typeof priceValue === 'number') {
      price = Math.round(priceValue)
    } else if (typeof priceValue === 'string') {
      price = Math.round(parseFloat(priceValue.replace(/[^0-9.-]/g, '')) || 0)
    }
    
    if (name && price > 0) {
      priceData.push({ code, name, unit, category, price })
    }
  })
  
  return priceData
}

// ============================================
// CONSOLIDATION FUNCTION
// ============================================

// Merge inventory data with price data
function consolidateProducts(
  inventoryData: InventoryRow[],
  priceData: PriceData[]
): ConsolidatedProduct[] {
  const consolidated: ConsolidatedProduct[] = []
  const seenProducts = new Set<string>()
  
  // First, add all products from price list (these have real prices)
  for (const priceItem of priceData) {
    const normalizedName = normalizeProductName(priceItem.name)
    if (seenProducts.has(normalizedName)) continue
    
    // Find matching inventory item for stock
    let stock = 0
    for (const invItem of inventoryData) {
      if (calculateSimilarity(priceItem.name, invItem['Producto']) > 0.5) {
        stock = parseInt(invItem['Inventario final']) || 0
        break
      }
    }
    
    consolidated.push({
      name: priceItem.name,
      code: priceItem.code,
      category: priceItem.category,
      unit: priceItem.unit,
      price: priceItem.price,
      stock: stock,
      minStock: stock > 100 ? 20 : 5
    })
    
    seenProducts.add(normalizedName)
  }
  
  // Then, add inventory items that weren't in price list
  for (const invItem of inventoryData) {
    const productName = invItem['Producto']?.trim()
    if (!productName) continue
    
    const normalizedName = normalizeProductName(productName)
    if (seenProducts.has(normalizedName)) continue
    
    // Try to find a price match
    const priceMatch = findBestPriceMatch(productName, priceData)
    
    const stock = parseInt(invItem['Inventario final']) || 0
    const uso = invItem['Uso']?.trim() || ''
    
    consolidated.push({
      name: productName,
      code: priceMatch?.code || null,
      category: priceMatch?.category || mapCategory(uso),
      unit: invItem['UM']?.trim() || 'und',
      price: priceMatch?.price || estimatePrice(uso, productName),
      stock: stock,
      minStock: stock > 100 ? 20 : 5
    })
    
    seenProducts.add(normalizedName)
  }
  
  return consolidated
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
  console.log('🌱 Starting Nouvie data seed...\n')
  console.log('=' .repeat(50))

  // ----------------------------------------
  // STEP 1: Seed Admin User
  // ----------------------------------------
  console.log('\n👤 STEP 1: Creating admin user...')
  
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nouvie.com' },
    update: {
      password: hashedPassword,
      name: 'Admin Nouvie',
      role: 'admin',
      active: true,
    },
    create: {
      email: 'admin@nouvie.com',
      password: hashedPassword,
      name: 'Admin Nouvie',
      role: 'admin',
      active: true,
    },
  })
  
  console.log('   ✅ Admin user ready')
  console.log('   📧 Email: admin@nouvie.com')
  console.log('   🔑 Password: admin123')

  // ----------------------------------------
  // STEP 2: Load All Data Files
  // ----------------------------------------
  console.log('\n📂 STEP 2: Loading data files...')
  
  const customersData = await loadCustomersCSV()
  console.log(`   ✅ Customers CSV: ${customersData.length} rows`)
  
  const inventoryData = await loadInventoryCSV()
  console.log(`   ✅ Inventory CSV: ${inventoryData.length} rows`)
  
  const priceData = await loadPricesExcel()
  console.log(`   ✅ Prices Excel: ${priceData.length} products with prices`)

  // ----------------------------------------
  // STEP 3: Seed Customers
  // ----------------------------------------
  console.log('\n👥 STEP 3: Seeding customers...')
  
  let customersCreated = 0
  let customersSkipped = 0
  
  for (const row of customersData) {
    const cedula = row['Identificación *']?.toString().trim()
    const email = row['Email *']?.trim()
    const phone = row['Teléfonos *']?.trim()
    
    // Skip rows with missing required data
    if (!cedula || !email) {
      customersSkipped++
      continue
    }
    
    try {
      await prisma.customer.upsert({
        where: { cedula: cedula },
        update: {
          name: buildFullName(row),
          email: email,
          phone: phone || '',
          address: row['Dirección *']?.trim() || null,
          city: row['Ciudad Dirección *']?.trim() || null,
          active: true,
        },
        create: {
          cedula: cedula,
          name: buildFullName(row),
          email: email,
          phone: phone || '',
          address: row['Dirección *']?.trim() || null,
          city: row['Ciudad Dirección *']?.trim() || null,
          active: true,
        },
      })
      
      customersCreated++
      
      // Progress indicator
      if (customersCreated % 100 === 0) {
        console.log(`   ... ${customersCreated} customers processed`)
      }
    } catch (error: unknown) {
      const typedError = error as Error & { code?: string }
      if (typedError.code === 'P2002') {
        customersSkipped++
      } else {
        console.log(`   ⚠️  Error with "${row['Identificación *']}": ${typedError.message}`)
        customersSkipped++
      }
      customersSkipped++
    }
  }
  
  console.log(`   ✅ Customers created: ${customersCreated}`)
  console.log(`   ⏭️  Customers skipped: ${customersSkipped}`)

  // ----------------------------------------
  // STEP 4: Consolidate & Seed Products
  // ----------------------------------------
  console.log('\n📦 STEP 4: Consolidating and seeding products...')
  
  const consolidatedProducts = consolidateProducts(inventoryData, priceData)
  console.log(`   📊 Consolidated products: ${consolidatedProducts.length}`)
  
  let productsCreated = 0
  let productsSkipped = 0
  
  for (const product of consolidatedProducts) {
    try {
      await prisma.product.upsert({
        where: { 
          // Use name as unique identifier since we don't have unique codes for all
          id: product.name  // This won't match, forcing create
        },
        update: {},
        create: {
          name: product.name,
          type: 'simple',
          category: product.category,
          unit: product.unit,
          price: product.price,
          stock: product.stock,
          minStock: product.minStock,
          active: true,
        },
      })
      
      productsCreated++
    } catch (error: unknown) {
      const typedError = error as Error & { code?: string }
      // If duplicate, skip silently
      if (typedError.code === 'P2002') {
        productsSkipped++
      } else {
        console.log(`   ⚠️  Error with "${product.name}": ${typedError.message}`)
        productsSkipped++
      }
    }
  }
  
  console.log(`   ✅ Products created: ${productsCreated}`)
  console.log(`   ⏭️  Products skipped: ${productsSkipped}`)

  // ----------------------------------------
  // SUMMARY
  // ----------------------------------------
  console.log('\n' + '=' .repeat(50))
  console.log('🎉 SEED COMPLETED SUCCESSFULLY!')
  console.log('=' .repeat(50))
  console.log('\n📊 Final Summary:')
  console.log(`   👤 Admin user: 1`)
  console.log(`   👥 Customers: ${customersCreated}`)
  console.log(`   📦 Products: ${productsCreated}`)
  console.log('\n🔐 Login credentials:')
  console.log('   Email: admin@nouvie.com')
  console.log('   Password: admin123')
  console.log('')
}

// Run the seed
main()
  .catch((e) => {
    console.error('\n❌ SEED FAILED!')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })