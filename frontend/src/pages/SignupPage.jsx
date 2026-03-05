import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { signup } from "../lib/api.js";
import { 
  Lock, 
  Mail, 
  User, 
  Loader2, 
  ArrowRight 
} from "lucide-react"; 
import { Link, useNavigate } from "react-router";
import toast, { Toaster } from "react-hot-toast";

const SignupPage = () => {
  const [signupData, setSignupData] = useState({
    email: "",
    full_name: "",
    password: "",
  });
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    mutate: signupMutation,
    error,
    isPending,
  } = useMutation({
    mutationFn: signup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      navigate("/");
    },
  });

  const handleSignup = (e) => {
    e.preventDefault();
    if (signupData.password.length < 6) {
      toast.error("Password must be atleast 6 characters long.");

      return;
    }
    signupMutation(signupData);
    if(error){
        toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
       <Toaster />
      <div className="mb-6 transition-opacity hover:opacity-80">
        <Link to="/">
          <img src="/logo.jpg" alt="Tat-Sahayak Logo" className="w-24 md:w-28 object-contain" />
        </Link>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">

        <div className="h-2 bg-gradient-to-r from-blue-600 to-cyan-400" />

        <div className="p-8 md:p-10">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Create Account</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Join the community response network</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={signupData.full_name}
                  onChange={(e) => setSignupData({ ...signupData, full_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  placeholder="name@email.com"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="password"
                  required
                  placeholder="Min. 6 characters"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 mt-4 
                ${isPending ? 'bg-slate-700 text-white cursor-not-allowed' : 'bg-slate-900 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white'}`}
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-8 text-center pt-6 border-t border-slate-100 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Already have an account?{" "}
              <Link 
                to="/login" 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold underline transition-colors"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;