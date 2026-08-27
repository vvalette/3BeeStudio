import type { Database as GeneratedDatabase } from './database.generated'
import type { ProductColor, ProductCustomField } from './shop-product'
import type { ShopOrderItem } from './shop-order'
import type { QuoteLineItem } from './custom-order'
import type { DocumentAdjustment } from '@/lib/documents/pdf'

// Schéma DB typé pour les clients Supabase (src/lib/supabase.ts).
//
// Part du fichier généré (database.generated.ts) et affine les colonnes JSONB
// que le générateur ne peut typer que `Json` : les interfaces métier de
// src/types/*.ts restent la source de vérité pour ces structures.

type ModelRotation = { x: number; y: number; z: number }

type ShopProductJsonColumns = {
  custom_fields: ProductCustomField[]
  colors: ProductColor[]
  model_rotation: ModelRotation | null
}

type CustomOrderJsonColumns = {
  quote_items: QuoteLineItem[] | null
}

type InvoiceJsonColumns = {
  items: QuoteLineItem[]
  adjustments: DocumentAdjustment[]
}

type ShopOrderJsonColumns = {
  items: ShopOrderItem[]
}

type OverrideColumns<Row, O> = Omit<Row, keyof O> & O

type GenPublic = GeneratedDatabase['public']
type GenTables = GenPublic['Tables']

type PatchedTable<Name extends keyof GenTables, O> = {
  Row: OverrideColumns<GenTables[Name]['Row'], O>
  Insert: OverrideColumns<GenTables[Name]['Insert'], Partial<O>>
  Update: OverrideColumns<GenTables[Name]['Update'], Partial<O>>
  Relationships: GenTables[Name]['Relationships']
}

export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GenPublic, 'Tables'> & {
    Tables: Omit<GenTables, 'shop_products' | 'shop_orders' | 'custom_orders' | 'invoices'> & {
      shop_products: PatchedTable<'shop_products', ShopProductJsonColumns>
      shop_orders: PatchedTable<'shop_orders', ShopOrderJsonColumns>
      custom_orders: PatchedTable<'custom_orders', CustomOrderJsonColumns>
      invoices: PatchedTable<'invoices', InvoiceJsonColumns>
    }
  }
}

export type { Json } from './database.generated'

// Helpers pratiques (équivalents des Tables/TablesUpdate générés, mais basés
// sur le schéma patché ci-dessus).
export type Tables<Name extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][Name]['Row']
export type TablesInsert<Name extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][Name]['Insert']
export type TablesUpdate<Name extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][Name]['Update']
