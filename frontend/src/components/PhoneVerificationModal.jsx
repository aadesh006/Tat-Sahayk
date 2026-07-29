import { useState } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  Phone,
  X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { sendOTP, verifyOTP } from "../lib/api.js";


const PhoneVerificationModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOTP] = useState("");
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  const queryClient = useQueryClient();

  const {
    mutate: sendOTPMutation,
    isPending: sendingOTP,
  } = useMutation({
    mutationFn: () => sendOTP(phone),
    onSuccess: (data) => {
      setOTP("");
      setExpiresInMinutes(data.expires_in_minutes || 10);
      setStep("otp");

      if (data.development_otp) {
        toast.success(
          `Development OTP: ${data.development_otp}`,
          { duration: 10000 },
        );
      } else {
        toast.success("OTP sent to your phone!");
      }
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail
        || "Failed to send OTP",
      );
    },
  });

  const {
    mutate: verifyOTPMutation,
    isPending: verifying,
  } = useMutation({
    mutationFn: () => verifyOTP(phone, otp),
    onSuccess: () => {
      toast.success("Phone verified successfully!");
      queryClient.invalidateQueries({
        queryKey: ["authUser"],
      });
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail
        || "Invalid OTP",
      );
    },
  });

  const handleSendOTP = (event) => {
    event.preventDefault();

    if (phone.length !== 10) {
      toast.error(
        "Please enter a valid 10-digit phone number",
      );
      return;
    }

    sendOTPMutation();
  };

  const handleVerifyOTP = (event) => {
    event.preventDefault();

    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }

    verifyOTPMutation();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-[rgb(47,51,54)] dark:bg-[rgb(22,22,22)]">
        <div className="flex items-center justify-between bg-gradient-to-r from-sky-500 to-blue-600 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Phone size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Verify Phone Number
              </h2>
              <p className="text-xs text-white/80">
                Optional emergency contact verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/80 transition-all hover:bg-white/10 hover:text-white"
            aria-label="Close phone verification"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {step === "phone" ? (
            <form
              onSubmit={handleSendOTP}
              className="space-y-4"
            >
              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <AlertCircle
                  size={16}
                  className="mt-0.5 shrink-0 text-blue-500"
                />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  We will send a six-digit verification code to
                  this number. Use a number you can access during
                  this session.
                </p>
              </div>

              <div>
                <label
                  htmlFor="phone-number"
                  className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                    +91
                  </span>
                  <input
                    id="phone-number"
                    type="tel"
                    inputMode="numeric"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(event) => {
                      setPhone(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10),
                      );
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-14 pr-4 text-sm font-medium outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white"
                    maxLength={10}
                    required
                  />
                </div>
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  Enter a valid 10-digit Indian mobile number.
                </p>
              </div>

              <button
                type="submit"
                disabled={sendingOTP || phone.length !== 10}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3.5 text-sm font-black text-white shadow-lg shadow-sky-500/20 transition-all hover:from-sky-600 hover:to-blue-700 disabled:opacity-60"
              >
                {sendingOTP ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Phone size={18} />
                    Send OTP
                  </>
                )}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleVerifyOTP}
              className="space-y-4"
            >
              <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <Check
                  size={16}
                  className="mt-0.5 shrink-0 text-green-500"
                />
                <div>
                  <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                    OTP sent to +91 {phone}
                  </p>
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                    Please enter the six-digit code.
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="otp"
                  className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400"
                >
                  Enter OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={otp}
                  onChange={(event) => {
                    setOTP(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6),
                    );
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-2xl font-bold tracking-widest outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white"
                  maxLength={6}
                  required
                />
                <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
                  Code expires in {expiresInMinutes} minutes.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOTP("");
                    setStep("phone");
                  }}
                  className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 dark:border-[rgb(47,51,54)] dark:text-gray-300 dark:hover:bg-[rgb(38,38,38)]"
                >
                  Change Number
                </button>
                <button
                  type="submit"
                  disabled={verifying || otp.length !== 6}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 py-3 text-sm font-black text-white shadow-lg shadow-green-500/20 transition-all hover:from-green-600 hover:to-emerald-700 disabled:opacity-60"
                >
                  {verifying ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Verify
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => sendOTPMutation()}
                disabled={sendingOTP}
                className="w-full text-xs font-semibold text-sky-500 transition-colors hover:text-sky-600 disabled:opacity-60"
              >
                {sendingOTP ? "Resending..." : "Resend OTP"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhoneVerificationModal;
