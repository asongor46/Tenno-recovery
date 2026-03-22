import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg";

export default function PageNotFound() {
    const { data: authData } = useQuery({
        queryKey: ['user404'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch {
                return { user: null, isAuthenticated: false };
            }
        }
    });

    const isAuthenticated = authData?.isAuthenticated;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-8">
                <img src={LOGO} alt="TENNO RECOVERY" className="h-10 w-auto mx-auto" />

                <div className="space-y-3">
                    <h1 className="text-8xl font-bold text-slate-700">404</h1>
                    <h2 className="text-2xl font-semibold text-white">Page Not Found</h2>
                    <p className="text-slate-400">This page doesn't exist or you don't have access.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {isAuthenticated ? (
                        <Link to={createPageUrl("Dashboard")}>
                            <button className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors">
                                Go to Dashboard
                            </button>
                        </Link>
                    ) : null}
                    <Link to="/">
                        <button className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium rounded-lg transition-colors">
                            Back to Home
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}