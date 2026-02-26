-- ================================================================
-- TRIGGER: Auto-criar profile quando utilizador se regista
-- Corre este SQL no Supabase SQL Editor
-- ================================================================

-- Função que cria o profile automaticamente
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username', ''),
    new.email,
    'user'
  )
  on conflict (id) do nothing; -- evita erro se o profile já existir
  return new;
end;
$$;

-- Trigger que dispara após inserção em auth.users
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ================================================================
-- TAMBÉM ÚTIL: Sincronizar email se o utilizador o alterar
-- ================================================================
create or replace function public.handle_user_email_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set email = new.email, updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_update();
