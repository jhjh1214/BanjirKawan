-- Recovery metric: photos-in → confirmed-report-out duration.
-- created_at = after-photos submitted; confirmed_at = owner signed off.

alter table outcomes add column if not exists confirmed_at timestamptz;
