create table parts (
 id uuid primary key default gen_random_uuid(), number text not null unique check (btrim(number)<>''),
 name text not null check(btrim(name)<>''), owner text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index parts_number_ci on parts(lower(number));
create table revisions (
 id uuid primary key default gen_random_uuid(), part_id uuid not null references parts(id), code text not null check(btrim(code)<>''),
 status text not null default 'draft' check(status in ('draft','released','obsolete')),
 purpose text, test_evidence text, use_instructions text, released_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(part_id,code)
);
create table bom_lines (
 id uuid primary key default gen_random_uuid(), parent_id uuid not null references revisions(id), child_id uuid not null references revisions(id),
 quantity numeric(14,4) not null check(quantity>0), unit text not null default 'each' check(btrim(unit)<>''),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(parent_id,child_id), check(parent_id<>child_id)
);
create table changes (
 id uuid primary key default gen_random_uuid(), name text not null, revision_id uuid not null unique references revisions(id),
 reason text not null check(btrim(reason)<>''), author text not null, due date not null,
 status text not null default 'open' check(status in ('open','approved','released')),
 reviewer text, approved_at timestamptz, release_note text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status='open' or (reviewer is not null and lower(btrim(reviewer))<>lower(btrim(author)) and approved_at is not null))
);
create table activity (
 id uuid primary key default gen_random_uuid(), actor text not null, action text not null, record_id uuid, detail jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['parts','revisions','bom_lines','changes','activity'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
end loop; end $$;
create function bom_guard() returns trigger language plpgsql as $$ begin
 if exists (with recursive descendants(id) as (select new.child_id union select b.child_id from bom_lines b join descendants d on b.parent_id=d.id) select 1 from descendants where id=new.parent_id) then raise exception 'BOM cycle refused'; end if;
 return new;
end $$;
create trigger no_bom_cycles before insert or update on bom_lines for each row execute function bom_guard();
create view revision_register as select r.id,p.number,p.name,r.code,r.status,p.owner,r.purpose,r.test_evidence,r.use_instructions,r.released_at,r.updated_at from revisions r join parts p on p.id=r.part_id;
create view change_board as select c.id,c.name,p.number,r.code,c.author,c.due,c.status,c.reviewer,current_date-c.due as days_past_due from changes c join revisions r on r.id=c.revision_id join parts p on p.id=r.part_id;
create view release_gaps as
 select r.id,p.number,r.code,'Purpose missing' as gap from revisions r join parts p on p.id=r.part_id where nullif(btrim(r.purpose),'') is null
 union all select r.id,p.number,r.code,'Test evidence missing' from revisions r join parts p on p.id=r.part_id where nullif(btrim(r.test_evidence),'') is null
 union all select r.id,p.number,r.code,'Safe-use information missing' from revisions r join parts p on p.id=r.part_id where nullif(btrim(r.use_instructions),'') is null
 union all select r.id,p.number,r.code,'Component not released: '||cp.number||' / '||cr.code from revisions r join parts p on p.id=r.part_id join bom_lines b on b.parent_id=r.id join revisions cr on cr.id=b.child_id join parts cp on cp.id=cr.part_id where cr.status<>'released';
create view component_usage as select p.number as assembly,r.code as assembly_revision,r.status as assembly_status,cp.number as component,cr.code as component_revision,cr.status as component_status,b.quantity,b.unit from bom_lines b join revisions r on r.id=b.parent_id join parts p on p.id=r.part_id join revisions cr on cr.id=b.child_id join parts cp on cp.id=cr.part_id;
create view attention as select name as item,'Overdue engineering change' as reason,author as owner from change_board where status<>'released' and due<current_date
 union all select g.number||' / '||g.code,g.gap,p.owner from release_gaps g join parts p on p.number=g.number;
revoke all on revision_register,change_board,release_gaps,component_usage,attention from public;
