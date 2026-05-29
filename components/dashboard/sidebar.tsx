'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
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
  Wallet,
  Loader2,
} from 'lucide-react'

interface DashboardSidebarProps {
  user: User
  profile: Profile | null
}

const doctorNavItems = [
  { title: 'Pacientes', href: '/dashboard/patients', icon: Users },
  { title: 'Historial', href: '/dashboard/history', icon: History },
  { title: 'Mis Registros', href: '/dashboard/records', icon: Shield },
]

const auditorNavItems = [
  { title: 'Panel de Auditoria', href: '/dashboard/audit', icon: ClipboardCheck },
  { title: 'Verificar Sesion', href: '/dashboard/audit/verify', icon: FileCheck },
  { title: 'Analiticas', href: '/dashboard/analytics', icon: BarChart3 },
]

const adminNavItems = [
  { title: 'Analiticas', href: '/dashboard/analytics', icon: BarChart3 },
]

export function DashboardSidebar({ user, profile }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const role = profile?.role || 'doctor'

  const [walletAddress, setWalletAddress] = useState<string | null>(profile?.wallet_address || null)
  const [isCorrectChain, setIsCorrectChain] = useState<boolean>(true)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)

  const BRAGA_CHAIN_ID = '0xe0087f86e' // 60138453102 in hex

  const isBragaChain = (chainId: any) => {
    if (!chainId) return false
    const idStr = String(chainId)
    return idStr.toLowerCase() === BRAGA_CHAIN_ID || parseInt(idStr, 16) === 60138453102 || parseInt(idStr, 10) === 60138453102
  }

  // Check if wallet is connected on mount
  useEffect(() => {
    const checkWallet = async () => {
      const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null
      if (ethereum) {
        try {
          const accounts = await ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            const address = accounts[0]
            setWalletAddress(address)
            
            // Check chain ID
            const chainId = await ethereum.request({ method: 'eth_chainId' })
            setIsCorrectChain(isBragaChain(chainId))
          }
        } catch (err) {
          console.error('Error checking wallet:', err)
        }
      }
    }
    checkWallet()
  }, [])

  // Listen for wallet events
  useEffect(() => {
    const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null
    if (!ethereum) return

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length > 0) {
        const address = accounts[0]
        setWalletAddress(address)
        await syncWalletAddress(address)
      } else {
        setWalletAddress(null)
        await syncWalletAddress(null)
      }
    }

    const handleChainChanged = (chainId: string) => {
      setIsCorrectChain(isBragaChain(chainId))
    }

    ethereum.on('accountsChanged', handleAccountsChanged)
    ethereum.on('chainChanged', handleChainChanged)

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged)
      ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [])

  const syncWalletAddress = async (address: string | null) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })
      if (!res.ok) {
        throw new Error('Error al sincronizar perfil')
      }
    } catch (err) {
      console.error('Error syncing wallet address:', err)
      toast.error('No se pudo guardar la wallet en tu perfil')
    }
  }

  const switchNetwork = async () => {
    const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null
    if (!ethereum) return false

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BRAGA_CHAIN_ID }],
      })
      setIsCorrectChain(true)
      return true
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BRAGA_CHAIN_ID,
              chainName: 'Braga',
              nativeCurrency: {
                name: 'Golem',
                symbol: 'GLM',
                decimals: 18,
              },
              rpcUrls: ['https://braga.hoodi.arkiv.network/rpc'],
              blockExplorerUrls: ['https://explorer.braga.hoodi.arkiv.network/'],
            }],
          })
          setIsCorrectChain(true)
          return true
        } catch (addError) {
          console.error('Error adding network:', addError)
          toast.error('No se pudo agregar la red Braga Testnet')
        }
      } else {
        console.error('Error switching network:', switchError)
        toast.error('No se pudo cambiar a la red Braga Testnet')
      }
    }
    return false
  }

  const connectWallet = async () => {
    const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null
    if (!ethereum) {
      toast.error('MetaMask no está instalado. Instálalo para conectar tu wallet.')
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
      const address = accounts[0]
      setWalletAddress(address)

      // Verify chain
      const chainId = await ethereum.request({ method: 'eth_chainId' })
      let correct = isBragaChain(chainId)
      
      if (!correct) {
        correct = await switchNetwork()
      } else {
        setIsCorrectChain(true)
      }

      await syncWalletAddress(address)
      if (correct) {
        toast.success('Wallet conectada en Braga Testnet')
      } else {
        toast.warning('Wallet conectada, pero debes cambiar a la red Braga')
      }
    } catch (err) {
      console.error('Error connecting wallet:', err)
      toast.error('Error al conectar la wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = async () => {
    setWalletAddress(null)
    await syncWalletAddress(null)
    toast.success('Wallet desconectada')
  }

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
        <div className="flex items-center gap-2 px-1 py-1">
          <img src="/logo.png" alt="NotarIA Logo" className="h-8 w-8 object-contain shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-foreground tracking-tight">NotarIA</span>
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

      <SidebarFooter className="border-t border-sidebar-border gap-2 p-2">
        {/* Web3 Wallet connection panel */}
        <div className="px-2 py-1">
          {walletAddress ? (
            <div className="flex flex-col gap-1 p-2 rounded-lg bg-card/60 border border-border/80 backdrop-blur-sm shadow-sm transition-all hover:bg-card/85">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={`h-2 w-2 rounded-full ${isCorrectChain ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'} shrink-0`} />
                  <span className="text-[11px] font-medium text-foreground/80 truncate font-mono">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                </div>
                <Badge 
                  variant={isCorrectChain ? "outline" : "destructive"} 
                  className="text-[9px] px-1 py-0 h-4 uppercase font-semibold shrink-0 cursor-pointer"
                  onClick={!isCorrectChain ? switchNetwork : undefined}
                  title={!isCorrectChain ? "Click para cambiar a Braga" : "Conectado a Braga Testnet"}
                >
                  {isCorrectChain ? "Braga" : "Incorrecta"}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-0.5 border-t border-border/40 pt-1.5">
                <span>Propiedad Web3 Activa</span>
                <button 
                  onClick={disconnectWallet}
                  className="hover:text-destructive transition-colors underline shrink-0 font-medium cursor-pointer"
                >
                  Desconectar
                </button>
              </div>
            </div>
          ) : (
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              variant="outline"
              className="w-full h-8 justify-start gap-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border-emerald-500/20 hover:border-emerald-500/30 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition-all hover:scale-[1.01] duration-300 cursor-pointer"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span className="truncate">Conectando...</span>
                </>
              ) : (
                <>
                  <Wallet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">Conectar Wallet</span>
                </>
              )}
            </Button>
          )}
        </div>

        {/* User profile section */}
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
