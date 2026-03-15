-- Run this in Supabase SQL Editor if your project was created before 'call' was added to templates.
-- Allows Call channel for templates (script/notes for voice campaigns).

alter table templates drop constraint if exists templates_channel_check;
alter table templates add constraint templates_channel_check check (channel in ('sms', 'email', 'call'));
