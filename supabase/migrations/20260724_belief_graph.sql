-- Belief Graph feature for the Recursion module.

create table if not exists belief_nodes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users not null,
  course_id text not null,
  concept_id text not null,
  concept_label text not null,
  belief_statement text,
  correctness text check (correctness in ('correct','partially_correct','misconception','unknown')) default 'unknown',
  confidence float default 0.0,
  last_updated timestamptz default now(),
  unique (student_id, course_id, concept_id)
);

create table if not exists belief_edges (
  id uuid primary key default gen_random_uuid(),
  course_id text not null,
  from_concept text not null,
  to_concept text not null,
  relationship text check (relationship in ('depends_on','commonly_confused_with','prerequisite_of'))
);

create table if not exists belief_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users not null,
  concept_id text not null,
  belief_statement text,
  correctness text,
  confidence float,
  triggering_answer text,
  created_at timestamptz default now()
);

create index if not exists idx_belief_nodes_student_course
  on belief_nodes(student_id, course_id);

create index if not exists idx_belief_edges_course_from
  on belief_edges(course_id, from_concept);

create index if not exists idx_belief_edges_course_to
  on belief_edges(course_id, to_concept);

create index if not exists idx_belief_history_student_concept
  on belief_history(student_id, concept_id, created_at desc);

alter table belief_nodes enable row level security;
alter table belief_edges enable row level security;
alter table belief_history enable row level security;

drop policy if exists "students see own belief nodes" on belief_nodes;
create policy "students see own belief nodes" on belief_nodes
  for select using (auth.uid() = student_id);

drop policy if exists "anyone can read belief edges" on belief_edges;
create policy "anyone can read belief edges" on belief_edges
  for select using (true);

drop policy if exists "students see own belief history" on belief_history;
create policy "students see own belief history" on belief_history
  for select using (auth.uid() = student_id);

insert into belief_edges (course_id, from_concept, to_concept, relationship)
values
  ('recursion', 'recursion.base_case', 'recursion.recursive_call', 'depends_on'),
  ('recursion', 'recursion.stack_overflow', 'recursion.call_stack', 'depends_on'),
  ('recursion', 'recursion.mutual_recursion', 'recursion.recursive_call', 'commonly_confused_with'),
  ('recursion', 'recursion.tail_recursion', 'recursion.call_stack', 'depends_on')
on conflict do nothing;
