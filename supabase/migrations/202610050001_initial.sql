-- StayGuide: tenant-isolated schema. Run via Supabase CLI with an authorized database connection.
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '', avatar_url text, push_token text,
 created_at timestamptz not null default now()
);
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null,
 created_by uuid not null references auth.users(id), stripe_connect_id text unique,
 connect_ready boolean not null default false, custom_domain text unique,
 branding jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.org_members (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','manager','cleaner')), primary key(organization_id,user_id)
);
create table public.properties (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null, slug text unique not null, location text not null default '', address text, lat double precision, lng double precision,
 check_in text default '15:00', check_out text default '11:00', wifi jsonb not null default '{}', cover text,
 languages text[] not null default '{en}', branding jsonb not null default '{}',
 status text not null default 'draft' check(status in ('draft','published')), active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.guide_sections (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id) on delete cascade,
 type text not null, title text not null, body_markdown text not null default '', sort_order integer not null default 0,
 icon text not null default 'book', photos text[] not null default '{}', sensitive boolean not null default false,
 updated_at timestamptz not null default now()
);
create table public.places (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id) on delete cascade,
 name text not null, description text, category text, lat double precision, lng double precision, url text
);
create table public.extras (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id) on delete cascade,
 name text not null, description text, amount_cents integer not null check(amount_cents>=100), currency text not null default 'usd',
 requires_approval boolean not null default false, active boolean not null default true
);
create table public.stays (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id) on delete cascade,
 guest_name text, guest_email text, access_code_hash text, starts_at timestamptz not null, ends_at timestamptz not null,
 check(ends_at>starts_at)
);
create table public.extra_orders (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id), extra_id uuid not null references public.extras(id),
 stay_id uuid references public.stays(id), guest_email text not null,
 status text not null default 'pending' check(status in ('pending','approved','paid','refunded','declined')),
 amount_cents integer not null check(amount_cents>0), platform_fee_cents integer not null check(platform_fee_cents>=0),
 stripe_checkout_id text unique, stripe_payment_intent_id text unique, created_at timestamptz not null default now()
);
create table public.chat_threads (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id) on delete cascade,
 stay_id uuid references public.stays(id), escalated boolean not null default false, resolved boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.chat_messages (
 id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.chat_threads(id) on delete cascade,
 role text not null check(role in ('user','assistant','host')), content text not null check(length(content)<=20000),
 language text not null default 'en', escalated boolean not null default false, citations jsonb not null default '[]',
 created_at timestamptz not null default now()
);
create table public.guide_embeddings (
 id uuid primary key default gen_random_uuid(), section_id uuid not null references public.guide_sections(id) on delete cascade,
 property_id uuid not null references public.properties(id) on delete cascade, content text not null,
 embedding extensions.vector(1536), content_hash text not null, unique(section_id,content_hash)
);
create table public.subscriptions (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 stripe_customer_id text unique, stripe_subscription_id text unique, plan text not null default 'free' check(plan in ('free','starter','pro')),
 status text not null default 'active', quantity integer not null default 1 check(quantity>0),
 current_period_end timestamptz, stripe_event_created bigint not null default 0
);
create table public.usage_counters (
 property_id uuid not null references public.properties(id) on delete cascade, month date not null,
 messages integer not null default 0 check(messages>=0), primary key(property_id,month)
);
create table public.guide_views (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id) on delete cascade,
 language text, viewed_at timestamptz not null default now()
);
create table public.guide_translations (
 section_id uuid not null references public.guide_sections(id) on delete cascade, language text not null,
 source_hash text not null, title text not null, body_markdown text not null, primary key(section_id,language,source_hash)
);
create table public.stripe_events (id text primary key, processed_at timestamptz not null default now());
create table public.rate_limit_buckets (key text primary key, window_start timestamptz not null, requests integer not null);

-- SECURITY DEFINER avoids recursive RLS on org_members. No caller-controlled SQL.
create function public.is_member(org_id uuid, allowed_roles text[] default array['owner','manager','cleaner']) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.org_members where organization_id=org_id and user_id=auth.uid() and role=any(allowed_roles));
$$;
create function public.can_access_property(property uuid, allowed_roles text[] default array['owner','manager','cleaner']) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.properties p where p.id=property and public.is_member(p.organization_id,allowed_roles));
$$;

alter table public.profiles enable row level security;
create policy own_profile on public.profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
alter table public.organizations enable row level security;
create policy org_read on public.organizations for select to authenticated using(public.is_member(id));
-- Organization billing/Connect fields are server-managed; no direct update policy.
alter table public.org_members enable row level security;
create policy member_read on public.org_members for select to authenticated using(public.is_member(organization_id));
-- Membership mutations go through narrowly scoped server workflows.
alter table public.properties enable row level security;
create policy property_read on public.properties for select to authenticated using(public.is_member(organization_id));
-- Property creation goes through create_property to enforce plan limits.
create policy property_update on public.properties for update to authenticated using(public.is_member(organization_id,array['owner','manager'])) with check(public.is_member(organization_id,array['owner','manager']));

