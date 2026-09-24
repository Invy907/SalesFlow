"""Run against only the isolated QA container; synthetic fixture is removed in finally."""
import concurrent.futures
import json
import subprocess
import uuid

CONTAINER = "supabase_db_salesflow-misoca-qa"
OWNER = "00000000-0000-4000-8000-000000003611"
MEMBER = "00000000-0000-4000-8000-000000003612"

def sql(statement, check=True):
    result = subprocess.run(
        ["docker", "exec", "-i", CONTAINER, "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"],
        input=statement, text=True, capture_output=True, timeout=30,
    )
    if check and result.returncode:
        raise RuntimeError(result.stderr)
    return result

org = None
fixture_created = False
try:
    # Dedicated test users never touch existing memberships or organization settings.
    result = sql(f"""
      begin;
      insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data) values
      ('{OWNER}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','generation-parallel-owner@example.invalid','{{}}'),
      ('{MEMBER}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','generation-parallel-member@example.invalid','{{}}');
      insert into public.organization_members(organization_id,user_id,role)
      select organization_id,'{MEMBER}','member' from public.organization_members where user_id='{OWNER}';
      insert into public.ai_estimate_settings(organization_id,daily_generation_limit)
      select organization_id,1 from public.organization_members where user_id='{OWNER}'
      on conflict(organization_id) do update set daily_generation_limit=1;
      select organization_id from public.organization_members where user_id='{OWNER}';
      commit;
    """)
    fixture_created = True
    org = result.stdout.strip().splitlines()[-1]
    assert str(uuid.UUID(org)) == org

    def begin_request(user, key):
        # The first transaction keeps its organization advisory lock while the other starts.
        return sql(f"""begin;
          set local request.jwt.claim.sub='{user}';
          set local role authenticated;
          select public.ai_estimate_begin_generation('{org}','{key}','{'a' * 64}');
          select pg_sleep(0.3);
          commit;""", check=False)

    def simultaneous(calls):
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(begin_request, *call) for call in calls]
            return [future.result() for future in futures]

    responses = simultaneous([(OWNER, str(uuid.uuid4())), (MEMBER, str(uuid.uuid4()))])
    assert sum(result.returncode == 0 for result in responses) == 1, "Only one writer may consume the final org quota"
    assert any("AI_DAILY_LIMIT" in result.stderr for result in responses)
    assert sql(f"select count(*) from public.ai_estimate_generation_requests where organization_id='{org}'").stdout.strip() == "1"

    sql(f"delete from public.ai_estimate_generation_requests where organization_id='{org}'; update public.ai_estimate_settings set daily_generation_limit=100 where organization_id='{org}';")
    responses = simultaneous([(OWNER, str(uuid.uuid4())), (OWNER, str(uuid.uuid4()))])
    assert sum(result.returncode == 0 for result in responses) == 1
    assert any("AI_REQUEST_RUNNING" in result.stderr for result in responses), "One user cannot reserve overlapping different requests"

    sql(f"delete from public.ai_estimate_generation_requests where organization_id='{org}';")
    key = str(uuid.uuid4())
    responses = simultaneous([(OWNER, key), (OWNER, key)])
    assert all(result.returncode == 0 for result in responses)
    reservations = [json.loads(result.stdout.strip().splitlines()[0]) for result in responses]
    assert {value["status"] for value in reservations} == {"started", "running"}
    assert reservations[0]["id"] == reservations[1]["id"], "Parallel retries replay one reservation"
    assert sql(f"select count(*) from public.ai_estimate_generation_requests where organization_id='{org}'").stdout.strip() == "1"
    print("3 generation concurrency checks passed: shared quota, per-user exclusion, idempotent replay")
finally:
    # User signup creates personal organizations; delete only these isolated fixtures first.
    if fixture_created:
        sql(f"""begin;
      delete from public.organizations where id in (select organization_id from public.organization_members where user_id in ('{OWNER}','{MEMBER}') and role='owner');
      delete from auth.users where id in ('{OWNER}','{MEMBER}');
      commit;""")
