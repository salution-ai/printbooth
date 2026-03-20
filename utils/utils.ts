import { format } from "date-fns"

export const formatDate = (date: Date) => {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: vi })
}