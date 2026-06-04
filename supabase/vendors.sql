create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade text,
  category text,
  expense_account text,
  phone text,
  email text,
  priority text default 'Standard',
  emergency_available boolean default false,
  notes text,
  created_at timestamp with time zone default now()
);

insert into vendors (name, trade, category, expense_account, priority)
values
('Kevin Ray Thomas', 'Plumbing / Repairs', 'Uncategorized', 'Repairs', 'Standard'),
('David Garcia', 'Plumbing / Repairs', 'Contractors - General', 'Repairs', 'Standard'),
('Brian Schandel', 'Plumbing / Repairs', 'Uncategorized', 'Repairs', 'Standard'),
('Tim Reese', 'Plumbing / Repairs', 'Uncategorized', null, 'Standard'),
('Precision Plumbing', 'Plumbing / Repairs', 'Contractors - Plumbing', 'Repairs', 'Preferred'),

('Higher Standard Refrigeration Heating & Air', 'HVAC', 'Uncategorized', 'Repairs', 'Preferred'),
('Lewis Heating & Cooling Inc.', 'HVAC', 'Uncategorized', 'Repairs', 'Preferred'),
('Kevin Ray Thomas', 'HVAC', 'Uncategorized', 'Repairs', 'Standard'),

('Justin Dean Coates', 'Rent Ready', 'Contractors - General', 'Repairs', 'Standard'),
('Brian Coates', 'Rent Ready', 'Uncategorized', 'Repairs', 'Standard'),
('Brian Schandel', 'Rent Ready', 'Uncategorized', 'Repairs', 'Standard'),
('David Garcia', 'Rent Ready', 'Contractors - General', 'Repairs', 'Standard'),
('Ronald Claybrooks', 'Rent Ready', 'Contractors - General', 'Repairs', 'Standard'),

('Noe Flores Vergara', 'Trees', 'Uncategorized', 'Repairs', 'Standard'),
('Kaily''s Tree Service', 'Trees', 'Uncategorized', null, 'Preferred'),
('Robby Ragan', 'Trees', 'Contractors - Landscaping', 'Landscaping', 'Preferred'),
('Wilber Eduardo Dzib', 'Trees', 'Uncategorized', null, 'Standard'),
('Aurelio Torres', 'Trees', 'Contractors - Landscaping', 'Landscaping', 'Standard')

on conflict do nothing;
