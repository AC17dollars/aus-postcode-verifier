"use client";

import { useState, useEffect, useRef } from "react";
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
  query SearchPostcode($suburb: String!, $state: String, $postcode: String!) {
    searchPostcode(suburb: $suburb, state: $state, postcode: $postcode) {
      success
      message
      matching {
        id
        location
        postcode
        state
        latitude
        longitude
        category
      }
      others {
        id
        location
        postcode
        state
        latitude
        longitude
        category
      }
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
  defaultValues?: Partial<AddressVerifierFormValues>;
  onFormValuesChange: (values: AddressVerifierFormValues) => void;
  status?: AddressVerifierStatus;
  message?: string;
  onStatusChange: (data: {
    status: AddressVerifierStatus;
    message: string;
    matching: Locality[];
    others: Locality[];
  }) => void;
  setIsFieldFocused: (focused: boolean) => void;
  onShowMapRequested?: () => void;
  showMapWhenResultsExist?: boolean;
}

const inputClass =
  "w-full h-14 px-5 bg-white/[0.04] border-transparent text-white placeholder:text-gray-600 focus:bg-white/[0.08] transition-all outline-none text-lg font-medium selection:bg-indigo-500/30 rounded-lg border border-transparent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-invalid:ring-2 aria-invalid:ring-inset aria-invalid:ring-destructive/30";

const selectTriggerClass =
  "w-full h-14 min-h-14 px-5 bg-white/[0.04] border border-white/10 text-white focus:bg-[#181818] transition-all outline-none text-base font-medium rounded-lg data-[placeholder]:text-gray-500 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-invalid:ring-2 aria-invalid:ring-inset aria-invalid:ring-destructive/30 [&_[data-slot=select-value]]:text-base [&_[data-slot=select-value]]:font-medium";

const stateItems = [
  { label: "Select State", value: "" },
  ...AU_STATE_OPTIONS.map((s) => ({ label: s, value: s })),
];

export function AddressVerifierForm({
  defaultValues,
  onFormValuesChange,
  status: statusProp,
  message: messageProp,
  onStatusChange,
  setIsFieldFocused,
  onShowMapRequested,
  showMapWhenResultsExist = false,
}: Readonly<AddressVerifierFormProps>) {
  const client = useClient();
  const [localStatus, setLocalStatus] = useState<AddressVerifierStatus>("idle");
  const [localMessage, setLocalMessage] = useState("");
  const appliedInitialRef = useRef(false);
  const status = statusProp ?? localStatus;
  const message = messageProp ?? localMessage;

  const form = useForm<AddressVerifierFormValues>({
    resolver: zodResolver(addressVerifierSchema),
    defaultValues: {
      postcode: defaultValues?.postcode ?? "",
      suburb: defaultValues?.suburb ?? "",
      state: defaultValues?.state ?? "",
    },
    mode: "onTouched",
  });

  useEffect(() => {
    if (
      !defaultValues ||
      appliedInitialRef.current ||
      (defaultValues.postcode === "" &&
        defaultValues.suburb === "" &&
        defaultValues.state === "")
    )
      return;

    appliedInitialRef.current = true;

    // Reset and notify in one microtask
    queueMicrotask(() => {
      form.reset(defaultValues);
      onFormValuesChange({
        postcode: defaultValues.postcode ?? "",
        suburb: defaultValues.suburb ?? "",
        state: defaultValues.state ?? "",
      });
    });
  }, [defaultValues, form, onFormValuesChange]);

  function notifyFormValuesChange() {
    onFormValuesChange(form.getValues());
  }

  const updateStatus = (
    nextStatus: AddressVerifierStatus,
    nextMessage: string,
    matching: Locality[] = [],
    others: Locality[] = [],
  ) => {
    setLocalStatus(nextStatus);
    setLocalMessage(nextMessage);
    onStatusChange({
      status: nextStatus,
      message: nextMessage,
      matching,
      others,
    });
  };

  const resetForm = () => {
    form.reset({ postcode: "", suburb: "", state: "" });
    updateStatus("idle", "", [], []);
  };

  const onSubmit = async (data: AddressVerifierFormValues) => {
    updateStatus("loading", "", [], []);

    try {
      const result = await client
        .query(
          SEARCH_QUERY,
          {
            suburb: data.suburb?.trim() ?? "",
            state: data.state || undefined,
            postcode: data.postcode.trim(),
          },
          status === "error" ? { requestPolicy: "network-only" } : undefined,
        )
        .toPromise();

      if (result.error) {
        const message =
          result.error.graphQLErrors?.[0]?.message ??
          result.error.message ??
          "Request failed. Try again.";
        updateStatus("error", message, [], []);
        return;
      }

      const searchResult = result.data?.searchPostcode as
        | {
            success: boolean;
            message: string | null;
            matching: Locality[];
            others: Locality[];
          }
        | undefined;
      const success = searchResult?.success ?? false;
      const message = searchResult?.message ?? null;
      const matching = searchResult?.matching ?? [];
      const others = searchResult?.others ?? [];
      const hasMatching = matching.length > 0;
      const hasAny = matching.length > 0 || others.length > 0;

      if (!success && message) {
        updateStatus("error", message, [], []);
        return;
      }
      if (hasMatching) {
        updateStatus("success", "Valid postcode", matching, others);
      } else if (hasAny) {
        updateStatus("error", "No exact postcode found.", matching, others);
      } else {
        updateStatus("error", "No results", [], []);
      }
    } catch {
      updateStatus("error", "Connection Error", [], []);
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
            {...form.register("postcode", { onChange: notifyFormValuesChange })}
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
            {...form.register("suburb", { onChange: notifyFormValuesChange })}
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
              <Select
                value={field.value || ""}
                onValueChange={(value) => {
                  field.onChange(value);
                  notifyFormValuesChange();
                }}
              >
                <SelectTrigger
                  id="state"
                  className={selectTriggerClass}
                  {...focusHandlers}
                  aria-invalid={!!form.formState.errors.state}
                >
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border border-white/10 text-white shadow-xl shadow-black/40 rounded-xl font-sans [&_[data-slot=select-item]]:text-base [&_[data-slot=select-item]]:font-medium [&_[data-slot=select-item]]:py-2.5 [&_[data-slot=select-item]]:focus:bg-white/10 [&_[data-slot=select-item]]:data-[highlighted]:bg-white/10">
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
        showMapWhenResultsExist={showMapWhenResultsExist}
      />
    </form>
  );
}

interface StatusAndSubmitSectionProps {
  readonly status: AddressVerifierStatus;
  readonly message: string;
  readonly isSubmitting: boolean;
  readonly onShowMapRequested?: () => void;
  readonly showMapWhenResultsExist?: boolean;
}

function StatusAndSubmitSection({
  status,
  message,
  isSubmitting,
  onShowMapRequested,
  showMapWhenResultsExist = false,
}: StatusAndSubmitSectionProps) {
  const showResult = status === "success" || status === "error";
  const isSuccess = status === "success";

  return (
    <>
      <div className="flex gap-3 items-stretch">
        <AnimatePresence mode="wait">
          {showResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex-1 min-w-0 flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm border h-14 overflow-hidden ${isSuccess ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"}`}
            >
              {isSuccess ? (
                <CheckCircle2 size={18} className="shrink-0" />
              ) : (
                <AlertCircle size={18} className="shrink-0" />
              )}
              <span className="min-w-0 break-words line-clamp-2">
                {message}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          type="submit"
          disabled={isSubmitting}
          className={`h-14 shrink-0 bg-white text-black hover:bg-gray-200 rounded-lg font-bold text-lg shadow-xl shadow-white/5 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group select-none ${showResult ? "w-[68px]" : "flex-1 min-w-0"}`}
        >
          {isSubmitting ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <>
              <Search
                size={24}
                className="group-hover:scale-110 transition-transform"
              />
              {status === "idle" && <span>Verify</span>}
            </>
          )}
        </Button>
      </div>
      {onShowMapRequested && (status === "success" || showMapWhenResultsExist) && (
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
