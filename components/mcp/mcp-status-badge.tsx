import { Badge } from "@/components/ui/badge";
import type { McpServerStatus } from "@/types/mcp";

const STATUS_CONFIG: Record<
  McpServerStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  connected: { label: "연결됨", variant: "default" },
  connecting: { label: "연결 중", variant: "secondary" },
  disconnected: { label: "끊김", variant: "outline" },
  error: { label: "오류", variant: "destructive" },
};

export function McpStatusBadge({ status }: { status: McpServerStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
