export default function BillCard({ value, backgroundColor }: { value: string, backgroundColor: string }) {
  return (
    <div className="w-[100px] h-[150px] border-2 border-[#ffc5d3] rounded-lg flex items-center justify-center" data-value={value} style={{ backgroundColor }}>
      {value}
    </div>
  )
} 