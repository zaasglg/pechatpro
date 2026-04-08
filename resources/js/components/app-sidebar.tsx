import { Link, usePage } from '@inertiajs/react';
import { BarChart3, Folder, MapPinned, Printer, ShieldCheck, WandSparkles } from 'lucide-react';
import { index as cityIndex } from '@/actions/App/Http/Controllers/Admin/CityController';
import { index as moderatorProjectIndex } from '@/actions/App/Http/Controllers/Admin/ModeratorProjectController';
import { index as photographerApprovalIndex } from '@/actions/App/Http/Controllers/Admin/PhotographerApprovalController';
import { index as montageProjectIndex } from '@/actions/App/Http/Controllers/MontageProjectController';
import { index as projectIndex } from '@/actions/App/Http/Controllers/PhotographerProjectController';
import { index as printProjectIndex } from '@/actions/App/Http/Controllers/PrintProjectController';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { auth } = usePage().props;
    const mainNavItems: NavItem[] = [
        {
            title: 'Аналитика',
            href: dashboard(),
            icon: BarChart3,
        },
        ...(auth.user?.roles.includes('Фотограф')
            ? [
                  {
                      title: 'Проекты',
                      href: projectIndex(),
                      icon: Folder,
                  } satisfies NavItem,
              ]
            : []),
        ...(auth.user?.canApprovePhotographers
            ? [
                  {
                      title: 'Города',
                      href: cityIndex(),
                      icon: MapPinned,
                  } satisfies NavItem,
                  {
                      title: 'Подтверждения',
                      href: photographerApprovalIndex(),
                      icon: ShieldCheck,
                  } satisfies NavItem,
              ]
            : []),
        ...(auth.user?.canModerateProjects
            ? [
                  {
                      title: 'Проекты модератора',
                      href: moderatorProjectIndex(),
                      icon: ShieldCheck,
                  } satisfies NavItem,
              ]
            : []),
        ...(auth.user?.canMontageProjects
            ? [
                  {
                      title: 'Монтаж',
                      href: montageProjectIndex(),
                      icon: WandSparkles,
                  } satisfies NavItem,
              ]
            : []),
        ...(auth.user?.canPrintProjects
            ? [
                  {
                      title: 'Печать',
                      href: printProjectIndex(),
                      icon: Printer,
                  } satisfies NavItem,
              ]
            : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="sidebar" className="border-none bg-transparent">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-white/5 data-[state=open]:bg-white/5 transition-colors">
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
