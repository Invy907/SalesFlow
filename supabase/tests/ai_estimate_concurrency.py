"""Two real transactions approve one synthetic source; QA container only, always cleaned up."""
import concurrent.futures
import subprocess
import time

CONTAINER = "supabase_db_salesflow-misoca-qa"
ACTOR = "00000000-0000-4000-8000-000000003581"
SOURCE = "00000000-0000-4000-8000-000000003582"


def sql(statement):
    result = subprocess.run(
        ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1"],
        input=statement, text=True, capture_output=True, check=True,
    )
    return result.stdout


def approve(pause):
    return sql(f"""
      begin;
      set local role authenticated;
      select set_config('request.jwt.claim.sub','{ACTOR}',true);
      select public.ai_estimate_approve_source('{SOURCE}',
        (select extracted_data from public.ai_estimate_extractions where source_id='{SOURCE}'),
        (select updated_at from public.ai_estimate_sources where id='{SOURCE}'));
      select pg_sleep({pause});
      commit;
    """)


try:
    sql(f"""
      begin;
      insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data)
        values('{ACTOR}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ai-concurrency@example.invalid','{{}}');
      insert into public.ai_estimate_sources(id,organization_id,source_type,title,storage_path,mime_type,uploaded_by)
        select '{SOURCE}',organization_id,'upload','Concurrency synthetic',organization_id::text||'/{SOURCE}/original.pdf','application/pdf','{ACTOR}'
        from public.organization_members where user_id='{ACTOR}';
      select public.ai_estimate_prepare_manual_review('{SOURCE}',
        '{{"currency":"JPY","taxMode":"excluded","clientName":"Test","subject":"Concurrent","confidence":1,"lines":[{{"name":"Work","qty":1,"unit":"hour","unitPrice":100,"taxCategory":"standard_10","confidence":1,"reason":""}}]}}');
      commit;
    """)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(approve, 2)
        time.sleep(0.2)
        second = pool.submit(approve, 0)
        first.result(timeout=20)
        second.result(timeout=20)
    sql(f"""
      do $$ begin
        assert (select count(*) from public.ai_estimate_examples where source_id='{SOURCE}')=1;
        assert (select count(*) from public.ai_estimate_example_lines where example_id=(select id from public.ai_estimate_examples where source_id='{SOURCE}'))=1;
        assert (select count(*) from public.ai_estimate_chunks where example_id=(select id from public.ai_estimate_examples where source_id='{SOURCE}'))=1;
      end $$;
    """)
    print("Concurrent approval regression passed: one example, line, and chunk.")
finally:
    sql(f"""
      delete from public.organizations where id in (select organization_id from public.organization_members where user_id='{ACTOR}' and role='owner');
      delete from auth.users where id='{ACTOR}';
    """)
