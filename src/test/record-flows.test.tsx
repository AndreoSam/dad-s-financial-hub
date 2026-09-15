import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FDDialog from "@/components/FDDialog";
import DeleteConfirmation from "@/components/DeleteConfirmation";
import PolicyDialog from "@/components/PolicyDialog";
import { InsurancePolicy, validatePolicy } from "@/data/insurance";
import { defaultDeposits } from "@/data/fixedDeposits";

afterEach(cleanup);
const policy: InsurancePolicy = {
  id: "test-policy", policyNumber: "LIFE-123", insurer: "Example insurer", policyName: "Family cover",
  policyholder: "Test holder", type: "Life", sumAssured: 500000, premium: 10000,
  premiumFrequency: "Yearly", startDate: "2026-01-01", endDate: "2036-01-01",
  nextPremiumDate: "2027-01-01", nominee: "Test nominee", notes: "Test notes",
};

describe("record confirmation flows", () => {
  it("does not save a deposit before review and explicit confirmation", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<FDDialog mode="edit" initial={defaultDeposits[0]} open onSubmit={save} />);
    fireEvent.click(screen.getByRole("button", { name: "Review details" }));
    expect(screen.getByText("Review Fixed Deposit")).toBeInTheDocument();
    expect(screen.getByText(defaultDeposits[0].accountNo)).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Back to edit" }));
    expect(screen.getByLabelText("Account Number")).toHaveValue(defaultDeposits[0].accountNo);
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Review details" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm and save" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  });

  it("keeps deposit review open when saving fails", async () => {
    const close = vi.fn();
    render(<FDDialog mode="edit" initial={defaultDeposits[0]} open onOpenChange={close} onSubmit={vi.fn().mockRejectedValue(new Error("offline"))} />);
    fireEvent.click(screen.getByRole("button", { name: "Review details" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm and save" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm and save" })).toBeEnabled());
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByText(defaultDeposits[0].accountNo)).toBeInTheDocument();
  });

  it("canceling delete never invokes deletion", () => {
    const remove = vi.fn();
    render(<DeleteConfirmation open onOpenChange={vi.fn()} description="Policy LIFE-123" onConfirm={remove} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(remove).not.toHaveBeenCalled();
  });

  it("locks deletion while pending and retains confirmation on failure", async () => {
    let reject: (reason: Error) => void;
    const remove = vi.fn(() => new Promise<void>((_, r) => { reject = r; }));
    const close = vi.fn();
    render(<DeleteConfirmation open onOpenChange={close} description="Policy LIFE-123" onConfirm={remove} />);
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Deleting…" }));
    expect(remove).toHaveBeenCalledTimes(1);
    reject(new Error("offline"));
    await screen.findByRole("alert");
    expect(close).not.toHaveBeenCalled();
  });

  it("reviews policy edits, preserves them on failure, and retries the same ID", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const close = vi.fn();
    render(<PolicyDialog initial={policy} policies={[policy]} onClose={close} onSave={save} />);
    fireEvent.change(screen.getByLabelText("Nominee (optional)"), { target: { value: "New nominee" } });
    fireEvent.click(screen.getByRole("button", { name: "Review details" }));
    expect(screen.getByText("New nominee")).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm and save" }));
    await screen.findByRole("alert");
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm and save" }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(save).toHaveBeenNthCalledWith(2, { ...policy, nominee: "New nominee" });
  });

  it("adds a policy only after confirmation", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<PolicyDialog policies={[]} onClose={vi.fn()} onSave={save} />);
    for (const [label, value] of [["Policy number *", "NEW-123"], ["Insurer *", "Example"], ["Policyholder *", "Test"], ["Sum assured (₹) *", "100000"], ["Premium per payment (₹) *", "5000"], ["Start date *", "2026-01-01"]]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole("button", { name: "Review details" }));
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm and save" }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0]).toMatchObject({ policyNumber: "NEW-123", premium: 5000, sumAssured: 100000 });
  });
});

describe("insurance validation", () => {
  it("allows editing a policy but rejects duplicate insurer/number pairs", () => {
    expect(validatePolicy(policy, [policy])).toBeNull();
    expect(validatePolicy({ ...policy, id: "another", policyNumber: "life-123" }, [policy])).toContain("already exists");
  });
  it("rejects invalid amounts and dates", () => {
    expect(validatePolicy({ ...policy, premium: Infinity }, [])).toContain("greater than zero");
    expect(validatePolicy({ ...policy, endDate: "2025-12-01" }, [])).toContain("after the start");
    expect(validatePolicy({ ...policy, nextPremiumDate: "2040-01-01" }, [])).toContain("within the policy");
    expect(validatePolicy({ ...policy, startDate: "2026-02-30" }, [])).toContain("valid start");
  });
});
