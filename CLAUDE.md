# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
composer run dev          # Start all services: Laravel, queue, Pail log viewer, and Vite
```

### Building
```bash
npm run build             # Build frontend assets
npm run build:ssr         # Build with SSR support
```

### Testing
```bash
php artisan test --compact                          # Run all tests
php artisan test --compact --filter=testName        # Run a specific test
php artisan test --compact tests/Feature/FooTest.php  # Run a single file
```

### Linting & Formatting
```bash
vendor/bin/pint --dirty --format agent   # Format modified PHP files (run after every PHP edit)
npm run lint                              # Fix JS/TS lint issues
npm run format                            # Format JS/TS with Prettier
npm run types:check                       # TypeScript type checking
```

### Useful Artisan
```bash
php artisan route:list --except-vendor    # View all routes
php artisan wayfinder:generate            # Regenerate TypeScript route functions (auto-runs via Vite)
```

### CI check (all checks at once)
```bash
composer run ci:check
```

## Architecture

### Tech Stack
- **Backend**: Laravel 13, PHP 8.4, Inertia.js v3 (server-side rendering via `Inertia::render()`)
- **Frontend**: React 19, TypeScript, TailwindCSS v4, shadcn/ui + Radix UI
- **Auth**: Laravel Fortify (phone-based, not email)
- **Permissions**: `spatie/laravel-permission` with Cyrillic role names
- **Typed routes**: Laravel Wayfinder — import from `@/actions/` (controllers) or `@/routes/` (named routes)
- **Dev server**: Laravel Herd — site is always available at `https://phorostudio.test`

### User Roles (in Russian/Cyrillic)
| Role | Description |
|------|-------------|
| `Админ` | Admin |
| `Фотограф` | Photographer |
| `Монтажер` | Montage editor |
| `Дизайнер` | Designer |
| `Печать` | Print operator |
| `Модератор` | Moderator |

Route groups are protected with `role:RoleName` middleware. New photographers must be approved (`approved_at`) before accessing their routes.

### Project Workflow
Projects move through six ordered stages defined in `ProjectStageDefinition`:

1. `new-project` — Project created, photographer prepares
2. `photographer-shot` — Photographer uploads source images
3. `client-photo-selection` — Client selects photos via a token-based public URL
4. `montage` — Montage/designer edits; assigned via `project_stage_user` pivot
5. `moderation` — Moderator reviews, may send back or approve
6. `printing` — Print operator handles final output

**Workflow mechanics** (`app/Models/Project.php`):
- `initializeWorkflow()` is called on `created` — creates all stages with `pending` status and activates the first
- `advanceToStage(slug)` — marks all prior stages completed and sets target stage to `in_progress`
- `ensureWorkflowState()` — activates the first pending stage if none is in progress
- `currentProjectStage()` — returns the active (or next pending, or last) stage
- Stage assignments (montage/print users) are stored in the `project_stage_user` pivot table

### Client Access
Clients access project selection and montage review via token URLs without authentication:
- `GET client/projects/{token}` — photo selection
- `GET client/montage-reviews/{token}` — montage review

### Key Directories
- `app/Models/` — Eloquent models; uses PHP 8 attribute syntax (`#[Fillable]`, `#[Hidden]`, `#[Appends]`)
- `app/Http/Controllers/Admin/` — Admin + moderator controllers
- `app/Http/Controllers/Concerns/` — Controller traits (e.g. `ResolvesAssignedMontageProject`)
- `app/Support/` — Standalone service classes: `ProjectPricingCalculator`, `PhoneNumber`, `PublicStorageUrl`
- `resources/js/pages/` — Inertia page components (maps to controller `Inertia::render('page-name')`)
- `resources/js/components/` — Shared React components
- `resources/js/actions/` & `resources/js/routes/` — Auto-generated Wayfinder typed route functions
- `lang/ru/frontend.php` & `lang/kk/frontend.php` — Frontend i18n strings (Russian + Kazakh)

### Shared Inertia Props
Defined in `HandleInertiaRequests::share()`. Every page receives:
- `auth.user` — authenticated user with role-based capability flags (`canApprovePhotographers`, `canMontageProjects`, etc.)
- `localization` — `currentLocale`, `availableLocales`, `translations` (lazy-loaded)
- `flash.toast` — `{ message, type }` for toast notifications (set via `session()->put('toast', [...])`)
- `sidebarOpen` — sidebar state from cookie

### Pricing
`app/Support/ProjectPricingCalculator.php` contains hardcoded album pricing rules (album type × size × cover type). This is the source of truth for unit and total price calculation.

### Image Storage
Public images are served via `PublicStorageUrl::make($path)` which generates signed or direct public URLs. Source images and montage assets use this pattern.

### Testing
- Tests use Pest v4 with the Laravel plugin
- Create tests: `php artisan make:test --pest {Name}`
- Feature tests live in `tests/Feature/`; most tests should be feature tests
- Factories exist for all major models; check for factory states before manually setting up models
