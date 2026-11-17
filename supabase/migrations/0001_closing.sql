
create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table deals (
 id uuid primary key default gen_random_uuid(), code text not null unique, title text not null,
 owner text not null, closing_on date not null, status text not null default 'open' check(status in ('open','closed')),
 jurisdiction text not null check(jurisdiction in ('NZ','AU','other')), purpose text not null default '',
 access_review_on date, retention_review_on date, closed_by text, closed_evidence text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table items (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references deals(id),
 code text not null, title text not null, kind text not null default 'condition' check(kind in ('condition','document','postclosing')),
 owner text not null default '', due_on date, status text not null default 'open' check(status in ('open','complete')),
 revision integer not null default 1 check(revision>0), completed_revision integer, completed_by text, completion_evidence text,
 source_key text unique, source_data jsonb, source_hash text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(deal_id,code),
 check(status <> 'complete' or (completed_revision=revision and length(trim(completed_by))>0 and length(trim(completion_evidence))>0))
);
create table documents (
 id uuid primary key default gen_random_uuid(), item_id uuid not null references items(id), revision integer not null,
 reference text not null, sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'), actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(item_id,revision)
);
create table signers (
 id uuid primary key default gen_random_uuid(), item_id uuid not null references items(id), name text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(item_id,name)
);
create table signatures (
 id uuid primary key default gen_random_uuid(), signer_id uuid not null references signers(id), document_id uuid not null references documents(id),
 evidence text not null, signed_on date not null, actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(signer_id,document_id)
);
create table dependencies (
 id uuid primary key default gen_random_uuid(), item_id uuid not null references items(id), requires_id uuid not null references items(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(item_id,requires_id), check(item_id<>requires_id)
);
create table activity (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references deals(id), item_id uuid references items(id),
 action text not null, actor text not null, note text not null, details jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
do $$ declare t text; begin foreach t in array array['deals','items','documents','signers','signatures','dependencies','activity'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 end loop; end $$;
create view signature_status as
 select d.code deal,i.id item_id,i.code,i.title,s.id signer_id,s.name signer,i.revision,
 doc.id document_id,doc.reference document_reference,
 case when doc.id is null then 'no_current_document' when sig.id is null then 'missing' else 'recorded' end signature_status,
 sig.signed_on,sig.evidence,i.owner,i.due_on
 from signers s join items i on i.id=s.item_id join deals d on d.id=i.deal_id
 left join documents doc on doc.item_id=i.id and doc.revision=i.revision
 left join signatures sig on sig.signer_id=s.id and sig.document_id=doc.id;
create view item_readiness as
 select i.*,d.code deal,d.status deal_status,
 (select count(*)::int from signature_status s where s.item_id=i.id and s.signature_status<>'recorded') missing_signatures,
 (select count(*)::int from dependencies dep join items req on req.id=dep.requires_id where dep.item_id=i.id and req.status<>'complete') incomplete_dependencies,
 (i.kind='document' and not exists(select 1 from documents doc where doc.item_id=i.id and doc.revision=i.revision)) missing_document
 from items i join deals d on d.id=i.deal_id;
create view closing_readiness as
 select d.id,d.code,d.title,d.owner,d.closing_on,d.status,
 count(i.id) filter(where i.kind<>'postclosing')::int closing_items,
 count(i.id) filter(where i.kind<>'postclosing' and (i.status<>'complete' or i.missing_signatures>0 or i.incomplete_dependencies>0 or i.missing_document))::int blockers,
 count(i.id) filter(where i.kind='postclosing' and i.status<>'complete')::int postclosing_open
 from deals d left join item_readiness i on i.deal_id=d.id group by d.id;
create view attention as
 select deal,code,title,owner,due_on,'overdue' finding from item_readiness where status='open' and due_on<current_date
 union all select deal,code,title,owner,due_on,'no_owner' from item_readiness where status='open' and trim(owner)=''
 union all select deal,code,title,owner,due_on,'dependency_blocked' from item_readiness where status='open' and incomplete_dependencies>0
 union all select deal,code,title,owner,due_on,'signature_missing' from item_readiness where missing_signatures>0
 union all select deal,code,title,owner,due_on,'document_missing' from item_readiness where missing_document
 union all select deal,code,title,owner,due_on,'stale_completion' from item_readiness where status='open' and completed_revision is not null and completed_revision<>revision;
create view compliance_findings as
 select code deal,'NZ-IPP1 / AU-APP3' rule,'Record a purpose for personal information' finding from deals where trim(purpose)=''
 union all select code,'NZ-IPP5 / AU-APP11','Review access controls; date missing or overdue' from deals where access_review_on is null or access_review_on<current_date
 union all select code,'NZ-IPP9 / AU-APP11','Review retention; do not delete automatically' from deals where retention_review_on is null or retention_review_on<current_date
 union all select deal,'FIRM-EVIDENCE','Completion is stale: '||code from item_readiness where completed_revision is not null and completed_revision<>revision
 union all select deal,'FIRM-SIGNATURE','Missing current signature evidence: '||code||' / '||signer from signature_status where signature_status<>'recorded';
