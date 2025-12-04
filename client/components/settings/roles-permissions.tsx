"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Users } from "lucide-react"
import { mockRoles } from "@/lib/mock-data"

const availablePermissions = [
  { id: "products.view", module: "Products", action: "View", description: "View product listings" },
  { id: "products.create", module: "Products", action: "Create", description: "Create new products" },
  { id: "products.edit", module: "Products", action: "Edit", description: "Edit existing products" },
  { id: "products.delete", module: "Products", action: "Delete", description: "Delete products" },
  { id: "sales.view", module: "Sales", action: "View", description: "View invoices and sales" },
  { id: "sales.create", module: "Sales", action: "Create", description: "Create new invoices" },
  { id: "sales.edit", module: "Sales", action: "Edit", description: "Edit existing invoices" },
  { id: "sales.delete", module: "Sales", action: "Delete", description: "Delete invoices" },
  { id: "inventory.view", module: "Inventory", action: "View", description: "View inventory levels" },
  { id: "inventory.manage", module: "Inventory", action: "Manage", description: "Manage stock transfers" },
  { id: "reports.view", module: "Reports", action: "View", description: "View reports and analytics" },
  { id: "settings.manage", module: "Settings", action: "Manage", description: "Manage system settings" },
  { id: "users.manage", module: "Users", action: "Manage", description: "Manage user accounts" },
]

export function RolesPermissions() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId) ? prev.filter((id) => id !== permissionId) : [...prev, permissionId],
    )
  }

  const groupedPermissions = availablePermissions.reduce(
    (acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = []
      }
      acc[permission.module].push(permission)
      return acc
    },
    {} as Record<string, typeof availablePermissions>,
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>Manage user roles and access permissions</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                  <DialogDescription>Define a new role with specific permissions</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="roleName">Role Name</Label>
                    <Input id="roleName" placeholder="Enter role name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roleDescription">Description</Label>
                    <Input id="roleDescription" placeholder="Describe this role" />
                  </div>
                  <div className="space-y-3">
                    <Label>Permissions</Label>
                    <div className="max-h-96 space-y-4 overflow-y-auto rounded-md border p-4">
                      {Object.entries(groupedPermissions).map(([module, permissions]) => (
                        <div key={module} className="space-y-2">
                          <div className="font-medium text-sm">{module}</div>
                          <div className="space-y-2 pl-4">
                            {permissions.map((permission) => (
                              <div key={permission.id} className="flex items-start space-x-2">
                                <Checkbox
                                  id={permission.id}
                                  checked={selectedPermissions.includes(permission.id)}
                                  onCheckedChange={() => togglePermission(permission.id)}
                                />
                                <div className="grid gap-1 leading-none">
                                  <label
                                    htmlFor={permission.id}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {permission.action}
                                  </label>
                                  <p className="text-xs text-muted-foreground">{permission.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsAddDialogOpen(false)}>Create Role</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockRoles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{role.name}</CardTitle>
                      <CardDescription className="mt-1">{role.description}</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{role.userCount} user(s)</span>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Permissions</div>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 4).map((permission) => (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {permission.split(".")[1]}
                        </Badge>
                      ))}
                      {role.permissions.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.permissions.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
