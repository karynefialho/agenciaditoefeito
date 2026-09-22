drop policy if exists "read post media files" on storage.objects;
drop policy if exists "upload post media files" on storage.objects;
drop policy if exists "update post media files" on storage.objects;
drop policy if exists "delete post media files" on storage.objects;

create policy "admins read post media"
on storage.objects for select to authenticated
using (bucket_id = 'post-media' and public.has_role(auth.uid(), 'admin'));

create policy "members read own client post media"
on storage.objects for select to authenticated
using (
  bucket_id = 'post-media'
  and public.is_client_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

create policy "admins upload post media"
on storage.objects for insert to authenticated
with check (bucket_id = 'post-media' and public.has_role(auth.uid(), 'admin'));

create policy "admins update post media"
on storage.objects for update to authenticated
using (bucket_id = 'post-media' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'post-media' and public.has_role(auth.uid(), 'admin'));

create policy "admins delete post media"
on storage.objects for delete to authenticated
using (bucket_id = 'post-media' and public.has_role(auth.uid(), 'admin'));