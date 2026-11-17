
do $$ declare a uuid; b uuid; x uuid; y uuid; z uuid; doc uuid; signer uuid; begin
 if exists(select 1 from deals where code='DEMO-01') then return; end if;
 insert into deals(code,title,owner,closing_on,jurisdiction,purpose,access_review_on,retention_review_on)
 values('DEMO-01','Kauri Components acquisition','Mia Chen',current_date+3,'NZ','Corporate acquisition evidence',current_date-4,current_date+365) returning id into a;
 insert into deals(code,title,owner,closing_on,jurisdiction,purpose,access_review_on,retention_review_on)
 values('DEMO-02','Banksia financing','Noah Patel',current_date-7,'AU','Facility closing evidence',current_date+30,current_date-2) returning id into b;
 insert into items(deal_id,code,title,owner,due_on,kind) values(a,'CP-01','Board authority','Mia Chen',current_date-2,'condition') returning id into x;
 insert into items(deal_id,code,title,owner,due_on,kind,revision,completed_revision,completed_by,completion_evidence)
 values(a,'DOC-01','Share purchase agreement','Ava Wilson',current_date+1,'document',2,1,'Mia Chen','Fictional review minute 1') returning id into y;
 insert into documents(item_id,revision,reference,sha256,actor) values(y,1,'demo/spa-v1.pdf',repeat('a',64),'Demo lawyer') returning id into doc;
 insert into signers(item_id,name) values(y,'Purchaser director') returning id into signer;
 insert into signatures(signer_id,document_id,evidence,signed_on,actor) values(signer,doc,'Fictional signed page v1',current_date-5,'Demo lawyer');
 insert into documents(item_id,revision,reference,sha256,actor) values(y,2,'demo/spa-v2.pdf',repeat('b',64),'Demo lawyer');
 insert into signers(item_id,name) values(y,'Seller director');
 insert into dependencies(item_id,requires_id) values(y,x);
 insert into items(deal_id,code,title,owner,due_on,kind) values(a,'PC-01','Update statutory register','',current_date+10,'postclosing');
 insert into items(deal_id,code,title,owner,due_on,kind,status,completed_revision,completed_by,completion_evidence)
 values(b,'CP-01','Facility conditions confirmed','Noah Patel',current_date-8,'condition','complete',1,'Noah Patel','Fictional lender confirmation');
 insert into items(deal_id,code,title,owner,due_on,kind) values(b,'PC-01','File executed security notice','Zoe Harris',current_date-1,'postclosing');
 insert into activity(deal_id,action,actor,note) values(a,'demo','Demo operator','Fictional data only'),(b,'demo','Demo operator','Fictional data only');
 end $$;
