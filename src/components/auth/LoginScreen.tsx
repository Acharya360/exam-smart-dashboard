import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  KeyRound, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, users } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const result = await login(email.trim(), password);
    if (!result.success) {
      setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
    }
    setIsLoading(false);
  };

  const handleQuickLogin = async (demoEmail: string) => {
    const targetUser = users.find((u) => u.email.toLowerCase() === demoEmail.toLowerCase());
    const demoPassword = targetUser?.password || 'Admin@123';
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMessage(null);
    await login(demoEmail, demoPassword);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-600 selection:text-white">
      {/* Background ambient pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* University Crest / Header */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30 border border-indigo-400/30">
            <Building2 className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Examination Department Portal
        </h2>
        <p className="mt-1.5 text-center text-xs text-slate-400 max-w-sm mx-auto">
          Central Examination Directorate & Timetable Governance System. Enter authorized university credentials.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-800">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Institutional Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. coe@sspu.ac.in"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-slate-500">
                  Default: <code className="text-indigo-400 font-mono">Admin@123</code>
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to Examination Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Login Persona Selector */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Instant Demo Persona Logins</span>
              </span>
              <span className="text-[10px] text-slate-500">1-click test</span>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('coe@sspu.ac.in')}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-indigo-900/30 border border-slate-700/60 hover:border-indigo-500/50 text-left transition-all group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 flex items-center gap-2">
                    <span>Dr. Rajesh Sharma</span>
                    <span className="font-mono text-[10px] text-slate-400">coe@sspu.ac.in</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Controller of Examinations (CoE) · Super Admin
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  COE
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('DyCoe@sspu.ac.in')}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-indigo-900/30 border border-slate-700/60 hover:border-indigo-500/50 text-left transition-all group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 flex items-center gap-2">
                    <span>Dr. Anita Verma</span>
                    <span className="font-mono text-[10px] text-slate-400">DyCoe@sspu.ac.in</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Deputy Controller of Examinations (DyCoE) · Super Admin
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  DYCOE
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('Acoe@sspu.ac.in')}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-indigo-900/30 border border-slate-700/60 hover:border-indigo-500/50 text-left transition-all group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 flex items-center gap-2">
                    <span>Prof. Vikram Patel</span>
                    <span className="font-mono text-[10px] text-slate-400">Acoe@sspu.ac.in</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Assistant Controller of Examinations (ACoE) · Super Admin
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ACOE
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('sarah.jenkins@university.edu')}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-emerald-900/30 border border-slate-700/60 hover:border-emerald-500/50 text-left transition-all group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                    Prof. Sarah Jenkins
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Exam Coordinator (Construction Engg & Mgmt)
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  COORDINATOR
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="mt-4 text-center flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>PostgreSQL Row-Level Security (RLS) Enforced</span>
        </div>
      </div>
    </div>
  );
};
