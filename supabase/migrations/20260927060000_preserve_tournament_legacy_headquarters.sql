begin;

-- The tournament editor no longer sends sede_principale. Keep existing values
-- when an owned profile is saved, without exposing the legacy field again.
do $migration$
declare
  v_definition text;
  v_old text := 'nome_organizzazione = excluded.nome_organizzazione, tipologie_sport = excluded.tipologie_sport, sede_principale = excluded.sede_principale, presentazione = excluded.presentazione returning id into v_subprofile_id;';
  v_new text := 'nome_organizzazione = excluded.nome_organizzazione, tipologie_sport = excluded.tipologie_sport, sede_principale = public.profilo_torneo_evento.sede_principale, presentazione = excluded.presentazione returning id into v_subprofile_id;';
begin
  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('private.save_owned_subprofile_core_v1(uuid,text,jsonb,jsonb)')
  ) into v_definition;

  if v_definition is null or pg_catalog.strpos(v_definition, v_old) = 0 then
    raise exception 'Tournament legacy-headquarters update point not found';
  end if;

  execute pg_catalog.replace(v_definition, v_old, v_new);
end;
$migration$;

commit;
