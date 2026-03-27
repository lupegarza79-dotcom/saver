import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { translations, Language, TranslationKeys } from '@/constants/i18n';
import { User, Policy, Document, Case, Reminder, AccidentReport, VideoEvidence, Agent, UserRole, IntakeStatus } from '@/types';
import { QuoteInput, MissingField } from '@/utils/quoteReadiness';

const STORAGE_KEYS = {
  USER: 'saver_user',
  LANGUAGE: 'saver_language',
  AUTH_TOKEN: 'saver_auth_token',
  POLICIES: 'saver_policies',
  DOCUMENTS: 'saver_documents',
  CASES: 'saver_cases',
  REMINDERS: 'saver_reminders',
  VIDEO_EVIDENCE: 'saver_video_evidence',
  USER_ROLE: 'saver_user_role',
  AGENT_PROFILE: 'saver_agent_profile',
  PENDING_INTAKE: 'saver_pending_intake',
  CONSENT_GIVEN: 'saver_consent_given',
};

export interface PendingIntake {
  leadId: string;
  intake: QuoteInput;
  missingFields: MissingField[];
  status: IntakeStatus;
  createdAt: string;
}

interface AppState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  userRole: UserRole;
  agentProfile: Agent | null;
  language: Language;
  t: TranslationKeys;
  policies: Policy[];
  documents: Document[];
  cases: Case[];
  reminders: Reminder[];
  accidentReports: AccidentReport[];
  videoEvidence: VideoEvidence[];
  pendingIntake: PendingIntake | null;
  consentGiven: boolean;
}

interface AppActions {
  setLanguage: (lang: Language) => void;
  login: (phone: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  setUserRole: (role: UserRole) => void;
  setAgentProfile: (agent: Agent | null) => void;
  addPolicy: (policy: Policy) => void;
  updatePolicy: (id: string, policy: Partial<Policy>) => void;
  addDocument: (doc: Document) => void;
  addCase: (caseData: Case) => void;
  updateCase: (id: string, caseData: Partial<Case>) => void;
  addReminder: (reminder: Reminder) => void;
  updateReminder: (id: string, reminder: Partial<Reminder>) => void;
  snoozeReminder: (id: string, days: number) => void;
  markReminderPaid: (id: string) => void;
  addAccidentReport: (report: AccidentReport) => void;
  updateAccidentReport: (id: string, report: Partial<AccidentReport>) => void;
  addVideoEvidence: (evidence: VideoEvidence) => void;
  getVideoEvidenceForPolicy: (policyId: string) => VideoEvidence | undefined;
  getVideoEvidenceForCase: (caseId: string) => VideoEvidence | undefined;
  setPendingIntake: (intake: PendingIntake | null) => void;
  updatePendingIntakeField: (key: string, value: unknown) => void;
  clearPendingIntake: () => void;
  setConsentGiven: (given: boolean) => void;
}

export const [AppProvider, useApp] = createContextHook((): AppState & AppActions => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRoleState] = useState<UserRole>('consumer');
  const [agentProfile, setAgentProfileState] = useState<Agent | null>(null);
  const [language, setLanguageState] = useState<Language>('en');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [accidentReports, setAccidentReports] = useState<AccidentReport[]>([]);
  const [videoEvidence, setVideoEvidence] = useState<VideoEvidence[]>([]);
  const [pendingIntake, setPendingIntakeState] = useState<PendingIntake | null>(null);
  const [consentGiven, setConsentGivenState] = useState(false);

