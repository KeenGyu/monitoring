import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Absentee,
  ActivityEvent,
  ActivityType,
  AppSettings,
  ExportBundle,
  NewAbsenteeInput,
  NewReportInput,
  Report,
  ReportStatus,
  SubmissionInput,
} from "./types";
import * as db from "./lib/db";
import { makeId } from "./lib/id";
import { currentMonthKey, addMonths } from "./lib/dates";
import { randomSubmissionMessage } from "./lib/messages";

interface AppState {
  loading: boolean;
  reports: Report[];
  activity: ActivityEvent[];
  settings: AppSettings;
  absentees: Absentee[];
}

interface AppContextValue extends AppState {
  addReport: (input: NewReportInput) => Report;
  editReport: (id: string, input: NewReportInput) => void;
  deleteReport: (id: string) => void;
  setStatus: (id: string, status: ReportStatus) => void;
  submitReport: (id: string, input: SubmissionInput) => string;
  removeProof: (id: string) => void;
  updateMonitoringPeriod: (startMonth: string, endMonth: string) => void;
  updateProfile: (name: string, role: string) => void;
  addAbsentee: (input: NewAbsenteeInput) => Absentee;
  editAbsentee: (id: string, input: NewAbsenteeInput) => void;
  deleteAbsentee: (id: string) => void;
  exportData: () => ExportBundle;
  importData: (bundle: ExportBundle) => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function defaultSettings(): AppSettings {
  const start = currentMonthKey();
  return {
    monitoringPeriod: { startMonth: start, endMonth: addMonths(start, 2) },
    profile: { name: "Juan Dela Cruz", role: "QMS Staff" },
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    loading: true,
    reports: [],
    activity: [],
    settings: defaultSettings(),
    absentees: [],
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      db.loadReports(),
      db.loadActivity(),
      db.loadSettings(),
      db.loadAbsentees(),
    ]).then(([reports, activity, settings, absentees]) => {
      if (cancelled) return;
      const merged: AppSettings = settings
        ? { ...settings, profile: settings.profile ?? defaultSettings().profile }
        : defaultSettings();
      setState({
        loading: false,
        reports,
        activity: activity.sort((a, b) =>
          b.timestamp.localeCompare(a.timestamp)
        ),
        settings: merged,
        absentees,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const logActivity = useCallback(
    (
      report: Pick<Report, "id" | "name">,
      type: ActivityType,
      message: string,
      detail?: string
    ) => {
      const event: ActivityEvent = {
        id: makeId(),
        timestamp: new Date().toISOString(),
        reportId: report.id,
        reportName: report.name,
        type,
        message,
        detail,
      };
      db.putActivityEvent(event);
      setState((s) => ({ ...s, activity: [event, ...s.activity] }));
    },
    []
  );

  const addReport = useCallback(
    (input: NewReportInput): Report => {
      const now = new Date().toISOString();
      const report: Report = {
        id: makeId(),
        name: input.name.trim(),
        category: input.category.trim(),
        description: input.description.trim(),
        status: "not-started",
        createdAt: now,
        dueDate: input.dueDate,
        monitoringStart: input.monitoringStart,
        monitoringEnd: input.monitoringEnd,
        supervisor: input.supervisor.trim(),
        proofRequired: input.proofRequired,
        proofImage: null,
        funnyReactionImage: input.funnyReactionImage ?? null,
        submittedAt: null,
        submissionNotes: "",
      };
      db.putReport(report);
      setState((s) => ({ ...s, reports: [...s.reports, report] }));
      logActivity(report, "created", `${report.name} was added to tracking.`);
      return report;
    },
    [logActivity]
  );

  const editReport = useCallback(
    (id: string, input: NewReportInput) => {
      setState((s) => {
        const existing = s.reports.find((r) => r.id === id);
        if (!existing) return s;
        const updated: Report = {
          ...existing,
          name: input.name.trim(),
          category: input.category.trim(),
          description: input.description.trim(),
          dueDate: input.dueDate,
          monitoringStart: input.monitoringStart,
          monitoringEnd: input.monitoringEnd,
          supervisor: input.supervisor.trim(),
          proofRequired: input.proofRequired,
          funnyReactionImage: input.funnyReactionImage ?? existing.funnyReactionImage,
        };
        db.putReport(updated);
        logActivity(updated, "edited", `${updated.name} details were updated.`);
        return {
          ...s,
          reports: s.reports.map((r) => (r.id === id ? updated : r)),
        };
      });
    },
    [logActivity]
  );

  const deleteReport = useCallback(
    (id: string) => {
      setState((s) => {
        const existing = s.reports.find((r) => r.id === id);
        if (existing) {
          db.deleteReportRecord(id);
          logActivity(existing, "deleted", `${existing.name} was removed.`);
        }
        return { ...s, reports: s.reports.filter((r) => r.id !== id) };
      });
    },
    [logActivity]
  );

  const setStatus = useCallback(
    (id: string, status: ReportStatus) => {
      setState((s) => {
        const existing = s.reports.find((r) => r.id === id);
        if (!existing || existing.status === status) return s;
        const updated: Report = { ...existing, status };
        db.putReport(updated);
        logActivity(
          updated,
          "status-changed",
          `${updated.name} moved to ${status.replace("-", " ")}.`
        );
        return {
          ...s,
          reports: s.reports.map((r) => (r.id === id ? updated : r)),
        };
      });
    },
    [logActivity]
  );

  const submitReport = useCallback(
    (id: string, input: SubmissionInput): string => {
      const message = randomSubmissionMessage();
      setState((s) => {
        const existing = s.reports.find((r) => r.id === id);
        if (!existing) return s;
        const updated: Report = {
          ...existing,
          status: "submitted",
          submittedAt: input.submittedAt,
          supervisor: input.supervisor || existing.supervisor,
          submissionNotes: input.submissionNotes,
          proofImage: input.proofImage ?? existing.proofImage,
        };
        db.putReport(updated);
        logActivity(updated, "submitted", "Submitted to supervisor.", message);
        return {
          ...s,
          reports: s.reports.map((r) => (r.id === id ? updated : r)),
        };
      });
      return message;
    },
    [logActivity]
  );

  const removeProof = useCallback(
    (id: string) => {
      setState((s) => {
        const existing = s.reports.find((r) => r.id === id);
        if (!existing) return s;
        const updated: Report = { ...existing, proofImage: null };
        db.putReport(updated);
        logActivity(updated, "proof-removed", `Proof removed from ${updated.name}.`);
        return {
          ...s,
          reports: s.reports.map((r) => (r.id === id ? updated : r)),
        };
      });
    },
    [logActivity]
  );

  const updateMonitoringPeriod = useCallback(
    (startMonth: string, endMonth: string) => {
      setState((s) => {
        const settings: AppSettings = {
          ...s.settings,
          monitoringPeriod: { startMonth, endMonth },
        };
        db.putSettings(settings);
        return { ...s, settings };
      });
    },
    []
  );

  const updateProfile = useCallback((name: string, role: string) => {
    setState((s) => {
      const settings: AppSettings = {
        ...s.settings,
        profile: { name: name.trim(), role: role.trim() },
      };
      db.putSettings(settings);
      return { ...s, settings };
    });
  }, []);

  const addAbsentee = useCallback((input: NewAbsenteeInput): Absentee => {
    const absentee: Absentee = {
      id: makeId(),
      employeeName: input.employeeName.trim(),
      department: input.department.trim(),
      date: input.date,
      type: input.type,
      remarks: input.remarks.trim(),
      status: input.status,
      createdAt: new Date().toISOString(),
      minutes: input.minutes,
      deductFromSalary: input.deductFromSalary,
    };
    db.putAbsentee(absentee);
    setState((s) => ({ ...s, absentees: [...s.absentees, absentee] }));
    return absentee;
  }, []);

  const editAbsentee = useCallback((id: string, input: NewAbsenteeInput) => {
    setState((s) => {
      const existing = s.absentees.find((a) => a.id === id);
      if (!existing) return s;
      const updated: Absentee = {
        ...existing,
        employeeName: input.employeeName.trim(),
        department: input.department.trim(),
        date: input.date,
        type: input.type,
        remarks: input.remarks.trim(),
        status: input.status,
        // Assigned directly (no fallback to existing) so switching a record
        // from Late to Sick Leave, say, clears the stale minutes/deduct flag.
        minutes: input.minutes,
        deductFromSalary: input.deductFromSalary,
      };
      db.putAbsentee(updated);
      return {
        ...s,
        absentees: s.absentees.map((a) => (a.id === id ? updated : a)),
      };
    });
  }, []);

  const deleteAbsentee = useCallback((id: string) => {
    setState((s) => {
      db.deleteAbsenteeRecord(id);
      return { ...s, absentees: s.absentees.filter((a) => a.id !== id) };
    });
  }, []);

  const exportData = useCallback((): ExportBundle => {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      reports: state.reports,
      activity: state.activity,
      settings: state.settings,
      absentees: state.absentees,
    };
  }, [state.reports, state.activity, state.settings, state.absentees]);

  const importData = useCallback((bundle: ExportBundle) => {
    db.putAllReports(bundle.reports);
    db.putAllActivity(bundle.activity);
    db.putSettings(bundle.settings);
    db.putAllAbsentees(bundle.absentees ?? []);
    setState({
      loading: false,
      reports: bundle.reports,
      activity: [...bundle.activity].sort((a, b) =>
        b.timestamp.localeCompare(a.timestamp)
      ),
      settings: bundle.settings,
      absentees: bundle.absentees ?? [],
    });
  }, []);

  const clearAllData = useCallback(() => {
    db.clearAllData();
    setState({
      loading: false,
      reports: [],
      activity: [],
      settings: defaultSettings(),
      absentees: [],
    });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      addReport,
      editReport,
      deleteReport,
      setStatus,
      submitReport,
      removeProof,
      updateMonitoringPeriod,
      updateProfile,
      addAbsentee,
      editAbsentee,
      deleteAbsentee,
      exportData,
      importData,
      clearAllData,
    }),
    [
      state,
      addReport,
      editReport,
      deleteReport,
      setStatus,
      submitReport,
      removeProof,
      updateMonitoringPeriod,
      updateProfile,
      addAbsentee,
      editAbsentee,
      deleteAbsentee,
      exportData,
      importData,
      clearAllData,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}