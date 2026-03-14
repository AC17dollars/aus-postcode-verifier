"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { useClient } from "urql";
import {
  CheckCircle2,
  AlertCircle,
  Search,
  Loader2,
  Map as MapIcon,
  RotateCcw,
} from "lucide-react";
import {
  addressVerifierSchema,
  AU_STATE_OPTIONS,
  type AddressVerifierFormValues,
} from "@/lib/schemas/address";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SEARCH_QUERY = `
  query SearchPostcode($q: String!, $state: String) {
    searchPostcode(q: $q, state: $state) {
      id
      location
      postcode
      state
      latitude
      longitude
      category
    }
  }
`;

export interface Locality {
  id: number;
  location: string;
  postcode: string;
  state: string;
  latitude: number;
  longitude: number;
  category: string;
}

export type AddressVerifierStatus = "idle" | "loading" | "success" | "error";

export interface AddressVerifierFormProps {
  onStatusChange: (data: {
    status: AddressVerifierStatus;
    message: string;
    localities: Locality[];
  }) => void;
  setIsFieldFocused: (focused: boolean) => void;
  onShowMapRequested?: () => void;
}

const inputClass =
  "w-full h-14 px-5 bg-white/[0.04] border-transparent text-white placeholder:text-gray-600 focus:bg-white/[0.08] transition-all outline-none text-lg font-medium selection:bg-indigo-500/30 rounded-lg border border-transparent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-invalid:ring-2 aria-invalid:ring-inset aria-invalid:ring-destructive/30";

const selectTriggerClass =
  "w-full h-14 min-h-14 px-5 bg-white/[0.04] border border-white/10 text-white focus:bg-[#181818] transition-all outline-none text-base font-medium rounded-lg data-[placeholder]:text-gray-500 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-invalid:ring-2 aria-invalid:ring-inset aria-invalid:ring-destructive/30 [&_[data-slot=select-value]]:text-base [&_[data-slot=select-value]]:font-medium";

const stateItems = [
  { label: "Select State", value: "" },
  ...AU_STATE_OPTIONS.map((s) => ({ label: s, value: s })),
];

function validateSearchResults(
  data: AddressVerifierFormValues,
  results: Locality[],
): { status: AddressVerifierStatus; message: string } {
  if (!results?.length) {
    return { status: "error", message: "Invalid Postcode" };
  }
  const sub = data.suburb.trim().toUpperCase();
  const matched = results.find((l) => l.location === sub);
  if (!matched) {
    return { status: "error", message: "Invalid Suburb" };
  }
  if (data.state && matched.state !== data.state) {
    return { status: "error", message: "Invalid State" };
  }
  return { status: "success", message: "Valid Location" };
}

