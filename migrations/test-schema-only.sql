-- Isolated test project only. Generated from verified production column metadata.
begin;
create table public.profiles (
"id" uuid default auth.uid() not null,
"created_at" timestamp with time zone default now() not null,
"user_id" uuid default auth.uid() not null,
"name" text default ''::text,
"email" text default ''::text,
"avatar_url" text default ''::text,
"profile_visibility" text default '''private'''::text not null,
"username" text default ''::text not null,
"share_mode" text default 'recommendations'::text not null
);
alter table public.profiles enable row level security;
create table public.books (
"id" text default auth.uid() not null,
"created_at" timestamp with time zone default now() not null,
"user_id" uuid default auth.uid() not null,
"title" text default ''::text not null,
"author" text default ''::text not null,
"status" text default ''::text not null,
"amazon_rating" numeric,
"self_rating" numeric,
"recommended_by" text default ''::text,
"cover_url" text default ''::text,
"description" text,
"ai_summary" text,
"genre" text,
"is_public" boolean default false,
"auto_completed" boolean default false,
"published_year" integer,
"row_id" uuid default gen_random_uuid() not null
);
alter table public.books enable row level security;
create table public.user_books (
"id" uuid default gen_random_uuid() not null,
"user_id" uuid not null,
"book_id" text not null,
"status" text not null,
"rating" integer,
"notes" text,
"start_date" date,
"finish_date" date,
"created_at" timestamp with time zone default now(),
"updated_at" timestamp with time zone default now()
);
alter table public.user_books enable row level security;
create table public.activity_logs (
"id" uuid default gen_random_uuid() not null,
"user_id" uuid,
"book_id" text,
"action_type" text not null,
"from_status" text,
"to_status" text not null,
"created_at" timestamp with time zone default timezone('utc'::text, now())
);
alter table public.activity_logs enable row level security;
alter table public.profiles add primary key (id);
alter table public.user_books add primary key (id);
alter table public.user_books add unique (user_id,book_id);
alter table public.activity_logs add primary key (id);
alter table public.books add primary key (row_id);
alter table public.books add unique (user_id,id,status);
create policy "Allow public read access to public profiles" on public.profiles for SELECT to public using ((profile_visibility = 'public'::text));
create policy "Users can read their own profile" on public.profiles for SELECT to public using ((auth.uid() = user_id));
create policy "Users can update their own profile" on public.profiles for UPDATE to public using ((auth.uid() = user_id));
create policy "Public can read books for public profiles" on public.books for SELECT to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = books.user_id) AND (profiles.profile_visibility = 'public'::text)))));
create policy "Users can delete their own books" on public.books for DELETE to authenticated using ((user_id = auth.uid()));
create policy "Users can insert their own books" on public.books for INSERT to authenticated with check ((user_id = auth.uid()));
create policy "Users can read their own books" on public.books for SELECT to authenticated using ((user_id = auth.uid()));
create policy "Users can update their own books" on public.books for UPDATE to authenticated using ((user_id = auth.uid()));
create policy "Allow public read or owner access" on public.user_books for SELECT to public using (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = user_books.user_id) AND (profiles.profile_visibility = 'public'::text))))));
create policy "Allow public to read user_books for public profiles" on public.user_books for SELECT to public using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = user_books.user_id) AND (profiles.profile_visibility = 'public'::text)))));
create policy "Public can read recommended books of public profiles" on public.user_books for SELECT to public using (((status = 'recommended'::text) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = user_books.user_id) AND (profiles.profile_visibility = 'public'::text))))));
create policy "User books are deletable by owner" on public.user_books for DELETE to public using ((auth.uid() = user_id));
create policy "User books are editable by owner" on public.user_books for INSERT to public with check ((auth.uid() = user_id));
create policy "User books are updatable by owner" on public.user_books for UPDATE to public using ((auth.uid() = user_id));
create policy "User books are viewable by owner" on public.user_books for SELECT to public using ((auth.uid() = user_id));
create policy "Users can delete their own user_books" on public.user_books for DELETE to public using ((user_id = auth.uid()));
create policy "Users can insert their own user_books" on public.user_books for INSERT to authenticated with check ((user_id = auth.uid()));
create policy "Users can read their own user_books" on public.user_books for SELECT to public using ((user_id = auth.uid()));
create policy "Users can update their own user_books" on public.user_books for UPDATE to public using ((user_id = auth.uid()));
create policy "Users can delete their own activity logs" on public.activity_logs for DELETE to public using ((auth.uid() = user_id));
create policy "Users can insert their own logs" on public.activity_logs for INSERT to public with check ((auth.uid() = user_id));
create policy "Users can view their own activity logs" on public.activity_logs for SELECT to public using ((auth.uid() = user_id));
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
commit;
