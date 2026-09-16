-- The server-only profile RPC executes as service_role. Its player-category
-- helper invokes this validator, so service_role needs this one private grant.
grant execute on function private.publish_text_array_is_valid(jsonb, boolean, integer, integer)
  to service_role;
