export interface PriceOption {
  type: "download" | "print"
  label: string
  original_price: number
  sale_price?: number
}
