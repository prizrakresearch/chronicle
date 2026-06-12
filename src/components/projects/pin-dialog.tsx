"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Lock, EyeOff, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ── 4-digit PIN dots input ────────────────────────────────────────────────────

function PinDots({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative flex justify-center">
      {/* invisible real input captures keystrokes */}
      <input
        ref={ref}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        className="absolute inset-0 opacity-0 w-full cursor-default"
        autoComplete="off"
      />
      {/* visual dots */}
      <div
        className="flex gap-3 cursor-text"
        onClick={() => ref.current?.focus()}
      >
        {[0, 1, 2, 3].map((i) => {
          const filled    = i < value.length;
          const isCurrent = i === value.length;
          return (
            <div
              key={i}
              className={cn(
                "w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-150",
                error
                  ? "border-red-500/60 bg-red-500/8"
                  : filled
                    ? "border-primary/70 bg-primary/10"
                    : isCurrent
                      ? "border-white/30 bg-white/[0.04]"
                      : "border-white/[0.08] bg-white/[0.02]"
              )}
            >
              {filled && (
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full transition-colors duration-150",
                  error ? "bg-red-400/80" : "bg-primary/80"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

export type PinDialogMode = "unlock" | "setup";

interface PinDialogProps {
  mode: PinDialogMode;
  storedPin: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the correct PIN is entered (unlock mode) */
  onUnlock: () => void;
  /** Called when a new PIN is confirmed (setup mode) */
  onSetPin: (pin: string) => void;
}

export function PinDialog({
  mode, storedPin, open, onOpenChange, onUnlock, onSetPin,
}: PinDialogProps) {
  // "enter"  = first digit entry (setup: choose PIN | unlock: verify PIN)
  // "confirm" = re-enter for confirmation (setup only)
  const [step,       setStep]       = useState<"enter" | "confirm">("enter");
  const [pin,        setPin]        = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error,      setError]      = useState(false);
  const [errorMsg,   setErrorMsg]   = useState("");

  const reset = useCallback(() => {
    setStep("enter");
    setPin("");
    setPinConfirm("");
    setError(false);
    setErrorMsg("");
  }, []);

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  function shake(msg: string, clearFn: () => void) {
    setError(true);
    setErrorMsg(msg);
    setTimeout(() => {
      setError(false);
      setErrorMsg("");
      clearFn();
    }, 700);
  }

  // Called each time a digit is pressed in the first input
  function handlePinChange(val: string) {
    setPin(val);
    setError(false);
    setErrorMsg("");
    if (val.length < 4) return;

    if (mode === "unlock") {
      if (val === storedPin) {
        onUnlock();
        handleClose();
      } else {
        shake("Incorrect PIN", () => setPin(""));
      }
    } else {
      // setup mode: advance to confirm step after brief pause
      setTimeout(() => { setStep("confirm"); }, 150);
    }
  }

  // Called each time a digit is pressed in the confirm input
  function handleConfirmChange(val: string) {
    setPinConfirm(val);
    setError(false);
    setErrorMsg("");
    if (val.length < 4) return;

    if (val === pin) {
      onSetPin(pin);
      handleClose();
    } else {
      shake("PINs don't match — try again", () => {
        setPinConfirm("");
        setStep("enter");
        setPin("");
      });
    }
  }

  const isSetup  = mode === "setup";
  const isConfirm = step === "confirm";

  const icon     = isSetup ? EyeOff : Lock;
  const Icon     = icon;
  const title    = isSetup
    ? (isConfirm ? "Confirm your PIN" : "Set a PIN")
    : "Enter PIN";
  const subtitle = isSetup
    ? (isConfirm ? "Enter the same 4-digit PIN again" : "Choose a 4-digit PIN to lock hidden projects")
    : "Enter your PIN to reveal hidden projects";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-xs">
        <DialogHeader>
          <div className="flex items-center justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <Icon className="h-5 w-5 text-white/35" />
            </div>
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <p className="text-[12px] text-white/35 text-center mt-1 leading-relaxed">{subtitle}</p>
        </DialogHeader>

        <div className="py-3 space-y-3">
          {isConfirm ? (
            <PinDots key="confirm" value={pinConfirm} onChange={handleConfirmChange} error={error} />
          ) : (
            <PinDots key="enter" value={pin} onChange={handlePinChange} error={error} />
          )}

          {errorMsg && (
            <p className="text-center text-[11px] text-red-400/80">{errorMsg}</p>
          )}
        </div>

        <div className="flex gap-2">
          {isConfirm && (
            <button
              onClick={() => { setStep("enter"); setPinConfirm(""); setError(false); setErrorMsg(""); }}
              className="h-11 w-11 rounded-full border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 flex items-center justify-center transition duration-200 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={handleClose}
            className="flex-1 h-11 rounded-full border border-white/10 text-white/40 text-sm font-semibold hover:text-white/70 hover:border-white/20 transition duration-200"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
