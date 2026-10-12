begin;
insert into parts(id,number,name,owner) values
 ('10000000-0000-4000-8000-000000000001','PUMP-100','Washdown pump skid','Moana'),
 ('10000000-0000-4000-8000-000000000002','SEAL-10','Pump seal kit','Aroha'),
 ('10000000-0000-4000-8000-000000000003','GUARD-20','Coupling guard','Moana'),
 ('10000000-0000-4000-8000-000000000004','SKID-200','Compact pump skid','Tom') on conflict do nothing;
insert into revisions(id,part_id,code,status,purpose,test_evidence,use_instructions,released_at,updated_at) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','B','draft','Washdown pumping',null,null,null,now()-interval '45 days'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','A','released','Seal washdown pump','demo://seal-test','Isolate pressure before service',now()-interval '60 days',now()),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','A','obsolete','Cover rotating coupling','demo://old-guard-test','Isolate drive before removal',now()-interval '90 days',now()),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004','A','draft','Compact washdown','demo://compact-test','Isolate supply',null,now()) on conflict do nothing;
insert into bom_lines(id,parent_id,child_id,quantity) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002',2),
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003',1),
 ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000002',1) on conflict do nothing;
insert into changes(id,name,revision_id,reason,author,due) values
 ('40000000-0000-4000-8000-000000000001','Washdown guard review','20000000-0000-4000-8000-000000000001','Guard clearance changed','Moana',current_date-9),
 ('40000000-0000-4000-8000-000000000002','Compact skid release','20000000-0000-4000-8000-000000000004','First controlled release','Tom',current_date+3) on conflict do nothing;
commit;
