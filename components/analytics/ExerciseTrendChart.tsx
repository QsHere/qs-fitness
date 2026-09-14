"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fromDateKey } from "@/lib/utils";

export interface ChartPoint {
  date: string;
  value: number;
  label?: string;
  isPR?: boolean;
}

function shortDate(dateKey: string) {
  return fromDateKey(dateKey).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function CustomTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 shadow-soft">
      <p className="text-[11px] font-medium text-ink-faint">{shortDate(p.date)}</p>
      <p className="text-sm font-semibold text-ink">
        {p.value} {unit}
      </p>
      {p.label && <p className="text-[11px] text-ink-soft">{p.label}</p>}
      {p.isPR && <p className="mt-0.5 text-[11px] font-semibold text-pulse">New PR</p>}
    </div>
  );
}

function Dot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
  color: string;
}) {
  const { cx, cy, payload, color } = props;
  if (cx == null || cy == null) return null;
  if (payload?.isPR) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="#2FE38A"
        stroke="#16171B"
        strokeWidth={1.5}
      />
    );
  }
  return <circle cx={cx} cy={cy} r={3} fill={color} />;
}

export function ExerciseTrendChart({
  points,
  color,
  unit,
}: {
  points: ChartPoint[];
  color: string;
  unit: string;
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl bg-paper text-sm text-ink-faint">
        No history yet
      </div>
    );
  }

  const gradientId = `grad-${color.replace("#", "")}`;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#E7E5E0" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fontSize: 11, fill: "#A3A5AC" }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#A3A5AC" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={(props: { cx?: number; cy?: number; payload?: ChartPoint; key?: string }) => (
              <Dot key={props.key} {...props} color={color} />
            )}
            activeDot={{ r: 5 }}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