-- Every child table is tenant-scoped. Anonymous users have NO direct table access.
do $$ declare t text; begin
 foreach t in array array['guide_sections','places','extras','stays','chat_threads'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy tenant_read on public.%I for select to authenticated using(public.can_access_property(property_id))',t);
  execute format('create policy tenant_write on public.%I for all to authenticated using(public.can_access_property(property_id,array[''owner'',''manager''])) with check(public.can_access_property(property_id,array[''owner'',''manager'']))',t);
 end loop;
 foreach t in array array['extra_orders','usage_counters','guide_views','guide_embeddings'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy tenant_read on public.%I for select to authenticated using(public.can_access_property(property_id,array[''owner'',''manager'']))',t);
 end loop;
end $$;
alter table public.chat_messages enable row level security;
create policy message_read on public.chat_messages for select to authenticated using(exists(select 1 from public.chat_threads t where t.id=thread_id and public.can_access_property(t.property_id,array['owner','manager'])));
create policy host_reply on public.chat_messages for insert to authenticated with check(role='host' and exists(select 1 from public.chat_threads t where t.id=thread_id and public.can_access_property(t.property_id,array['owner','manager'])));
alter table public.subscriptions enable row level security;
create policy billing_read on public.subscriptions for select to authenticated using(public.is_member(organization_id,array['owner']));
alter table public.guide_translations enable row level security;
create policy translation_read on public.guide_translations for select to authenticated using(exists(select 1 from public.guide_sections s where s.id=section_id and public.can_access_property(s.property_id)));
alter table public.stripe_events enable row level security;
alter table public.rate_limit_buckets enable row level security;

create function public.create_organization(org_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if length(trim(org_name))<2 or length(org_name)>120 then raise exception 'Invalid name'; end if;
 insert into public.organizations(name,created_by) values(trim(org_name),auth.uid()) returning id into new_id;
 insert into public.org_members values(new_id,auth.uid(),'owner');
 insert into public.subscriptions(organization_id) values(new_id);
 return new_id;
end; $$;
create function public.create_property(org_id uuid,property_name text,property_location text,manual text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare property_limit integer; current_count integer; new_property public.properties;
begin
 if not public.is_member(org_id,array['owner','manager']) then raise exception 'Forbidden'; end if;
 perform pg_advisory_xact_lock(hashtextextended(org_id::text,0));
 select case plan when 'pro' then 100 when 'starter' then 20 else 1 end into property_limit from public.subscriptions where organization_id=org_id;
 select count(*) into current_count from public.properties where organization_id=org_id and active;
 if current_count>=coalesce(property_limit,1) then raise exception 'Property limit reached'; end if;
 if length(property_name)<2 or length(property_name)>120 or length(manual)>12000 then raise exception 'Invalid property'; end if;
 insert into public.properties(organization_id,name,location,slug) values(org_id,property_name,property_location,lower(regexp_replace(property_name,'[^a-zA-Z0-9]+','-','g'))||'-'||substr(gen_random_uuid()::text,1,8)) returning * into new_property;
 if length(manual)>0 then insert into public.guide_sections(property_id,type,title,body_markdown,sensitive) values(new_property.id,'manual','Your house manual',manual,true); end if;
 return to_jsonb(new_property);
end; $$;

-- Atomic DB quota accounting: concurrent requests cannot exceed the plan limit.
create function public.consume_ai_usage(target_property uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare cap integer; used integer; current_month date:=date_trunc('month',now() at time zone 'UTC')::date;
begin
 select case s.plan when 'pro' then 1500 when 'starter' then 300 else 25 end into cap from public.properties p left join public.subscriptions s on s.organization_id=p.organization_id where p.id=target_property and p.active;
 if cap is null then return false; end if;
 insert into public.usage_counters(property_id,month,messages) values(target_property,current_month,1)
 on conflict(property_id,month) do update set messages=public.usage_counters.messages+1 where public.usage_counters.messages<cap returning messages into used;
 return used is not null;
end; $$;
create function public.consume_host_ai_usage(target_property uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.can_access_property(target_property,array['owner','manager']) then raise exception 'Forbidden'; end if;
 return public.consume_ai_usage(target_property);
end; $$;
create function public.consume_public_rate_limit(bucket_key text,max_requests integer,window_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare used integer;
begin
 insert into public.rate_limit_buckets(key,window_start,requests) values(bucket_key,now(),1)
 on conflict(key) do update set requests=case when public.rate_limit_buckets.window_start<now()-make_interval(secs=>window_seconds) then 1 else public.rate_limit_buckets.requests+1 end,
 window_start=case when public.rate_limit_buckets.window_start<now()-make_interval(secs=>window_seconds) then now() else public.rate_limit_buckets.window_start end
 returning requests into used;
 return used<=max_requests;
end; $$;
create function public.apply_subscription_event(event_id text,event_created bigint,record jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 -- Event receipt and subscription mutation commit together; failed deliveries remain retryable.
 insert into public.stripe_events(id) values(event_id) on conflict do nothing;
 if not found then return; end if;
 insert into public.subscriptions(organization_id,stripe_customer_id,stripe_subscription_id,plan,status,quantity,current_period_end,stripe_event_created)
 values((record->>'organization_id')::uuid,record->>'stripe_customer_id',record->>'stripe_subscription_id',record->>'plan',record->>'status',(record->>'quantity')::integer,(record->>'current_period_end')::timestamptz,event_created)
 on conflict(organization_id) do update set stripe_customer_id=excluded.stripe_customer_id,stripe_subscription_id=excluded.stripe_subscription_id,plan=excluded.plan,status=excluded.status,quantity=excluded.quantity,current_period_end=excluded.current_period_end,stripe_event_created=excluded.stripe_event_created
 where public.subscriptions.stripe_event_created<=excluded.stripe_event_created;
end; $$;
create function public.match_guide_sections(target_property uuid,query_embedding extensions.vector(1536),match_count integer default 5) returns table(section_id uuid,content text,similarity double precision) language sql stable security definer set search_path='' as $$
 select e.section_id,e.content,1-(e.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
 from public.guide_embeddings e join public.guide_sections s on s.id=e.section_id
 where e.property_id=target_property and s.property_id=target_property and not s.sensitive
 order by e.embedding OPERATOR(extensions.<=>) query_embedding limit least(greatest(match_count,1),10);
$$;

-- Revoke PostgreSQL's default PUBLIC execute permission on privileged functions.
revoke all on function public.is_member(uuid,text[]),public.can_access_property(uuid,text[]) from public;
grant execute on function public.is_member(uuid,text[]),public.can_access_property(uuid,text[]) to authenticated;
revoke all on function public.create_organization(text),public.create_property(uuid,text,text,text),public.consume_host_ai_usage(uuid) from public;
grant execute on function public.create_organization(text),public.create_property(uuid,text,text,text),public.consume_host_ai_usage(uuid) to authenticated;
revoke all on function public.consume_ai_usage(uuid),public.consume_public_rate_limit(text,integer,integer),public.apply_subscription_event(text,bigint,jsonb),public.match_guide_sections(uuid,extensions.vector,integer) from public,anon,authenticated;
grant execute on function public.consume_ai_usage(uuid),public.consume_public_rate_limit(text,integer,integer),public.apply_subscription_event(text,bigint,jsonb),public.match_guide_sections(uuid,extensions.vector,integer) to service_role;

create index properties_org_idx on public.properties(organization_id);
create index sections_property_idx on public.guide_sections(property_id,sort_order);
create index threads_property_idx on public.chat_threads(property_id,created_at desc);
create index messages_thread_idx on public.chat_messages(thread_id,created_at);
create index orders_property_idx on public.extra_orders(property_id,created_at);
create index views_property_idx on public.guide_views(property_id,viewed_at);
create index embeddings_property_idx on public.guide_embeddings(property_id);

-- Private storage; paths must begin with a property UUID belonging to the host.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('property-photos','property-photos',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy photo_read on storage.objects for select to authenticated using(bucket_id='property-photos' and public.can_access_property(((storage.foldername(name))[1])::uuid));
create policy photo_insert on storage.objects for insert to authenticated with check(bucket_id='property-photos' and public.can_access_property(((storage.foldername(name))[1])::uuid,array['owner','manager']));
create policy photo_delete on storage.objects for delete to authenticated using(bucket_id='property-photos' and public.can_access_property(((storage.foldername(name))[1])::uuid,array['owner','manager']));
-- Realtime uses the same RLS policies.
alter publication supabase_realtime add table public.chat_messages,public.chat_threads,public.extra_orders;

-- Keep tenant identity and active-property accounting server-managed.
revoke update on public.properties from authenticated;
grant update(name,location,address,lat,lng,check_in,check_out,wifi,cover,languages,branding,status,updated_at) on public.properties to authenticated;
-- Cleaner access needs a limited operational projection before it can be enabled.
-- Until that projection exists, private guides, stays, and Wi-Fi remain manager/owner only.
create or replace function public.can_access_property(property uuid, allowed_roles text[] default array['owner','manager']) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.properties p where p.id=property and public.is_member(p.organization_id,allowed_roles));
$$;
drop policy property_read on public.properties;
create policy property_read on public.properties for select to authenticated using(public.is_member(organization_id,array['owner','manager']));
