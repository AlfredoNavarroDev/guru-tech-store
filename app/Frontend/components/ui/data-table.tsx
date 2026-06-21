import { cn } from "@/lib/utils"

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={cn(
        "py-2 text-xs font-medium uppercase tracking-wider text-gray-500",
        right ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  right,
  mono,
}: {
  children: React.ReactNode
  right?: boolean
  mono?: boolean
}) {
  return (
    <td
      className={cn(
        "py-3 text-sm text-gray-700",
        right ? "text-right" : "text-left",
        mono && "font-mono tabular-nums",
      )}
    >
      {children}
    </td>
  )
}

export { Th, Td }