export function AddressVerifierForm({
  onStatusChange,
  setIsFieldFocused,
  onShowMapRequested,
}: Readonly<AddressVerifierFormProps>) {
  const client = useClient();
  const [status, setStatus] = useState<AddressVerifierStatus>("idle");
  const [message, setMessage] = useState("");

  const form = useForm<AddressVerifierFormValues>({
    resolver: zodResolver(addressVerifierSchema),
    defaultValues: { postcode: "", suburb: "", state: "" },
    mode: "onTouched",
  });

  const updateStatus = (
    nextStatus: AddressVerifierStatus,
    nextMessage: string,
    nextLocalities: Locality[] = [],
  ) => {
    setStatus(nextStatus);
    setMessage(nextMessage);
    onStatusChange({ status: nextStatus, message: nextMessage, localities: nextLocalities });
  };

  const resetForm = () => {
    form.reset({ postcode: "", suburb: "", state: "" });
    updateStatus("idle", "", []);
  };

  const onSubmit = async (data: AddressVerifierFormValues) => {
    updateStatus("loading", "", []);

    try {
      const result = await client
        .query(
          SEARCH_QUERY,
          {
            q: data.postcode.trim(),
            state: data.state || undefined,
          },
          status === "error" ? { requestPolicy: "network-only" } : undefined,
        )
        .toPromise();

      if (result.error) {
        updateStatus("error", result.error.message, []);
        return;
      }

      const results = (result.data?.searchPostcode ?? []) as Locality[];
      const validated = validateSearchResults(data, results);

      if (validated.status === "success") {
        updateStatus(validated.status, validated.message, results);
      } else {
        updateStatus(validated.status, validated.message, []);
      }
    } catch {
      updateStatus("error", "Connection Error", []);
    }
  };

  const focusHandlers = {
    onFocus: () => setIsFieldFocused(true),
    onBlur: () => setIsFieldFocused(false),
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <Label
            htmlFor="postcode"
            className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1 select-none"
          >
            Postcode
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetForm}
            className="group flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white"
            title="Reset Form"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest block md:hidden md:group-hover:block">
              Reset Form
            </span>
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          </Button>
        </div>
        <div className="relative group overflow-hidden rounded-lg">
          <Input
            id="postcode"
            {...form.register("postcode")}
            placeholder="e.g. 3004"
            className={inputClass}
            {...focusHandlers}
            aria-invalid={!!form.formState.errors.postcode}
          />
        </div>
        {form.formState.errors.postcode && (
          <p className="text-destructive text-xs mt-1 ml-1">
            {form.formState.errors.postcode.message}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Label
          htmlFor="suburb"
          className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1 select-none"
        >
          Suburb
        </Label>
        <div className="relative group overflow-hidden rounded-lg">
          <Input
            id="suburb"
            {...form.register("suburb")}
            placeholder="e.g. Melbourne"
            className={inputClass}
            {...focusHandlers}
            aria-invalid={!!form.formState.errors.suburb}
          />
        </div>
        {form.formState.errors.suburb && (
          <p className="text-destructive text-xs mt-1 ml-1">
            {form.formState.errors.suburb.message}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Label
          htmlFor="state"
          className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1 select-none"
        >
          State
        </Label>
        <div className="relative group overflow-hidden rounded-lg">
          <Controller
            name="state"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger
                  id="state"
                  className={selectTriggerClass}
                  {...focusHandlers}
                  aria-invalid={!!form.formState.errors.state}
                >
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent
                  className="bg-[#0a0a0a] border border-white/10 text-white shadow-xl shadow-black/40 rounded-xl font-sans [&_[data-slot=select-item]]:text-base [&_[data-slot=select-item]]:font-medium [&_[data-slot=select-item]]:py-2.5 [&_[data-slot=select-item]]:focus:bg-white/10 [&_[data-slot=select-item]]:data-[highlighted]:bg-white/10"
                >
                  <SelectGroup>
                    {stateItems.map((item) => (
                      <SelectItem
                        key={item.value || "placeholder"}
                        value={item.value}
                        disabled={item.value === ""}
                      >
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        {form.formState.errors.state && (
          <p className="text-destructive text-xs mt-1 ml-1">
            {form.formState.errors.state.message}
          </p>
        )}
      </div>

      <StatusAndSubmitSection
        status={status}
        message={message}
        isSubmitting={form.formState.isSubmitting}
        onShowMapRequested={onShowMapRequested}
      />
    </form>
  );
}

interface StatusAndSubmitSectionProps {
  readonly status: AddressVerifierStatus;
  readonly message: string;
  readonly isSubmitting: boolean;
  readonly onShowMapRequested?: () => void;
}

function StatusAndSubmitSection({
  status,
  message,
  isSubmitting,
  onShowMapRequested,
}: StatusAndSubmitSectionProps) {
  const showResult = status === "success" || status === "error";
  const isSuccess = status === "success";

  return (
    <>
      <div className="flex gap-3">
        <AnimatePresence mode="wait">
          {showResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex-1 flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-bold text-sm border ${isSuccess ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"}`}
            >
              {isSuccess ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span className="truncate">{message}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          type="submit"
          disabled={isSubmitting}
          className={`${showResult ? "w-[68px]" : "w-full"} h-14 bg-white text-black hover:bg-gray-200 rounded-lg font-bold text-lg shadow-xl shadow-white/5 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group shrink-0 select-none`}
        >
          {isSubmitting ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <>
              <Search size={24} className="group-hover:scale-110 transition-transform" />
              {status === "idle" && <span>Verify</span>}
            </>
          )}
        </Button>
      </div>
      {onShowMapRequested && status === "success" && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onShowMapRequested}
          className="w-full md:hidden flex items-center justify-center gap-3 h-14 rounded-xl bg-white text-black font-extrabold shadow-xl select-none"
        >
          <MapIcon size={20} />
          View Results on Map
        </motion.button>
      )}
    </>
  );
}
