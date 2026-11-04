-- Private company tracker: documents can be analysis, notes or memos (plus the earlier types),
-- may live in Google Drive instead of Storage, and record their file type.
alter table public.private_documents drop constraint if exists private_documents_doc_type_check;
alter table public.private_documents
  add constraint private_documents_doc_type_check
  check (doc_type in ('memo', 'analysis', 'notes', 'deck', 'financials', 'transcript', 'other'));

alter table public.private_documents
  add column if not exists external_url text,
  add column if not exists mime_type text;
