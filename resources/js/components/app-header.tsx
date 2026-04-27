import { Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    Calculator,
    Folder,
    MapPinned,
    Menu,
    Printer,
    ShieldCheck,
    Users,
    WandSparkles,
} from 'lucide-react';
import { index as cityIndex } from '@/actions/App/Http/Controllers/Admin/CityController';
import { index as moderatorProjectIndex } from '@/actions/App/Http/Controllers/Admin/ModeratorProjectController';
import { index as photographerApprovalIndex } from '@/actions/App/Http/Controllers/Admin/PhotographerApprovalController';
import { index as projectPriceIndex } from '@/actions/App/Http/Controllers/Admin/ProjectPriceController';
import { index as adminUsersIndex } from '@/actions/App/Http/Controllers/Admin/UserController';
import { index as montageProjectIndex } from '@/actions/App/Http/Controllers/MontageProjectController';
import { index as projectIndex } from '@/actions/App/Http/Controllers/PhotographerProjectController';
import { index as printProjectIndex } from '@/actions/App/Http/Controllers/PrintProjectController';
import AppLogo from '@/components/app-logo';
import AppLogoIcon from '@/components/app-logo-icon';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserMenuContent } from '@/components/user-menu-content';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { BreadcrumbItem, NavItem } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

const activeItemStyles = 'bg-white/8 text-white';

export function AppHeader({ breadcrumbs = [] }: Props) {
    const page = usePage();
    const { auth } = page.props;
    const getInitials = useInitials();
    const { isCurrentUrl, whenCurrentUrl } = useCurrentUrl();
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
        ...(auth.user?.canManageProjectPrices
            ? [
                  {
                      title: 'Правила цен',
                      href: projectPriceIndex(),
                      icon: Calculator,
                  } satisfies NavItem,
              ]
            : []),
        ...(auth.user?.canManageUsers
            ? [
                  {
                      title: 'Пользователи',
                      href: adminUsersIndex(),
                      icon: Users,
                  } satisfies NavItem,
              ]
            : []),
        ...(auth.user?.canModerateProjects
            ? [
                  {
                      title: 'Проекты',
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
        <>
            <div className="border-b border-white/8 bg-background/78 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4">
                    {/* Mobile Menu */}
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="mr-2 h-[34px] w-[34px]"
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="flex h-full w-72 flex-col items-stretch justify-between p-0 text-sidebar-foreground"
                            >
                                <SheetTitle className="sr-only">
                                    Меню навигации
                                </SheetTitle>
                                <SheetHeader className="flex justify-start text-left">
                                    <AppLogoIcon className="h-6 w-6 fill-current text-black dark:text-white" />
                                </SheetHeader>
                                <div className="flex h-full flex-1 flex-col space-y-4 p-4">
                                    <div className="flex h-full flex-col justify-between text-sm">
                                        <div className="flex flex-col space-y-4">
                                            {mainNavItems.map((item) => (
                                                <Link
                                                    key={item.title}
                                                    href={item.href}
                                                    className={cn(
                                                        'flex items-center space-x-2 rounded-xl px-3 py-2 font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                                        isCurrentUrl(item.href)
                                                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                                            : 'text-sidebar-foreground/80',
                                                    )}
                                                >
                                                    {item.icon && (
                                                        <item.icon className="h-5 w-5" />
                                                    )}
                                                    <span>{item.title}</span>
                                                </Link>
                                            ))}
                                        </div>

                                        <div />
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Link
                        href={dashboard()}
                        prefetch
                        className="flex items-center space-x-2"
                    >
                        <AppLogo />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="ml-6 hidden h-full items-center lg:flex">
                        <NavigationMenu className="flex h-full items-stretch">
                            <NavigationMenuList className="flex h-full items-stretch gap-1">
                                {mainNavItems.map((item) => (
                                    <NavigationMenuItem
                                        key={item.title}
                                        className="relative flex h-full items-center"
                                    >
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                navigationMenuTriggerStyle(),
                                                whenCurrentUrl(
                                                    item.href,
                                                    activeItemStyles,
                                                ),
                                                'h-10 cursor-pointer rounded-xl bg-transparent px-4 text-sm text-muted-foreground hover:bg-white/5 hover:text-white',
                                            )}
                                        >
                                            {item.icon && (
                                                <item.icon className="mr-2 h-4 w-4" />
                                            )}
                                            {item.title}
                                        </Link>
                                        {isCurrentUrl(item.href) && (
                                            <div className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-primary"></div>
                                        )}
                                    </NavigationMenuItem>
                                ))}
                            </NavigationMenuList>
                        </NavigationMenu>
                    </div>

                    <div className="ml-auto flex items-center space-x-2">
                        <div className="hidden items-center lg:flex">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="glass-control rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground">
                                        {auth.user?.roles?.join(', ')}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent showArrow={false}>
                                    <p>Текущие роли пользователя</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="size-10 rounded-full p-1"
                                >
                                    <Avatar className="size-8 overflow-hidden rounded-full">
                                        <AvatarImage
                                            src={auth.user?.avatar}
                                            alt={auth.user?.name}
                                        />
                                        <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                            {getInitials(auth.user?.name ?? '')}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                {auth.user && (
                                    <UserMenuContent user={auth.user} />
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
            {breadcrumbs.length > 1 && (
                <div className="flex w-full border-b border-white/6 bg-background/32 backdrop-blur-xl">
                    <div className="mx-auto flex h-12 w-full max-w-7xl items-center justify-start px-4 text-neutral-500">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </>
    );
}
