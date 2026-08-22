import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Sparkles, MapPin, Calendar } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import {
  useMyPurchaseRequests,
  useCreatePurchaseRequest,
  useUpdatePurchaseRequest,
  useCancelPurchaseRequest,
  type PurchaseRequest,
  type PurchaseRequestInput,
} from "../hooks/usePurchaseRequests";
import { fmtR } from "../lib/domain";
import {
  Card,
  Tag,
  PageKicker,
  PrimaryButton,
  GhostButton,
  TextField,
  TextArea,
  Label,
  Modal,
  ModalHeader,
  EmptyNote,
} from "../components/ui";

const EMPTY_INPUT: PurchaseRequestInput = {
  productName: "",
  quantity: 1,
  unit: "",
  neededBy: null,
  radiusKm: null,
  budgetPrice: null,
  notes: "",
};

function statusTone(status: PurchaseRequest["status"]): "accent" | "neutral" {
  return status === "active" ? "accent" : "neutral";
}

export default function MyPurchaseRequestsPage() {
  const { buyerProfile } = useAuth();
  const navigate = useNavigate();
  const { data: requests, isLoading } = useMyPurchaseRequests(buyerProfile?.id);
  const cancel = useCancelPurchaseRequest(buyerProfile?.id ?? "");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PurchaseRequest | null>(null);

  if (!buyerProfile) return null;

  const activeCount = (requests ?? []).filter((r) => r.status === "active").length;

  return (
    <div className="max-w-[900px] mx-auto px-6 pt-8 pb-14 w-full">
      <div className="mb-6 flex justify-between items-start gap-3 flex-wrap">
        <div>
          <PageKicker>Buyer dashboard</PageKicker>
          <h2 className="text-[26px] font-bold m-0 tracking-tight">My Purchase Requests</h2>
          <p className="text-muted mt-1 mb-0 text-[13px]">
            Post what you need — GroupBuy Opportunities matches you with nearby businesses wanting the same thing.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigate("/buyer/opportunities")}
            className="inline-flex items-center gap-1.5 whitespace-nowrap border border-border-strong rounded-full px-3.5 py-1.5 text-[13px] text-accent-light bg-transparent cursor-pointer hover:bg-surface-2 font-sans"
          >
            <Sparkles size={14} />
            GroupBuy Opportunities
          </button>
          <PrimaryButton onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5">
            <Plus size={15} />
            New request
          </PrimaryButton>
        </div>
      </div>

      {isLoading && <p className="text-faint text-sm">Loading…</p>}
      {requests && requests.length === 0 && (
        <EmptyNote>No purchase requests yet — post one to start finding compatible businesses.</EmptyNote>
      )}

      <div className="flex flex-col gap-3">
        {requests?.map((r) => (
          <Card key={r.id} className="flex flex-col gap-2">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div>
                <div className="text-[15px] font-semibold">{r.product_name}</div>
                <div className="text-muted text-[13px] mt-0.5">
                  {r.quantity} {r.unit || "units"}
                  {r.needed_by && (
                    <span className="inline-flex items-center gap-1 ml-2">
                      <Calendar size={11} className="text-faint" />
                      by {r.needed_by}
                    </span>
                  )}
                  {r.radius_km != null && (
                    <span className="inline-flex items-center gap-1 ml-2">
                      <MapPin size={11} className="text-faint" />
                      within {r.radius_km}km
                    </span>
                  )}
                  {r.budget_price != null && <span className="ml-2">· budget {fmtR(r.budget_price)}/unit</span>}
                </div>
                {r.notes && <p className="m-0 mt-1.5 text-[12.5px] text-faint">{r.notes}</p>}
              </div>
              <Tag tone={statusTone(r.status)}>{r.status}</Tag>
            </div>
            {r.status === "active" && (
              <div className="flex items-center gap-2 border-t border-border pt-2.5 mt-1">
                <GhostButton onClick={() => setEditing(r)}>Edit</GhostButton>
                <GhostButton onClick={() => cancel.mutate(r.id)} disabled={cancel.isPending}>
                  Cancel
                </GhostButton>
              </div>
            )}
          </Card>
        ))}
      </div>

      {activeCount > 0 && (
        <p className="text-faint text-[12.5px] mt-5">
          {activeCount} active request{activeCount === 1 ? "" : "s"} — check{" "}
          <button
            onClick={() => navigate("/buyer/opportunities")}
            className="text-accent-light underline bg-transparent border-none cursor-pointer p-0 font-sans"
          >
            GroupBuy Opportunities
          </button>{" "}
          to see what's matched.
        </p>
      )}

      {showForm && (
        <PurchaseRequestModal
          buyerId={buyerProfile.id}
          initial={EMPTY_INPUT}
          onClose={() => setShowForm(false)}
        />
      )}
      {editing && (
        <PurchaseRequestModal
          buyerId={buyerProfile.id}
          requestId={editing.id}
          initial={{
            productName: editing.product_name,
            quantity: editing.quantity,
            unit: editing.unit,
            neededBy: editing.needed_by,
            radiusKm: editing.radius_km,
            budgetPrice: editing.budget_price,
            notes: editing.notes,
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function PurchaseRequestModal({
  buyerId,
  requestId,
  initial,
  onClose,
}: {
  buyerId: string;
  requestId?: string;
  initial: PurchaseRequestInput;
  onClose: () => void;
}) {
  const create = useCreatePurchaseRequest(buyerId);
  const update = useUpdatePurchaseRequest(buyerId);
  const [form, setForm] = useState<PurchaseRequestInput>(initial);

  const disabled = !form.productName.trim() || !form.quantity || form.quantity <= 0 || create.isPending || update.isPending;

  async function submit() {
    if (disabled) return;
    if (requestId) {
      await update.mutateAsync({ id: requestId, input: form });
    } else {
      await create.mutateAsync(form);
    }
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader kicker="Purchase request" title={requestId ? "Edit request" : "New request"} onClose={onClose} />
      <div className="flex flex-col gap-3.5 mt-4">
        <div>
          <Label>Product</Label>
          <TextField
            placeholder="e.g. Oat milk, barista blend"
            value={form.productName}
            onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Quantity</Label>
            <TextField
              type="number"
              min={1}
              value={form.quantity || ""}
              onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value, 10) || 0 }))}
            />
          </div>
          <div>
            <Label>Unit</Label>
            <TextField
              placeholder="e.g. 1L carton"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Needed by (optional)</Label>
            <TextField
              type="date"
              value={form.neededBy ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, neededBy: e.target.value || null }))}
            />
          </div>
          <div>
            <Label>Radius km (optional)</Label>
            <TextField
              type="number"
              min={0}
              placeholder="e.g. 5"
              value={form.radiusKm ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, radiusKm: e.target.value ? Number(e.target.value) : null }))}
            />
          </div>
        </div>
        <div>
          <Label>Budget price per unit (optional)</Label>
          <TextField
            type="number"
            min={0}
            placeholder="e.g. 25"
            value={form.budgetPrice ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, budgetPrice: e.target.value ? Number(e.target.value) : null }))}
          />
        </div>
        <div>
          <Label>Notes (optional)</Label>
          <TextArea
            placeholder="Anything else worth knowing — brand preference, delivery constraints…"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="min-h-[70px]"
          />
        </div>
        <PrimaryButton disabled={disabled} onClick={submit} className="self-start mt-1">
          {create.isPending || update.isPending ? "Saving…" : requestId ? "Save changes" : "Post request"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}
