-- Keep profile fields, locations, highlights and social links in one
-- PostgREST request and therefore in one PostgreSQL transaction.
begin;

create or replace function public.save_owned_subprofile_with_social_links_v1(
  p_user_id uuid,
  p_profile_type text,
  p_draft jsonb,
  p_locations jsonb,
  p_social_links jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  v_result := public.save_owned_subprofile(
    p_user_id,
    p_profile_type,
    p_draft,
    p_locations
  );

  perform public.save_owned_profile_social_links_v1(
    p_user_id,
    p_profile_type,
    p_social_links
  );

  return v_result;
end;
$$;

revoke all on function public.save_owned_subprofile_with_social_links_v1(uuid, text, jsonb, jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.save_owned_subprofile_with_social_links_v1(uuid, text, jsonb, jsonb, jsonb)
  to service_role;

notify pgrst, 'reload schema';

commit;
