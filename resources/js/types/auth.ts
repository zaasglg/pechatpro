export type User = {
    id: number;
    city_id?: number | null;
    city_name?: string | null;
    name: string;
    phone: string;
    avatar?: string;
    instagram_url?: string;
    roles: string[];
    canApprovePhotographers?: boolean;
    canModerateProjects?: boolean;
    canMontageProjects?: boolean;
    canPrintProjects?: boolean;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User | null;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
