import type React from "react"
import { WorkspaceLink as Link } from "@/components/workspace-link"

export default function PeopleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6"> {/* added padding */}
      <div className="border-b">
        <div className="flex gap-6">
          <Link href="/people/users">
            <div className="pb-3 border-b-2 border-transparent hover:border-primary transition-colors">
              <span className="text-sm font-medium">Users</span>
            </div>
          </Link>
          <Link href="/people/billers">
            <div className="pb-3 border-b-2 border-transparent hover:border-primary transition-colors">
              <span className="text-sm font-medium">Billers</span>
            </div>
          </Link>
          <Link href="/people/customers">
            <div className="pb-3 border-b-2 border-transparent hover:border-primary transition-colors">
              <span className="text-sm font-medium">Customers</span>
            </div>
          </Link>
          <Link href="/people/suppliers">
            <div className="pb-3 border-b-2 border-transparent hover:border-primary transition-colors">
              <span className="text-sm font-medium">Suppliers</span>
            </div>
          </Link>
        </div>
      </div>
      {children}
    </div>
  )
}
