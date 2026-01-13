/**
 * Case Stage & Status Constants
 * Single source of truth for case workflow stages
 */

export const CASE_STAGES = {
  IMPORTED: 'imported',
  AGREEMENT_SIGNED: 'agreement_signed',
  INFO_COMPLETED: 'info_completed',
  NOTARY_COMPLETED: 'notary_completed',
  PACKET_READY: 'packet_ready',
  FILED: 'filed',
  APPROVED: 'approved',
  PAID: 'paid',
  CLOSED: 'closed',
};

export const STAGE_LABELS = {
  [CASE_STAGES.IMPORTED]: "Imported",
  [CASE_STAGES.AGREEMENT_SIGNED]: "Agreement Signed",
  [CASE_STAGES.INFO_COMPLETED]: "Info Completed",
  [CASE_STAGES.NOTARY_COMPLETED]: "Notary Done",
  [CASE_STAGES.PACKET_READY]: "Packet Ready",
  [CASE_STAGES.FILED]: "Filed",
  [CASE_STAGES.APPROVED]: "Approved",
  [CASE_STAGES.PAID]: "Paid",
  [CASE_STAGES.CLOSED]: "Closed",
};

export const STAGE_COLORS = {
  [CASE_STAGES.IMPORTED]: "bg-slate-100 text-slate-700",
  [CASE_STAGES.AGREEMENT_SIGNED]: "bg-blue-100 text-blue-700",
  [CASE_STAGES.INFO_COMPLETED]: "bg-indigo-100 text-indigo-700",
  [CASE_STAGES.NOTARY_COMPLETED]: "bg-purple-100 text-purple-700",
  [CASE_STAGES.PACKET_READY]: "bg-amber-100 text-amber-700",
  [CASE_STAGES.FILED]: "bg-emerald-100 text-emerald-700",
  [CASE_STAGES.APPROVED]: "bg-green-100 text-green-700",
  [CASE_STAGES.PAID]: "bg-teal-100 text-teal-700",
  [CASE_STAGES.CLOSED]: "bg-slate-200 text-slate-600",
};

export const STAGE_PROGRESS = {
  [CASE_STAGES.IMPORTED]: 5,
  [CASE_STAGES.AGREEMENT_SIGNED]: 20,
  [CASE_STAGES.INFO_COMPLETED]: 35,
  [CASE_STAGES.NOTARY_COMPLETED]: 50,
  [CASE_STAGES.PACKET_READY]: 65,
  [CASE_STAGES.FILED]: 80,
  [CASE_STAGES.APPROVED]: 90,
  [CASE_STAGES.PAID]: 95,
  [CASE_STAGES.CLOSED]: 100,
};

export const CASE_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  FILED: 'filed',
  APPROVED: 'approved',
  PAID: 'paid',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
};

export const STATUS_COLORS = {
  [CASE_STATUS.ACTIVE]: "bg-emerald-500",
  [CASE_STATUS.PENDING]: "bg-amber-500",
  [CASE_STATUS.FILED]: "bg-blue-500",
  [CASE_STATUS.APPROVED]: "bg-green-500",
  [CASE_STATUS.PAID]: "bg-teal-500",
  [CASE_STATUS.CLOSED]: "bg-slate-400",
  [CASE_STATUS.ARCHIVED]: "bg-slate-300",
};