"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UsersManagement } from "./users-management"
import { RolesPermissions } from "./roles-permissions"
import { SystemSettings } from "./system-settings"

export function SettingsTabs() {
  return (
    <Tabs defaultValue="users" className="space-y-4">
      <TabsList>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        <TabsTrigger value="system">System Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="users">
        <UsersManagement />
      </TabsContent>

      <TabsContent value="roles">
        <RolesPermissions />
      </TabsContent>

      <TabsContent value="system">
        <SystemSettings />
      </TabsContent>
    </Tabs>
  )
}
