-- Run only on the reviewed isolated target after deploying BOTH compatible apps,
-- verifying readers/writers, private Storage and draining/purging old caches and
-- signed URLs. Not part of automatic migrations. Never run during development.
begin;
do $$
declare reviewed_compatible_deploys boolean:=false;
  reviewed_cache_and_storage boolean:=false;
  reviewed_integration_checks boolean:=false;
begin
  if not(reviewed_compatible_deploys and reviewed_cache_and_storage and reviewed_integration_checks) then
    raise exception 'ADMIN_TRASH_RELEASE_REVIEW_REQUIRED';
  end if;
  if current_user<>'postgres' then raise exception 'ADMIN_TRASH_RELEASE_OPERATOR_REQUIRED'; end if;
  update private.admin_trash_release_v1 set enabled=true where singleton;
  if not found then raise exception 'ADMIN_TRASH_MIGRATION_REQUIRED'; end if;
end $$;
commit;
-- Verify: select enabled from private.admin_trash_release_v1;
-- Disable NEW trash/restore commands only (retain every data protection):
-- update private.admin_trash_release_v1 set enabled=false where singleton;
