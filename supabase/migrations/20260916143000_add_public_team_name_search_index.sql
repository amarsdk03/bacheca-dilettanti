create extension if not exists pg_trgm with schema extensions;

create index if not exists profilo_squadra_nome_societa_trgm_idx
    on public.profilo_squadra
    using gin (nome_societa extensions.gin_trgm_ops)
    where nascosto = false and nome_societa is not null;
