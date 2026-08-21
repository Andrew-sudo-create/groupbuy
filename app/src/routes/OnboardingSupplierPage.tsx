import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useCreateSupplierProfile } from "../hooks/useOnboarding";
import { PrimaryButton, TextField, Label, PageKicker, ErrorNote } from "../components/ui";

export default function OnboardingSupplierPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createProfile = useCreateSupplierProfile();

  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");

  const disabled = !companyName.trim() || createProfile.isPending;

  async function submit() {
    if (!user || disabled) return;
    await createProfile.mutateAsync({
      userId: user.id,
      companyName: companyName.trim(),
      contactEmail: contactEmail.trim(),
    });
    navigate("/supplier", { replace: true });
  }

  return (
    <div className="max-w-[1040px] mx-auto px-6 py-16 w-full">
      <PageKicker>Supplier sign-up · step 2 of 2</PageKicker>
      <h1 className="text-[30px] font-bold tracking-tight mb-6">Set up your supplier account</h1>
      <div className="max-w-[440px] flex flex-col gap-4">
        <div>
          <Label>Company name</Label>
          <TextField
            placeholder="e.g. Highveld Wholesale Foods"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <div>
          <Label>Contact email</Label>
          <TextField
            type="email"
            placeholder="e.g. orders@highveldwholesale.co.za"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
        <p className="text-faint text-[12.5px] leading-relaxed m-0">
          You'll be able to browse pools, request to join them (or accept invitations), and set tier pricing per
          item once you're in.
        </p>
        {createProfile.isError && <ErrorNote>{(createProfile.error as Error).message}</ErrorNote>}
        <PrimaryButton disabled={disabled} onClick={submit} className="mt-1.5 self-start">
          {createProfile.isPending ? "Creating…" : "Create account & continue"}
        </PrimaryButton>
      </div>
    </div>
  );
}
