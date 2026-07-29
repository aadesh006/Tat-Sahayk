import React, { useState } from 'react';
import { X, Phone, Loader2, Check, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendOTP, verifyOTP } from '../lib/api.js';
import toast from 'react-hot-toast';

const PhoneVerificationModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOTP] = useState('');
  const queryClient = useQueryClient();

  const { mutate: sendOTPMutation, isPending: sendingOTP } = useMutation({
    mutationFn: () => sendOTP(phone),
    onSuccess: () => {
      toast.success('OTP sent to your phone!');
      setStep('otp');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    },
  });

  const { mutate: verifyOTPMutation, isPending: verifying } = useMutation({
    mutationFn: () => verifyOTP(phone, otp),
    onSuccess: () => {
      toast.success('Phone verified successfully!');
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    },
  });

  const handleSendOTP = (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    sendOTPMutation();
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }
    verifyOTPMutation();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-[rgb(47,51,54)] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Phone size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Verify Phone Number</h2>
              <p className="text-white/80 text-xs">Required for emergency contact</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {step === 'phone' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Your phone number will be used for emergency alerts and verification. We'll send you a 6-digit OTP.
                </p>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full pl-14 pr-4 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all text-sm font-medium"
                    maxLength={10}
                    required
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Enter your 10-digit mobile number
                </p>
              </div>

              <button
                type="submit"
                disabled={sendingOTP || phone.length !== 10}
                className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-lg shadow-sky-500/20"
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
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-green-700 dark:text-green-300 font-semibold">
                    OTP sent to +91 {phone}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Please enter the 6-digit code
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block">
                  Enter OTP
                </label>
                <input
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all text-center text-2xl font-bold tracking-widest"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                  Code expires in 10 minutes
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="flex-1 py-3 border-2 border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)] transition-all"
                >
                  Change Number
                </button>
                <button
                  type="submit"
                  disabled={verifying || otp.length !== 6}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-lg shadow-green-500/20"
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
                className="w-full text-xs text-sky-500 hover:text-sky-600 font-semibold transition-colors"
              >
                {sendingOTP ? 'Resending...' : 'Resend OTP'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhoneVerificationModal;
