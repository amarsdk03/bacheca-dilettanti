-- M07C post-installation ONLY. This reads only the single operational gate table.
-- Run the ENTIRE file as postgres after structural verification. No activation.
begin read only;
set local statement_timeout='5s';
set local lock_timeout='3s';
set local search_path=pg_catalog;
select jsonb_build_object('step','M07_GATE','report_version',1,'captured_at',statement_timestamp(),
  'operator',current_user,'transaction_read_only',current_setting('transaction_read_only'),
  'expected_project_ref','nsytraextbndfyprwzts',
  'gate_rows_read',true,'application_functions_called',false,
  'row_count',count(*),'gate_disabled',current_user='postgres' and count(*)=1 and coalesce(bool_and(singleton is true and enabled is false),false),
  'release_authorized',false) as m07_gate_report
from private.admin_trash_release_v1;
rollback;
