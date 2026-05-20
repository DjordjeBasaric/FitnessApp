-- =============================================================================
-- 0004_score_functions.sql — RPC za izračun dnevnog skora i strika.
--
-- Bodovanje:
--   Kalorijska preciznost (max 10):
--     |consumed - budget| <= 100  → 10
--     <= 200                       → 5
--     <= 300                       → 2
--     inače                        → 0
--   Strik:
--     "kvalifikovan dan" = bar 3 različita obroka.
--     current_streak se kompjutera unazad rolling.
--   Zdravi poeni:
--     protein_goal_hit (consumed ≥ 95% target_protein_g)  → 5
--     fiber ≥ 25g                                          → 3
--     trained (cardio ili strength)                        → 5
--     meals_logged_count >= 4                              → 3
-- =============================================================================

create or replace function public.recompute_daily_score(
  p_user_id uuid,
  p_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log public.daily_logs%rowtype;
  v_consumed_kcal numeric := 0;
  v_protein_g numeric := 0;
  v_fiber_g numeric := 0;
  v_meal_slots int := 0;
  v_qualifies boolean := false;
  v_trained boolean := false;

  v_goal public.weight_goals%rowtype;
  v_active_plan public.goal_plans%rowtype;
  v_budget int;
  v_protein_target numeric;
  v_calorie_precision int := 0;
  v_protein_hit boolean := false;
  v_healthy int := 0;

  v_streak int := 0;
  v_check_date date;
  v_check_qualifies boolean;
begin
  select * into v_log
  from public.daily_logs
  where user_id = p_user_id and date = p_date;

  if found then
    select coalesce(sum((item->>'kcal')::numeric), 0),
           coalesce(sum((item->>'proteinG')::numeric), 0),
           coalesce(sum((item->>'fiberG')::numeric), 0)
      into v_consumed_kcal, v_protein_g, v_fiber_g
      from jsonb_array_elements(coalesce(v_log.food_items, '[]'::jsonb)) item;

    select count(distinct (item->>'mealSlot'))
      into v_meal_slots
      from jsonb_array_elements(coalesce(v_log.food_items, '[]'::jsonb)) item
      where item ? 'mealSlot' and (item->>'mealSlot') is not null;

    v_trained := jsonb_array_length(coalesce(v_log.cardio_sessions, '[]'::jsonb)) > 0
              or jsonb_array_length(coalesce(v_log.strength_blocks, '[]'::jsonb)) > 0;
  else
    v_consumed_kcal := 0;
    v_protein_g := 0;
    v_fiber_g := 0;
    v_meal_slots := 0;
    v_trained := false;
  end if;

  v_qualifies := v_meal_slots >= 3;

  -- Budget kcal — prvo iz aktivnog plana, ako nema → iz weight_goals.
  select * into v_active_plan
    from public.goal_plans
   where user_id = p_user_id and is_active = true
   limit 1;
  if found and v_active_plan.target_daily_kcal is not null then
    v_budget := v_active_plan.target_daily_kcal;
    v_protein_target := v_active_plan.target_protein_g;
  else
    select * into v_goal from public.weight_goals where user_id = p_user_id;
    if found and v_goal.start_date <= p_date and p_date <= v_goal.end_date then
      -- Pojednostavljena maintenance procjena: 30 kcal/kg + linearni gubitak.
      -- Aplikacija ima precizniji izračun klijent-side; ovde koristimo
      -- start_kg kao bazu (dovoljno za snapshot bodovanja).
      v_budget := round(v_goal.start_kg * 30);
      -- protein_target ostaje null
    end if;
  end if;

  -- Kalorijska preciznost
  if v_budget is not null then
    v_calorie_precision := case
      when abs(v_consumed_kcal - v_budget) <= 100 then 10
      when abs(v_consumed_kcal - v_budget) <= 200 then 5
      when abs(v_consumed_kcal - v_budget) <= 300 then 2
      else 0
    end;
  end if;

  -- Protein cilj
  if v_protein_target is not null and v_protein_target > 0 then
    v_protein_hit := v_protein_g >= v_protein_target * 0.95;
  end if;

  -- Healthy points
  v_healthy := 0;
  if v_protein_hit then v_healthy := v_healthy + 5; end if;
  if v_fiber_g >= 25 then v_healthy := v_healthy + 3; end if;
  if v_trained then v_healthy := v_healthy + 5; end if;
  if v_meal_slots >= 4 then v_healthy := v_healthy + 3; end if;

  -- Upsert skor za p_date
  insert into public.daily_scores (
    user_id, date, budget_kcal, consumed_kcal, calorie_precision_points,
    meals_logged_count, streak_qualifies, current_streak,
    protein_goal_g, protein_consumed_g, protein_goal_hit, fiber_consumed_g,
    trained, healthy_points, total_points, computed_at
  ) values (
    p_user_id, p_date, v_budget, round(v_consumed_kcal)::int, v_calorie_precision,
    v_meal_slots, v_qualifies, 0,
    v_protein_target, v_protein_g, v_protein_hit, v_fiber_g,
    v_trained, v_healthy, v_calorie_precision + v_healthy, now()
  )
  on conflict (user_id, date) do update set
    budget_kcal = excluded.budget_kcal,
    consumed_kcal = excluded.consumed_kcal,
    calorie_precision_points = excluded.calorie_precision_points,
    meals_logged_count = excluded.meals_logged_count,
    streak_qualifies = excluded.streak_qualifies,
    protein_goal_g = excluded.protein_goal_g,
    protein_consumed_g = excluded.protein_consumed_g,
    protein_goal_hit = excluded.protein_goal_hit,
    fiber_consumed_g = excluded.fiber_consumed_g,
    trained = excluded.trained,
    healthy_points = excluded.healthy_points,
    total_points = excluded.total_points,
    computed_at = now();

  -- Rolling strik: za sve datume od p_date do današnjeg datuma,
  -- prebrojaj uzastopne kvalifikovane dane unazad.
  v_check_date := least(current_date, p_date);
  while v_check_date <= current_date loop
    select streak_qualifies into v_check_qualifies
      from public.daily_scores
     where user_id = p_user_id and date = v_check_date;

    if not found or v_check_qualifies is null or v_check_qualifies = false then
      v_streak := 0;
    else
      v_streak := v_streak + 1;
    end if;

    update public.daily_scores
       set current_streak = v_streak
     where user_id = p_user_id and date = v_check_date;

    v_check_date := v_check_date + 1;
  end loop;
end;
$$;
