-- Raw consultation audio is a private, write-once artefact: clinicians may
-- upload and read it, but nobody can overwrite or delete it through the API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'consultation-audio', 'consultation-audio', false, 26214400,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
on conflict (id) do nothing;

create policy "Clinicians read consultation audio" on storage.objects for select to authenticated
  using (bucket_id = 'consultation-audio' and (select public.is_clinician()));
create policy "Clinicians upload consultation audio" on storage.objects for insert to authenticated
  with check (bucket_id = 'consultation-audio' and (select public.is_clinician()));
