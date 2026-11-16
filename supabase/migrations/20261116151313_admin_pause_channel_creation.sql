begin;
alter function private.admin_distribution_write_v1(text,jsonb) rename to admin_distribution_write_before_channel_pause_v1;
revoke all on function private.admin_distribution_write_before_channel_pause_v1(text,jsonb) from public, anon, authenticated, service_role;
create function private.admin_distribution_write_v1(p_op text,q jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if current_setting('role',true) is distinct from 'authenticated' then
    raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501';
  end if;
  perform private.require_admin_context_v1();
  if p_op='channel_save' and nullif(q->>'id','') is null then
    return jsonb_build_object('status','not_allowed');
  end if;
  return private.admin_distribution_write_before_channel_pause_v1(p_op,q);
end $$;
revoke all on function private.admin_distribution_write_v1(text,jsonb) from public, anon, authenticated, service_role;
grant execute on function private.admin_distribution_write_v1(text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
