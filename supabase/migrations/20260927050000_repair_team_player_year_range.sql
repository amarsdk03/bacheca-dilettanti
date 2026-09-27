-- Repair a database where later publication migrations were applied but step 06
-- was skipped. Keep the current publish_announcement_v2 wrapper untouched.
begin;

do $migration$
declare
  v_wrapper regprocedure;
begin
  v_wrapper := pg_catalog.to_regprocedure(
    'public.publish_announcement_v2(uuid,jsonb,text,text,text)'
  );
  if v_wrapper is null or pg_catalog.strpos(
    pg_catalog.pg_get_functiondef(v_wrapper),
    'private.save_team_player_year_range_step06_v1'
  ) = 0 then
    raise exception 'Current publication wrapper does not call the step 06 year-range helper';
  end if;
end;
$migration$;

alter table public.annuncio_squadra_cerca_giocatore
  add column if not exists annata_da smallint,
  add column if not exists annata_a smallint;

do $migration$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.annuncio_squadra_cerca_giocatore'::regclass
      and conname = 'annuncio_squadra_cerca_giocatore_annate_intervallo_check'
  ) then
    alter table public.annuncio_squadra_cerca_giocatore
      add constraint annuncio_squadra_cerca_giocatore_annate_intervallo_check
      check (
        (annata_da is null and annata_a is null)
        or (annata_da is not null and annata_a is not null
          and annata_da between 1900 and 9999 and annata_a between annata_da and 9999)
      );
  end if;
end;
$migration$;

-- Match the original step 06 writer and its service-role-only grant.
create or replace function private.save_team_player_year_range_step06_v1(
  p_submission_id uuid,
  p_detail jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_from text;
  v_to text;
begin
  if p_detail is null or pg_catalog.jsonb_typeof(p_detail) <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_TEAM_PLAYER_YEARS';
  end if;

  -- Older clients leave the historical array to the core writer.
  if not (p_detail ? 'annata_da' or p_detail ? 'annata_a') then
    return;
  end if;

  if not (p_detail ? 'annata_da' and p_detail ? 'annata_a')
    or pg_catalog.jsonb_typeof(p_detail -> 'annata_da') not in ('string', 'null')
    or pg_catalog.jsonb_typeof(p_detail -> 'annata_a') not in ('string', 'null')
    or coalesce(p_detail -> 'annate_ricercate', '[]'::jsonb) <> '[]'::jsonb then
    raise exception using errcode = '22023', message = 'INVALID_TEAM_PLAYER_YEARS';
  end if;

  v_from := nullif(pg_catalog.btrim(p_detail ->> 'annata_da'), '');
  v_to := nullif(pg_catalog.btrim(p_detail ->> 'annata_a'), '');
  if (v_from is null) <> (v_to is null)
    or (v_from is not null and (
      v_from !~ '^[0-9]{4}$'
      or v_to !~ '^[0-9]{4}$'
      or v_from::integer < 1900
      or v_to::integer > extract(year from current_date)
      or v_from::integer > v_to::integer
    )) then
    raise exception using errcode = '22023', message = 'INVALID_TEAM_PLAYER_YEARS';
  end if;

  update public.annuncio_squadra_cerca_giocatore as detail
  set annata_da = v_from::smallint,
      annata_a = v_to::smallint
  from private.announcement_submission as submission
  where submission.submission_id = p_submission_id
    and detail.uuid_annuncio = submission.announcement_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'ANNOUNCEMENT_NOT_FOUND';
  end if;
end;
$$;

revoke all on function private.save_team_player_year_range_step06_v1(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function private.save_team_player_year_range_step06_v1(uuid, jsonb)
  to service_role;

notify pgrst, 'reload schema';

commit;
