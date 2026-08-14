-- Minimal SQL assertion framework (no pgTAP dependency).
-- Usage: select assert.ok(cond, 'name'); assert.throws('sql', 'name');
--        assert.succeeds('sql', 'name'); select assert.finish();

create schema if not exists assert;

create table if not exists assert.results (
  name   text,
  ok     boolean,
  detail text
);

grant usage on schema assert to anon, authenticated;
grant insert, select on assert.results to anon, authenticated;

create or replace function assert.ok(cond boolean, name text)
returns void
language plpgsql
as $$
begin
  insert into assert.results values (name, coalesce(cond, false), null);
end;
$$;

-- The statement MUST raise (RLS denial, constraint, guard trigger…).
create or replace function assert.throws(query text, name text)
returns void
language plpgsql
as $$
begin
  execute query;
  insert into assert.results values (name, false, 'expected an error but none was raised');
exception
  when others then
    insert into assert.results values (name, true, sqlerrm);
end;
$$;

-- The statement MUST succeed.
create or replace function assert.succeeds(query text, name text)
returns void
language plpgsql
as $$
begin
  execute query;
  insert into assert.results values (name, true, null);
exception
  when others then
    insert into assert.results values (name, false, sqlerrm);
end;
$$;

-- Fails the run (nonzero exit via exception) if anything is red.
create or replace function assert.finish()
returns integer
language plpgsql
as $$
declare
  total  integer;
  failed integer;
  report text;
begin
  select count(*), count(*) filter (where not ok) into total, failed from assert.results;
  report := format('DB tests: %s passed, %s failed', total - failed, failed);
  raise notice '%', report;
  if failed > 0 then
    for report in select format('  ✖ %s — %s', name, coalesce(detail, '')) from assert.results where not ok loop
      raise notice '%', report;
    end loop;
    raise exception 'DB test suite FAILED';
  end if;
  return total;
end;
$$;

grant execute on all functions in schema assert to anon, authenticated;
