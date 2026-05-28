'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  MessageSquarePlus,
  History,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronUp,
  FileCheck,
  Users,
} from 'lucide-react'

interface DashboardSidebarProps {
  user: User
  profile: Profile | null
}

const doctorNavItems = [
  { title: 'Pacientes', href: '/dashboard/patients', icon: Users },
  { title: 'Nueva Sesion', href: '/dashboard', icon: MessageSquarePlus },
  { title: 'Historial', href: '/dashboard/history', icon: History },
]

const auditorNavItems = [
  { title: 'Panel de Auditoria', href: '/dashboard/audit', icon: ClipboardCheck },
  { title: 'Verificar Sesion', href: '/dashboard/audit/verify', icon: FileCheck },
  { title: 'Analiticas', href: '/dashboard/analytics', icon: BarChart3 },
]

const adminNavItems = [
  { title: 'Analiticas', href: '/dashboard/analytics', icon: BarChart3 },
  { title: 'Configuracion', href: '/dashboard/settings', icon: Settings },
]

export function DashboardSidebar({ user, profile }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const role = profile?.role || 'doctor'

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const getInitials = (name: string | null) => {
    if (!name) return user.email?.charAt(0).toUpperCase() || 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default'
      case 'auditor':
      case 'compliance_officer':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <Shield className="h-6 w-6 text-sidebar-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">NotarIA</span>
            <span className="text-xs text-sidebar-foreground/60">Clinical Witness</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Doctor/Clinician Nav */}
        {(role === 'doctor' || role === 'admin') && (
          <SidebarGroup>
            <SidebarGroupLabel>Clinico</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {doctorNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Auditor Nav */}
        {(role === 'auditor' || role === 'compliance_officer' || role === 'admin') && (
          <SidebarGroup>
            <SidebarGroupLabel>Auditoria y Compliance</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {auditorNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin Nav */}
        {role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Administracion</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground">
                      {getInitials(profile?.full_name ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-xs">
                    <span className="font-medium truncate max-w-[120px]">
                      {profile?.full_name || user.email}
                    </span>
                    <Badge variant={getRoleBadgeVariant(role)} className="text-[10px] px-1 py-0">
                      {role.replace('_', ' ')}
                    </Badge>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{profile?.full_name || 'User'}</span>
                    <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Configuracion
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export function DashboardHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="flex items-center gap-4 border-b border-border bg-card px-6 py-4">
      <SidebarTrigger className="-ml-2" />
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </header>
  )
}
