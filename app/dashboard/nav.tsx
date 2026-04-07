"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠", exact: true },
  { href: "/dashboard/transactions", label: "Tranzacții", icon: "💳" },
  { href: "/dashboard/banks", label: "Bănci", icon: "🏦" },
  { href: "/dashboard/categories", label: "Categorii", icon: "📁" },
  { href: "/dashboard/currencies", label: "Valute", icon: "💱" },
  { href: "/dashboard/upload", label: "Import", icon: "📤" },
  { href: "/dashboard/reports", label: "Rapoarte", icon: "📊" },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="relative z-10"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}>
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-1.5 px-3 py-3 text-xs font-bold whitespace-nowrap transition-all"
                style={{
                  color: active ? "#2dd4bf" : "rgba(255,255,255,0.45)",
                  borderBottom: active ? "2px solid #14b8a6" : "2px solid transparent",
                }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
