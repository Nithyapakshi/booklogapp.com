-- REVIEW DRAFT. Do not run on production without owner approval.
-- No credential is created. The operator must configure a hash out of band.
-- Provider-period reconciliation is required before enabling; see review notes.
begin;
create schema if not exists booklog_ai;
revoke all on schema booklog_ai from public, anon, authenticated;

create table if not exists booklog_ai.config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  secret_hash bytea,
  monthly_micro bigint not null default 13500000 check (monthly_micro between 0 and 15000000),
  daily_micro bigint not null default 450000 check (daily_micro between 0 and 450000),
  daily_calls integer not null default 40 check (daily_calls between 0 and 100),
  baseline_month date,
  baseline_micro bigint not null default 0 check (baseline_micro >= 0),
  baseline_day date,
  daily_baseline_micro bigint not null default 0 check (daily_baseline_micro >= 0),
  provider_period_start timestamptz,
  provider_period_end timestamptz,
  provider_baseline_micro bigint not null default 0 check (provider_baseline_micro >= 0)
);
insert into booklog_ai.config(singleton) values (true) on conflict do nothing;

create table if not exists booklog_ai.reservations (
  id uuid primary key,
  user_id uuid not null,
  purpose text not null check (purpose in ('ask', 'same-spirit')),
  reserved_micro bigint not null check (reserved_micro > 0),
  charged_micro bigint not null check (charged_micro >= 0),
  input_tokens integer not null,
  output_limit integer not null,
  cache_keys text[] not null default array[]::text[],
  settled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ai_reservation_time on booklog_ai.reservations(created_at);
create table if not exists booklog_ai.cache (
  key text primary key check (length(key) between 3 and 700),
  payload jsonb,
  expires_at timestamptz,
  claim uuid,
  claimed_until timestamptz,
  cooldown_until timestamptz
);
alter table booklog_ai.config enable row level security;
alter table booklog_ai.reservations enable row level security;
alter table booklog_ai.cache enable row level security;
revoke all on all tables in schema booklog_ai from public, anon, authenticated;

-- One narrow RPC; all data access is gated by the server-only secret.
create or replace function public.booklog_ai_op(p_secret text, p_op text, p_args jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare
  cfg booklog_ai.config%rowtype;
  r booklog_ai.reservations%rowtype;
  c booklog_ai.cache%rowtype;
  month_start timestamptz := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
  day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  input_n integer;
  output_n integer;
  reserve_n bigint;
  actual_n bigint;
  month_used bigint;
  day_used bigint;
  calls_n integer;
  period_used bigint;
  keys_n text[];
  k text;
  payload_n jsonb;
  request_id uuid;
  uid uuid;
  purpose_n text;
begin
  -- Lock serializes claims, reservations and settlements across all instances.
  select * into cfg from booklog_ai.config where singleton = true for update;
  if cfg.secret_hash is null or p_secret is null or length(p_secret) < 32
     or sha256(convert_to(p_secret, 'UTF8')) <> cfg.secret_hash then
    raise exception 'Unauthorized AI operation' using errcode = '42501';
  end if;
  if p_args is null or octet_length(p_args::text) > 100000 then raise exception 'Invalid arguments'; end if;
  if not cfg.enabled and p_op<>'settle' then return jsonb_build_object('ok',false,'reason','disabled'); end if;
  if p_op = 'reserve' then
    input_n := (p_args->>'input_tokens')::integer;
    output_n := (p_args->>'output_limit')::integer;
    purpose_n := p_args->>'purpose';
    uid := (p_args->>'user_id')::uuid;
    request_id := (p_args->>'id')::uuid;
    if input_n is null or input_n not between 1 and 4096 or output_n is null
       or purpose_n is null or purpose_n not in ('ask','same-spirit') or uid is null or request_id is null
       or output_n < 1 or output_n > (case when purpose_n='ask' then 2048 else 4096 end) then
      raise exception 'Invalid reservation';
    end if;
    -- Never reuse a reservation to authorize another call.
    if exists(select 1 from booklog_ai.reservations where id=request_id) then
      return jsonb_build_object('ok',false,'reason','duplicate');
    end if;
    if cfg.baseline_month is distinct from (month_start at time zone 'UTC')::date then
      return jsonb_build_object('ok',false,'reason','baseline_needed');
    end if;
    if cfg.provider_period_start is null or cfg.provider_period_end is null
       or now() < cfg.provider_period_start or now() >= cfg.provider_period_end then
      return jsonb_build_object('ok',false,'reason','provider_baseline_needed');
    end if;
    keys_n := array(select jsonb_array_elements_text(coalesce(p_args->'cache_keys','[]'::jsonb)));
    if purpose_n='same-spirit' then
      if cardinality(keys_n) not between 1 and 2 then raise exception 'Invalid seeds'; end if;
      if exists(select 1 from unnest(keys_n) seed_key where not exists(
        select 1 from booklog_ai.cache cache_row where cache_row.key=seed_key and cache_row.claim=request_id and cache_row.claimed_until>now())) then
        raise exception 'Unclaimed seed';
      end if;
    elsif cardinality(keys_n)<>0 then raise exception 'Unexpected seeds'; end if;
    reserve_n := input_n::bigint + output_n::bigint * 5;
    select coalesce(sum(charged_micro),0) into month_used from booklog_ai.reservations where created_at >= month_start;
    select coalesce(sum(charged_micro),0), count(*) into day_used,calls_n from booklog_ai.reservations where created_at >= day_start;
    select coalesce(sum(charged_micro),0) into period_used from booklog_ai.reservations
      where created_at >= cfg.provider_period_start and created_at < cfg.provider_period_end;
    if period_used + cfg.provider_baseline_micro + reserve_n > cfg.monthly_micro
       or month_used + cfg.baseline_micro + reserve_n > cfg.monthly_micro
       or day_used + (case when cfg.baseline_day=(day_start at time zone 'UTC')::date then cfg.daily_baseline_micro else 0 end) + reserve_n > cfg.daily_micro or calls_n >= cfg.daily_calls then
      return jsonb_build_object('ok',false,'reason','budget');
    end if;
    insert into booklog_ai.reservations(id,user_id,purpose,reserved_micro,charged_micro,input_tokens,output_limit,cache_keys)
    values(request_id,uid,purpose_n,reserve_n,reserve_n,input_n,output_n,keys_n);
    return jsonb_build_object('ok',true,'id',request_id,'reserved_micro',reserve_n);
  elsif p_op = 'settle' then
    select * into r from booklog_ai.reservations where id=(p_args->>'id')::uuid;
    if not found then return jsonb_build_object('ok',false,'reason','missing'); end if;
    if r.settled then return jsonb_build_object('ok',true,'duplicate',true); end if;
    input_n := (p_args->>'input_tokens')::integer;
    output_n := (p_args->>'output_tokens')::integer;
    if input_n is null or output_n is null or input_n < 0 or output_n < 0 then raise exception 'Invalid usage'; end if;
    actual_n := input_n::bigint + output_n::bigint*5;
    if actual_n > r.reserved_micro then
      -- Keep overspend visible and stop future calls, never mask it.
      update booklog_ai.reservations set charged_micro=actual_n, settled=true where id=r.id;
      update booklog_ai.config set enabled=false where singleton=true;
      return jsonb_build_object('ok',false,'reason','reservation_exceeded');
    end if;
    update booklog_ai.reservations set charged_micro=actual_n,settled=true where id=r.id;
    return jsonb_build_object('ok',true);
  elsif p_op in ('lookup','claim','publish','fail') then
    k:=p_args->>'key'; request_id:=(p_args->>'claim')::uuid;
    if k is null or length(k) not between 3 and 700 then raise exception 'Invalid cache key'; end if;
    select * into c from booklog_ai.cache where key=k;
    if p_op='lookup' then
      if found and c.payload is not null and c.expires_at>now() then
        return jsonb_build_object('ok',true,'hit',true,'payload',c.payload);
      end if;
      return jsonb_build_object('ok',true,'hit',false);
    elsif p_op='claim' then
      if request_id is null then raise exception 'Missing claim'; end if;
      if c.payload is not null and c.expires_at>now() then return jsonb_build_object('ok',false,'reason','cached'); end if;
      if c.claimed_until>now() or c.cooldown_until>now() then return jsonb_build_object('ok',false,'reason','busy'); end if;
      insert into booklog_ai.cache(key,claim,claimed_until) values(k,request_id,now()+interval '120 seconds')
      on conflict(key) do update set claim=excluded.claim,claimed_until=excluded.claimed_until;
      return jsonb_build_object('ok',true);
    elsif p_op='publish' then
      if request_id is null or c.claim is null or c.claimed_until is null or c.claim is distinct from request_id or c.claimed_until<=now() then return jsonb_build_object('ok',false,'reason','claim'); end if;
      select * into r from booklog_ai.reservations where id=request_id and purpose='same-spirit' and k=any(cache_keys);
      if not found then return jsonb_build_object('ok',false,'reason','reservation'); end if;
      payload_n:=p_args->'payload';
      if jsonb_typeof(payload_n) is distinct from 'array' or jsonb_array_length(payload_n)>12
         or octet_length(payload_n::text)>30000 then raise exception 'Invalid payload'; end if;
      if exists(select 1 from jsonb_array_elements(payload_n) item where
        jsonb_typeof(item) is distinct from 'object' or
        jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 300 or
        jsonb_typeof(item->'title') is distinct from 'string' or length(item->>'title') not between 1 and 250 or
        jsonb_typeof(item->'author') is distinct from 'string' or length(item->>'author') not between 1 and 250 or
        jsonb_typeof(item->'cover') is distinct from 'string' or length(item->>'cover') not between 1 and 2000 or
        (item->>'cover') not like 'https://%') then raise exception 'Invalid candidate'; end if;
      update booklog_ai.cache set payload=payload_n,expires_at=now()+interval '7 days',claim=null,claimed_until=null,cooldown_until=null where key=k;
      return jsonb_build_object('ok',true);
    else
      if request_id is null or c.claim is null or c.claim is distinct from request_id then return jsonb_build_object('ok',false,'reason','claim'); end if;
      update booklog_ai.cache set claim=null,claimed_until=null,cooldown_until=now()+interval '1 hour' where key=k;
      -- Budget is not refunded here: call cost may be unknown.
      return jsonb_build_object('ok',true);
    end if;
  end if;
  raise exception 'Unknown AI operation';
end $$;
revoke all on function public.booklog_ai_op(text,text,jsonb) from public, authenticated;
grant execute on function public.booklog_ai_op(text,text,jsonb) to anon;
commit;
