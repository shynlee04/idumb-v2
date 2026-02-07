/**
 * Panel component — Generic panel container using shadcn Card
 */

import type { ReactNode } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { BadgeVariant } from "@/components/ui/badge"

interface PanelProps {
  title: string
  badge?: string
  badgeVariant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function Panel({ title, badge, badgeVariant = "secondary", children, className }: PanelProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{title}</CardTitle>
        {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
