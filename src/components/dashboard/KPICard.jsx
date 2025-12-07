import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export default function KPICard({ title, value, icon: Icon, href, color, delay = 0 }) {
  const colorClasses = {
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/25",
    orange: "from-orange-500 to-orange-600 shadow-orange-500/25",
    blue: "from-blue-500 to-blue-600 shadow-blue-500/25",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/25",
    rose: "from-rose-500 to-rose-600 shadow-rose-500/25",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/25",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Link to={createPageUrl(href)}>
        <div className="group relative bg-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
          {/* Background gradient on hover */}
          <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
          
          {/* Icon */}
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg flex items-center justify-center mb-4`}>
            <Icon className="w-6 h-6 text-white" />
          </div>

          {/* Content */}
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>

          {/* Arrow indicator */}
          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="w-5 h-5 text-slate-400" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}