  const t = useMemo(() => translations[language], [language]);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      console.log('[AppContext] Loading stored data...');
      const [storedLang, storedUser, storedPolicies, storedDocs, storedCases, storedReminders, storedVideoEvidence, storedRole, storedAgentProfile, storedPendingIntake, storedConsent] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
        AsyncStorage.getItem(STORAGE_KEYS.POLICIES),
        AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.CASES),
        AsyncStorage.getItem(STORAGE_KEYS.REMINDERS),
        AsyncStorage.getItem(STORAGE_KEYS.VIDEO_EVIDENCE),
        AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE),
        AsyncStorage.getItem(STORAGE_KEYS.AGENT_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.PENDING_INTAKE),
        AsyncStorage.getItem(STORAGE_KEYS.CONSENT_GIVEN),
      ]);

      if (storedLang) setLanguageState(storedLang as Language);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
      if (storedPolicies) setPolicies(JSON.parse(storedPolicies));
      if (storedDocs) setDocuments(JSON.parse(storedDocs));
      if (storedCases) setCases(JSON.parse(storedCases));
      if (storedReminders) setReminders(JSON.parse(storedReminders));
      if (storedVideoEvidence) setVideoEvidence(JSON.parse(storedVideoEvidence));
      if (storedRole) setUserRoleState(storedRole as UserRole);
      if (storedAgentProfile) setAgentProfileState(JSON.parse(storedAgentProfile));
      if (storedPendingIntake) setPendingIntakeState(JSON.parse(storedPendingIntake));
      if (storedConsent === 'true') setConsentGivenState(true);
      
      console.log('[AppContext] Data loaded successfully');
    } catch (error) {
      console.error('[AppContext] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    if (user) {
      const updatedUser = { ...user, language: lang };
      setUser(updatedUser);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    }
  }, [user]);

  const login = useCallback(async (phone: string, role: UserRole = 'consumer') => {
    console.log('[AppContext] Logging in with phone:', phone, 'role:', role);
    const newUser: User = {
      id: `user_${Date.now()}`,
      phone,
      preferredChannel: 'whatsapp',
      language,
      notifyOnlyIfSavings: true,
      notifyCoverageRisk: true,
      createdAt: new Date().toISOString(),
    };
    setUser(newUser);
    setUserRoleState(role);
    setIsAuthenticated(true);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
  }, [language]);

  const logout = useCallback(async () => {
    console.log('[AppContext] Logging out...');
    setUser(null);
    setIsAuthenticated(false);
    setUserRoleState('consumer');
    setAgentProfileState(null);
    setPolicies([]);
    setDocuments([]);
    setCases([]);
    setReminders([]);
    setAccidentReports([]);
    setVideoEvidence([]);
    setPendingIntakeState(null);
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
      AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.POLICIES),
      AsyncStorage.removeItem(STORAGE_KEYS.DOCUMENTS),
      AsyncStorage.removeItem(STORAGE_KEYS.CASES),
      AsyncStorage.removeItem(STORAGE_KEYS.REMINDERS),
      AsyncStorage.removeItem(STORAGE_KEYS.VIDEO_EVIDENCE),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE),
      AsyncStorage.removeItem(STORAGE_KEYS.AGENT_PROFILE),
      AsyncStorage.removeItem(STORAGE_KEYS.PENDING_INTAKE),
    ]);
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
  }, [user]);

  const setUserRole = useCallback(async (role: UserRole) => {
    setUserRoleState(role);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
  }, []);

  const setAgentProfile = useCallback(async (agent: Agent | null) => {
    setAgentProfileState(agent);
    if (agent) {
      await AsyncStorage.setItem(STORAGE_KEYS.AGENT_PROFILE, JSON.stringify(agent));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.AGENT_PROFILE);
    }
  }, []);

  const addPolicy = useCallback(async (policy: Policy) => {
    const updated = [...policies, policy];
    setPolicies(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(updated));
  }, [policies]);

  const updatePolicy = useCallback(async (id: string, updates: Partial<Policy>) => {
    const updated = policies.map(p => p.id === id ? { ...p, ...updates } : p);
    setPolicies(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(updated));
  }, [policies]);

  const addDocument = useCallback(async (doc: Document) => {
    const updated = [...documents, doc];
    setDocuments(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
  }, [documents]);

  const addCase = useCallback(async (caseData: Case) => {
    const updated = [...cases, caseData];
    setCases(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(updated));
  }, [cases]);

  const updateCase = useCallback(async (id: string, updates: Partial<Case>) => {
    const updated = cases.map(c => c.id === id ? { ...c, ...updates } : c);
    setCases(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(updated));
  }, [cases]);

  const addReminder = useCallback(async (reminder: Reminder) => {
    const updated = [...reminders, reminder];
    setReminders(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(updated));
  }, [reminders]);

  const updateReminder = useCallback(async (id: string, updates: Partial<Reminder>) => {
    const updated = reminders.map(r => r.id === id ? { ...r, ...updates } : r);
    setReminders(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(updated));
  }, [reminders]);

  const snoozeReminder = useCallback(async (id: string, days: number) => {
    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + days);
    await updateReminder(id, { status: 'snoozed', snoozeUntil: snoozeUntil.toISOString() });
  }, [updateReminder]);

  const markReminderPaid = useCallback(async (id: string) => {
    await updateReminder(id, { status: 'completed', paidAt: new Date().toISOString() });
  }, [updateReminder]);

  const addAccidentReport = useCallback((report: AccidentReport) => {
    setAccidentReports(prev => [...prev, report]);
  }, []);

  const updateAccidentReport = useCallback((id: string, updates: Partial<AccidentReport>) => {
    setAccidentReports(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const addVideoEvidence = useCallback(async (evidence: VideoEvidence) => {
    const updated = [...videoEvidence, evidence];
    setVideoEvidence(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.VIDEO_EVIDENCE, JSON.stringify(updated));
    console.log('[AppContext] Video evidence added:', evidence.id);
  }, [videoEvidence]);

  const getVideoEvidenceForPolicy = useCallback((policyId: string) => {
    return videoEvidence
      .filter(v => v.policyId === policyId && v.type === 'pre_inspection')
      .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())[0];
  }, [videoEvidence]);

  const getVideoEvidenceForCase = useCallback((caseId: string) => {
    return videoEvidence
      .filter(v => v.caseId === caseId && v.type === 'incident')
      .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())[0];
  }, [videoEvidence]);

  const setPendingIntake = useCallback(async (intake: PendingIntake | null) => {
    setPendingIntakeState(intake);
    if (intake) {
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_INTAKE, JSON.stringify(intake));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_INTAKE);
    }
    console.log('[AppContext] Pending intake set:', intake?.leadId);
  }, []);

  const updatePendingIntakeField = useCallback(async (key: string, value: unknown) => {
    if (!pendingIntake) return;
    
    const updatedIntake = { ...pendingIntake.intake };
    
    if (key === 'insuredFullName') updatedIntake.insuredFullName = value as string;
    else if (key === 'phone') updatedIntake.phone = value as string;
    else if (key === 'garagingAddress.zip') {
      updatedIntake.garagingAddress = { ...updatedIntake.garagingAddress, zip: value as string };
    }
    else if (key === 'coverageType') updatedIntake.coverageType = value as 'minimum' | 'full';
    else if (key === 'liabilityLimits') updatedIntake.liabilityLimits = value as string;
    else if (key === 'collisionDeductible') updatedIntake.collisionDeductible = value as number;
    else if (key === 'compDeductible') updatedIntake.compDeductible = value as number;
    else if (key.startsWith('vehicles[') && key.includes('.vin')) {
      const idx = parseInt(key.match(/\[(\d+)\]/)?.[1] || '0');
      if (!updatedIntake.vehicles) updatedIntake.vehicles = [];
      if (!updatedIntake.vehicles[idx]) updatedIntake.vehicles[idx] = {};
      updatedIntake.vehicles[idx].vin = value as string;
    }
    else if (key.startsWith('drivers[') && key.includes('.dob')) {
      const idx = parseInt(key.match(/\[(\d+)\]/)?.[1] || '0');
      if (!updatedIntake.drivers) updatedIntake.drivers = [];
      if (!updatedIntake.drivers[idx]) updatedIntake.drivers[idx] = {};
      updatedIntake.drivers[idx].dob = value as string;
    }
    else if (key.startsWith('drivers[') && key.includes('.fullName')) {
      const idx = parseInt(key.match(/\[(\d+)\]/)?.[1] || '0');
      if (!updatedIntake.drivers) updatedIntake.drivers = [];
      if (!updatedIntake.drivers[idx]) updatedIntake.drivers[idx] = {};
      updatedIntake.drivers[idx].fullName = value as string;
    }
    
    const { missingFields: missingFieldsFn, getIntakeStatus } = await import('@/utils/quoteReadiness');
    const newMissing = missingFieldsFn(updatedIntake);
    const newStatus = getIntakeStatus(updatedIntake);
    
    const updated: PendingIntake = {
      ...pendingIntake,
      intake: updatedIntake,
      missingFields: newMissing,
      status: newStatus,
    };
    
    setPendingIntakeState(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_INTAKE, JSON.stringify(updated));
    console.log('[AppContext] Pending intake field updated:', key, 'missing:', newMissing.length);
  }, [pendingIntake]);

  const clearPendingIntake = useCallback(async () => {
    setPendingIntakeState(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_INTAKE);
    console.log('[AppContext] Pending intake cleared');
  }, []);

  const setConsentGiven = useCallback(async (given: boolean) => {
    setConsentGivenState(given);
    await AsyncStorage.setItem(STORAGE_KEYS.CONSENT_GIVEN, given ? 'true' : 'false');
    console.log('[AppContext] Consent given set to:', given);
  }, []);

  return {
    isAuthenticated,
    isLoading,
    user,
    userRole,
    agentProfile,
    language,
    t,
    policies,
    documents,
    cases,
    reminders,
    accidentReports,
    videoEvidence,
    pendingIntake,
    consentGiven,
    setLanguage,
    login,
    logout,
    updateUser,
    setUserRole,
    setAgentProfile,
    addPolicy,
    updatePolicy,
    addDocument,
    addCase,
    updateCase,
    addReminder,
    updateReminder,
    snoozeReminder,
    markReminderPaid,
    addAccidentReport,
    updateAccidentReport,
    addVideoEvidence,
    getVideoEvidenceForPolicy,
    getVideoEvidenceForCase,
    setPendingIntake,
    updatePendingIntakeField,
    clearPendingIntake,
    setConsentGiven,
  };
});
