import { format, formatDistanceToNow } from "date-fns";
import { ExternalLink, FileText, Loader2, Pencil, Sparkles, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PillButton } from "@/components/app/primitives";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  useAddNote,
  useDeleteCompany,
  useDeleteNote,
  useDocuments,
  useNotes,
  useSetCompanyStatus,
  useSummarizeDocument,
  useUploadDocument,
} from "@/data/hooks";
import { useRepo } from "@/data/RepoContext";
import {
  canSummarize,
  DOC_TYPE_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
  type Company,
  type CompanyDocument,
  type DocType,
} from "@/data/types";
import { moneyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CompanyForm } from "./CompanyForm";
import { CompanyLogo } from "@/components/holdings/CompanyLogo";
import { StatusDot } from "./StatusDot";
import { RiskList, Thesis } from "./Thesis";

export function CompanyPanel({
  company,
  onClose,
}: {
  company: Company | null;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <Sheet open={!!company} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-line bg-surface p-0 sm:max-w-[720px]"
      >
        {company && (
          <>
            <PanelBody company={company} onEdit={() => setEditing(true)} onDeleted={onClose} />
            <CompanyForm
              open={editing}
              onOpenChange={setEditing}
              region={company.region}
              company={company}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PanelBody({
  company,
  onEdit,
  onDeleted,
}: {
  company: Company;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const move = useSetCompanyStatus(company.region);
  const del = useDeleteCompany();
  const ccy = company.valuationCurrency;
  const metrics = Object.entries(company.keyMetrics);

  const facts = [
    ["Sector", company.sector],
    ["Stage", company.stage],
    ["Round", company.round],
    [
      "Last valuation",
      company.lastValuation != null ? moneyCompact(company.lastValuation, ccy) : null,
    ],
    [
      "My investment",
      company.investedAmount != null ? moneyCompact(company.investedAmount, ccy) : null,
    ],
    ["Updated", formatDistanceToNow(new Date(company.updatedAt), { addSuffix: true })],
  ] as const;

  return (
    <div className="pb-12">
      <div className="border-b border-line px-6 pt-10 pb-7 sm:px-10">
        <p className="label-caps text-brand">
          {company.region === "india" ? "India" : "Global"} · Private
        </p>
        <div className="mt-3 flex items-center gap-4">
          <CompanyLogo
            name={company.name}
            website={company.website?.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}
            size={52}
          />
          <SheetTitle className="font-display text-[34px] sm:text-[44px]">
            {company.name}
          </SheetTitle>
        </div>
        <SheetDescription asChild>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-2">
            {company.website && (
              <a
                href={
                  company.website.startsWith("http")
                    ? company.website
                    : `https://${company.website}`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2"
              >
                {company.website.replace(/^https?:\/\//, "")}{" "}
                <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </div>
        </SheetDescription>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-sm border border-line bg-paper p-1">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  company.status !== s &&
                  move.mutate(
                    { id: company.id, status: s },
                    {
                      onError: (e) =>
                        toast.error("Couldn't change the stage", { description: e.message }),
                    },
                  )
                }
                className={cn(
                  "flex items-center gap-1.5 rounded-sm px-3 py-1 text-[13px] font-medium transition-colors",
                  company.status === s ? "bg-ink text-paper" : "text-ink-2 hover:text-ink",
                )}
              >
                <StatusDot status={s} />
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <PillButton variant="outline" className="py-1.5" onClick={onEdit}>
            <Pencil className="size-3.5" aria-hidden /> Edit
          </PillButton>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-line px-6 py-6 sm:grid-cols-3 sm:px-10">
        {facts.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="label-caps text-[10px] text-ink-3">{k}</dt>
            <dd className="mt-1.5 truncate text-[15px]">
              {v ?? <span className="text-ink-3">—</span>}
            </dd>
          </div>
        ))}
      </dl>

      <Section title="Investment thesis">
        {company.thesis ? (
          <Thesis text={company.thesis} />
        ) : (
          <p className="text-[15px] text-ink-3">
            No thesis yet. Write one, or upload an IC memo and Claude will draft it.
          </p>
        )}
      </Section>
      <Section title="Key risks">
        {company.keyRisks ? (
          <RiskList text={company.keyRisks} />
        ) : (
          <p className="text-[15px] text-ink-3">No risks noted yet.</p>
        )}
      </Section>
      {metrics.length > 0 && (
        <Section title="Key metrics">
          <dl className="grid gap-x-10 sm:grid-cols-2">
            {metrics.map(([k, v]) => (
              <div
                key={k}
                className="flex items-baseline justify-between gap-4 border-b border-line/70 py-3"
              >
                <dt className="text-[13px] text-ink-3">{k}</dt>
                <dd className="tabular text-right text-[15px]">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      <Documents company={company} />
      <Notes company={company} />

      <div className="px-6 pt-8 sm:px-10">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-loss hover:underline"
          onClick={() => {
            if (
              !confirm(
                `Delete ${company.name}, with its notes and documents? This can't be undone.`,
              )
            )
              return;
            del.mutate(company.id, {
              onSuccess: () => {
                toast.success(`${company.name} deleted`);
                onDeleted();
              },
              onError: (e) => toast.error("Couldn't delete", { description: e.message }),
            });
          }}
        >
          <Trash2 className="size-4" aria-hidden /> Delete company
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line px-6 py-8 sm:px-10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="label-caps text-ink-3">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function Notes({ company }: { company: Company }) {
  const notes = useNotes(company.id);
  const add = useAddNote(company.id);
  const del = useDeleteNote(company.id);
  const [body, setBody] = useState("");

  const submit = () => {
    if (!body.trim()) return;
    add.mutate(body.trim(), {
      onSuccess: () => setBody(""),
      onError: (e) => toast.error("Couldn't save note", { description: e.message }),
    });
  };

  return (
    <Section title="Notes and context">
      <div className="rounded-[6px] border border-line bg-paper transition-colors focus-within:border-brand/60">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="Paste call notes, an email thread, founder update, anything that builds context…"
          className="min-h-28 w-full resize-y bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-ink-3"
        />
        <div className="flex items-center justify-between border-t border-line px-3 py-2">
          <span className="hidden text-[12px] text-ink-3 sm:inline">⌘ + Enter to save</span>
          <PillButton
            className="ml-auto py-1.5"
            onClick={submit}
            disabled={!body.trim() || add.isPending}
          >
            {add.isPending ? "Saving…" : "Add note"}
          </PillButton>
        </div>
      </div>

      <ol className="mt-5 space-y-4">
        {(notes.data ?? []).map((n) => (
          <li key={n.id} className="group relative border-l-2 border-line pl-4">
            <div className="flex items-center justify-between gap-2 text-[12px] text-ink-3">
              <time dateTime={n.createdAt}>
                {format(new Date(n.createdAt), "d MMM yyyy · HH:mm")}
              </time>
              <button
                type="button"
                aria-label="Delete note"
                className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                onClick={() => del.mutate(n.id)}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-line">{n.body}</p>
          </li>
        ))}
        {notes.data?.length === 0 && <li className="text-[15px] text-ink-3">No notes yet.</li>}
      </ol>
    </Section>
  );
}

const UPLOAD_TYPES: DocType[] = ["analysis", "notes", "memo", "financials", "deck", "other"];
const ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv";

function Documents({ company }: { company: Company }) {
  const { repo } = useRepo();
  const docs = useDocuments(company.id);
  const upload = useUploadDocument(company.id);
  const summarize = useSummarizeDocument(company.id);
  const input = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<DocType>("analysis");
  const [filter, setFilter] = useState<DocType | "all">("all");
  const [dragging, setDragging] = useState(false);

  const onFiles = (list: FileList | null | undefined) => {
    for (const f of Array.from(list ?? [])) {
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`${f.name} is over 25 MB`);
        continue;
      }
      const readable = canSummarize(f.type, f.name);
      const t = toast.loading(`Uploading ${f.name}…`, {
        description: readable ? "Claude will read it and write a summary." : undefined,
      });
      upload.mutate(
        { file: f, docType },
        {
          onSuccess: () =>
            toast.success(readable ? `${f.name} uploaded and summarised` : `${f.name} uploaded`, {
              id: t,
            }),
          onError: (e) =>
            toast.error(`Couldn't upload ${f.name}`, { id: t, description: e.message }),
        },
      );
    }
  };

  const open = async (d: CompanyDocument) => {
    try {
      const url = await repo.documentUrl(d);
      if (url) window.open(url, "_blank", "noopener");
      else toast.message("This is a sample document in demo mode; there's no file to open.");
    } catch (e) {
      toast.error("Couldn't open the file", { description: (e as Error).message });
    }
  };

  const all = docs.data ?? [];
  const types = [...new Set(all.map((d) => (d.docType ?? "other") as DocType))];
  const shown = filter === "all" ? all : all.filter((d) => (d.docType ?? "other") === filter);

  return (
    <Section title="Analysis · notes · memos">
      {/* Upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-sm border border-dashed px-4 py-4 transition-colors",
          dragging ? "border-ink bg-paper-2" : "border-line",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-ink-3">Upload as</span>
          {UPLOAD_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDocType(t)}
              className={cn(
                "rounded-sm border px-2.5 py-1 text-[13px] transition-colors",
                docType === t
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-ink-2 hover:text-ink",
              )}
            >
              {DOC_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={upload.isPending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm bg-paper-2 px-4 py-3 text-[14px] font-medium transition-colors hover:bg-line disabled:opacity-60"
        >
          {upload.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-4" aria-hidden />
          )}
          Choose files or drop them here
        </button>
        <p className="mt-2 text-[12px] text-ink-3">
          PDF, Word, Excel, PowerPoint or text, up to 25 MB each. Claude summarises PDFs and text
          files and fills any empty thesis, risks and metrics.
        </p>
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Filter */}
      {types.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-4 text-[13px]">
          {(["all", ...types] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={cn(
                "border-b-2 py-0.5",
                filter === t
                  ? "border-ink font-medium text-ink"
                  : "border-transparent text-ink-3 hover:text-ink",
              )}
            >
              {t === "all" ? `All (${all.length})` : DOC_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <ul className="mt-4 space-y-3">
        {shown.map((d) => (
          <li key={d.id} className="rounded-sm border border-line p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-ink text-paper">
                <FileText className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => void open(d)}
                  className="inline-flex max-w-full items-center gap-1.5 text-left font-medium hover:underline"
                >
                  <span className="truncate">{d.title}</span>
                  {d.externalUrl && (
                    <ExternalLink className="size-3.5 shrink-0 text-ink-3" aria-hidden />
                  )}
                </button>
                <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-ink-3">
                  <span className="rounded-sm bg-paper-2 px-1.5 py-0.5 text-ink-2">
                    {DOC_TYPE_LABEL[(d.docType ?? "other") as DocType] ?? "Other"}
                  </span>
                  <span>{format(new Date(d.uploadedAt), "d MMM yyyy")}</span>
                  {d.externalUrl?.includes("drive.google.com") && <span>· Google Drive</span>}
                </div>
              </div>
            </div>
            {d.summary ? (
              <div className="mt-3 space-y-2">
                <p className="flex gap-2 text-[14px] leading-relaxed text-ink-2">
                  <Sparkles
                    className="mt-1 size-3.5 shrink-0 text-series-1"
                    aria-label="AI summary"
                  />
                  {d.summary}
                </p>
                {d.keyTakeaways && (
                  <p className="pl-5.5 text-[14px] leading-relaxed whitespace-pre-line text-ink-2">
                    {d.keyTakeaways}
                  </p>
                )}
              </div>
            ) : canSummarize(d.mimeType, d.title) || (!d.mimeType && !d.externalUrl) ? (
              <div className="mt-3 flex items-center gap-2 text-[13px] text-ink-3">
                {upload.isPending || summarize.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden /> Claude is reading this
                    document…
                  </>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 underline underline-offset-2"
                    onClick={() =>
                      summarize.mutate(d.id, {
                        onError: (e) => toast.error("Summary failed", { description: e.message }),
                      })
                    }
                  >
                    <Sparkles className="size-3.5" aria-hidden /> Summarise with Claude
                  </button>
                )}
              </div>
            ) : null}
          </li>
        ))}
        {docs.data?.length === 0 && <li className="text-[14px] text-ink-3">No documents yet.</li>}
      </ul>
    </Section>
  );
}
