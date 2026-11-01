-- ENEMIND categories
create table public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    slug text not null unique,
    description text,
    icon text,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

-- ENEMIND digital products
create table public.products (
    id uuid primary key default gen_random_uuid(),
    product_code text not null unique,
    title text not null,
    slug text not null unique,
    category_id uuid references public.categories(id),
    short_description text,
    description text,
    price numeric(10,2) not null default 0 check (price >= 0),
    currency text not null default 'KES'
        check (currency in ('KES', 'USD')),
    cover_image_url text,
    status text not null default 'draft'
        check (status in ('draft', 'published', 'archived')),
    is_featured boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.categories enable row level security;
alter table public.products enable row level security;

-- Visitors can view active categories
create policy "Anyone can view active categories"
on public.categories
for select
to anon, authenticated
using (is_active = true);

-- Visitors can view published products
create policy "Anyone can view published products"
on public.products
for select
to anon, authenticated
using (status = 'published');

insert into public.categories (name, slug, sort_order)
values
('Social Media & Digital Culture', 'social-media-digital-culture', 1),
('Jobs & Careers', 'jobs-careers', 2),
('Kids Learning & Education', 'kids-learning-education', 3),
('Online Work & Digital Income', 'online-work-digital-income', 4),
('Technology & AI', 'technology-ai', 5),
('Business & Entrepreneurship', 'business-entrepreneurship', 6),
('Money & Personal Finance', 'money-personal-finance', 7),
('Life Skills & Personal Development', 'life-skills-personal-development', 8),
('Travel, Adventure & Tourism', 'travel-adventure-tourism', 9),
('Gaming & eFootball', 'gaming-efootball', 10),
('Professional & Course Resources', 'professional-course-resources', 11),
('Project Ideas & Project Resources', 'project-ideas-resources', 12),
('Beauty & Personal Care', 'beauty-personal-care', 13),
('Sports, Football & Fitness', 'sports-football-fitness', 14),
('Teachers & Teaching Resources', 'teachers-teaching-resources', 15),
('Health, Wellness & Healthy Living', 'health-wellness-living', 16),
('Campus Life & First-Year Survival', 'campus-life-first-year', 17),
('Workers, Family & Better Living', 'workers-family-better-living', 18);