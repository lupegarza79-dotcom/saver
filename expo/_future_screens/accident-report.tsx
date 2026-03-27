import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { 
  AlertTriangle,
  CheckCircle,
  Circle,
  Camera,
  Phone,
  FileText,
  Send,
  Shield,
  Heart,
  Users,
  Image as ImageIcon,
  MapPin,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Car,
  Video,
  Play,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { AccidentReport } from '@/types';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: typeof AlertTriangle;
  completed: boolean;
}

const MAX_WIDTH = 1100;

export default function AccidentReportScreen() {
  const router = useRouter();
  const { t, policies, addAccidentReport, getVideoEvidenceForCase } = useApp();
  const { width: windowWidth } = useWindowDimensions();
  const [activeStep, setActiveStep] = useState<'checklist' | 'evidence' | 'submit'>('checklist');
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [otherDriverName, setOtherDriverName] = useState('');
  const [otherDriverPhone, setOtherDriverPhone] = useState('');
  const [otherDriverInsurance, setOtherDriverInsurance] = useState('');
  const [policeReportNumber, setPoliceReportNumber] = useState('');
  
  const [caseId] = useState(() => `roadside_${Date.now()}`);
  
  const incidentEvidence = useMemo(
    () => getVideoEvidenceForCase(caseId),
    [getVideoEvidenceForCase, caseId]
  );

  const isWeb = Platform.OS === 'web';
  const isWideScreen = windowWidth > 768;

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { 
      id: 'safety', 
      title: t.accident?.safetyFirst || 'Safety First', 
      description: t.accident?.safetyDesc || 'Check for injuries. Move to a safe spot if possible.', 
      icon: Heart, 
      completed: false 
    },
    { 
      id: 'emergency', 
      title: t.accident?.callEmergency || 'Call for Help', 
      description: t.accident?.callDesc || 'If anyone is hurt, dial 911 immediately.', 
      icon: Phone, 
      completed: false 
    },
    { 
      id: 'exchange', 
      title: t.accident?.exchangeInfo || 'Exchange Info', 
      description: t.accident?.exchangeDesc || "Get the other driver's name, phone & insurance.", 
      icon: Users, 
      completed: false 
    },
    { 
      id: 'photos', 
      title: t.accident?.takePhotos || 'Capture the Scene', 
      description: t.accident?.photosDesc || 'Photos of damage, plates, road conditions.', 
      icon: Camera, 
      completed: false 
    },
    { 
      id: 'police', 
      title: t.accident?.fileReport || 'Police Report', 
      description: t.accident?.reportDesc || 'File a report and keep the case number.', 
      icon: FileText, 
      completed: false 
    },
  ]);

  const toggleChecklistItem = (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const takePhoto = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera access is required');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      setPhotos(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  };

  const handleSubmit = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const report: AccidentReport = {
      id: `acc_${Date.now()}`,
      policyId: policies[0]?.id || '',
      createdAt: new Date().toISOString(),
      photos,
      otherDriverInfo: {
        name: otherDriverName,
        phone: otherDriverPhone,
        insurance: otherDriverInsurance,
      },
      policeReportNumber,
      notes,
      submittedToInsurance: false,
      checklistCompleted: {
        safety: checklist.find(c => c.id === 'safety')?.completed || false,
        emergency: checklist.find(c => c.id === 'emergency')?.completed || false,
        exchangeInfo: checklist.find(c => c.id === 'exchange')?.completed || false,
        photos: checklist.find(c => c.id === 'photos')?.completed || false,
        policeReport: checklist.find(c => c.id === 'police')?.completed || false,
      },
    };

    addAccidentReport(report);
    
    Alert.alert(
      'Report Saved',
      "Your report has been saved. We'll help you submit it to your insurance.",
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const completedCount = checklist.filter(c => c.completed).length;

  const tips = [
    { icon: MapPin, text: 'Note exact location (intersection, mile marker)' },
    { icon: Clock, text: 'Record date, time, and weather conditions' },
    { icon: Car, text: 'Get license plates of all vehicles involved' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlow} />
      <View style={styles.backgroundGlow2} />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={[styles.headerWrapper, isWeb && styles.webWrapper]}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ChevronLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <View style={styles.headerIconContainer}>
                <LinearGradient
                  colors={[Colors.accentOrange, Colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.headerIconGradient}
                >
                  <AlertTriangle size={18} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View>
                <Text style={styles.title}>{t.accident?.title || 'Roadside Kit'}</Text>
                <Text style={styles.subtitle}>{t.accident?.subtitle || "Stay calm. We'll guide you."}</Text>
              </View>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={[Colors.success, Colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${(completedCount / checklist.length) * 100}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{completedCount}/{checklist.length}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, isWeb && styles.webContentContainer]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentInner, isWeb && styles.webWrapper]}>
          <View style={styles.heroCard}>
            <LinearGradient
              colors={[Colors.accentOrange + '20', Colors.accentOrange + '05']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroBorder} />
              <Sparkles size={22} color={Colors.accentOrange} />
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>You&apos;ve got this</Text>
                <Text style={styles.heroSubtitle}>
                  Follow the checklist below to make sure you capture everything you need.
                </Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.tabs}>
            <View style={styles.tabsBorder} />
            {(['checklist', 'evidence', 'submit'] as const).map((tab) => {
              const isActive = activeStep === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, isActive && styles.activeTab]}
                  onPress={() => setActiveStep(tab)}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={[Colors.secondary, Colors.info]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.activeTabGradient}
                    >
                      <Text style={styles.activeTabText}>
                        {tab === 'checklist' ? (t.accident?.checklist || 'Checklist') : 
                         tab === 'evidence' ? (t.accident?.uploadEvidence || 'Evidence') : 
                         'Submit'}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.tabText}>
                      {tab === 'checklist' ? (t.accident?.checklist || 'Checklist') : 
                       tab === 'evidence' ? (t.accident?.uploadEvidence || 'Evidence') : 
                       'Submit'}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {activeStep === 'checklist' && (
            <View style={styles.checklistSection}>
              <View style={[styles.checklistGrid, isWideScreen && styles.checklistGridWide]}>
                {checklist.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.checklistItem, 
                        item.completed && styles.checklistItemCompleted,
                        isWideScreen && styles.checklistItemWide
                      ]}
                      onPress={() => toggleChecklistItem(item.id)}
                    >
                      <View style={[styles.checklistBorder, item.completed && styles.checklistBorderCompleted]} />
                      <View style={styles.checkbox}>
                        {item.completed ? (
                          <CheckCircle size={24} color={Colors.success} />
                        ) : (
                          <Circle size={24} color={Colors.textTertiary} />
                        )}
                      </View>
                      <View style={styles.checklistContent}>
                        <View style={styles.checklistHeader}>
                          <View style={[
                            styles.checklistIconContainer,
                            item.completed && styles.checklistIconCompleted
                          ]}>
                            <Icon size={16} color={item.completed ? Colors.success : Colors.textSecondary} />
                          </View>
                          <Text style={[styles.checklistTitle, item.completed && styles.checklistTitleCompleted]}>
                            {item.title}
                          </Text>
                        </View>
                        <Text style={styles.checklistDesc}>{item.description}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.tipsCard}>
                <View style={styles.tipsBorder} />
                <Text style={styles.tipsTitle}>Quick Tips</Text>
                {tips.map((tip, index) => {
                  const Icon = tip.icon;
                  return (
                    <View key={index} style={styles.tipRow}>
                      <Icon size={16} color={Colors.info} />
                      <Text style={styles.tipText}>{tip.text}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {activeStep === 'evidence' && (
            <View style={styles.evidenceSection}>
              <View style={styles.videoEvidenceCard}>
                <View style={styles.videoEvidenceBorder} />
                <Text style={styles.videoEvidenceTitle}>
                  {t.evidence?.evidenceSectionTitle || 'Evidence video (optional)'}
                </Text>
                <Text style={styles.videoEvidenceSubtitle}>
                  {t.evidence?.evidenceSectionSubtitle || 'Capture a short video of the scene and your vehicle. This helps with claims and documentation.'}
                </Text>
                
                {incidentEvidence ? (
                  <View style={styles.videoEvidenceAttached}>
                    <View style={styles.videoEvidencePreview}>
                      <Play size={20} color={Colors.secondary} />
                    </View>
                    <Text style={styles.videoEvidenceAttachedText}>
                      {incidentEvidence.durationSeconds}s • {new Date(incidentEvidence.capturedAt).toLocaleDateString()}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.videoEvidenceButton}
                    onPress={() => router.push(`/_future/evidence-wizard?caseId=${caseId}&type=incident` as any)}
                  >
                    <Video size={20} color={Colors.textInverse} />
                    <Text style={styles.videoEvidenceButtonText}>
                      {t.evidence?.evidenceRecordButton || 'Record evidence video'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={[styles.evidenceGrid, isWideScreen && styles.evidenceGridWide]}>
                <View style={[styles.photoSection, isWideScreen && styles.photoSectionWide]}>
                  <Text style={styles.sectionTitle}>{t.accident?.photos || 'Photos & Video'}</Text>
                  <View style={styles.photoGrid}>
                    <TouchableOpacity style={styles.addPhotoButton} onPress={takePhoto}>
                      <Camera size={28} color={Colors.secondary} />
                      <Text style={styles.addPhotoText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addPhotoButton} onPress={pickPhotos}>
                      <ImageIcon size={28} color={Colors.secondary} />
                      <Text style={styles.addPhotoText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                  {photos.length > 0 && (
                    <View style={styles.photoCountBadge}>
                      <CheckCircle size={14} color={Colors.success} />
                      <Text style={styles.photoCount}>{photos.length} photos added</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.formSection, isWideScreen && styles.formSectionWide]}>
                  <Text style={styles.sectionTitle}>{t.accident?.otherDriverInfo || 'Other Driver Info'}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor={Colors.textTertiary}
                    value={otherDriverName}
                    onChangeText={setOtherDriverName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="phone-pad"
                    value={otherDriverPhone}
                    onChangeText={setOtherDriverPhone}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Insurance Company"
                    placeholderTextColor={Colors.textTertiary}
                    value={otherDriverInsurance}
                    onChangeText={setOtherDriverInsurance}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>{t.accident?.policeReport || 'Police Report'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Report Number (if available)"
                  placeholderTextColor={Colors.textTertiary}
                  value={policeReportNumber}
                  onChangeText={setPoliceReportNumber}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>{t.accident?.notes || 'What Happened'}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe the incident in your own words..."
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </View>
          )}

          {activeStep === 'submit' && (
            <View style={styles.submitSection}>
              <View style={styles.summaryCard}>
                <LinearGradient
                  colors={[Colors.secondary + '20', Colors.secondary + '05']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.summaryGradient}
                >
                  <View style={styles.summaryBorder} />
                  <View style={styles.summaryIconContainer}>
                    <Shield size={40} color={Colors.secondary} />
                  </View>
                  <Text style={styles.summaryTitle}>Ready to Submit</Text>
                  <Text style={styles.summaryText}>
                    Your report will be sent to your insurance carrier for processing.
                  </Text>
                  
                  <View style={styles.summaryStats}>
                    <View style={styles.summaryStat}>
                      <Text style={styles.summaryStatValue}>{completedCount}/{checklist.length}</Text>
                      <Text style={styles.summaryStatLabel}>Checklist</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.summaryStat}>
                      <Text style={styles.summaryStatValue}>{photos.length}</Text>
                      <Text style={styles.summaryStatLabel}>Photos</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.summaryStat}>
                      <Text style={styles.summaryStatValue}>{otherDriverName ? '✓' : '—'}</Text>
                      <Text style={styles.summaryStatLabel}>Driver Info</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <LinearGradient
                  colors={[Colors.secondary, Colors.info]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  <Send size={20} color={Colors.textInverse} />
                  <Text style={styles.submitButtonText}>{t.accident?.submitClaim || 'Submit to Insurance'}</Text>
                  <ChevronRight size={20} color={Colors.textInverse} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundGlow: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: Colors.accentOrange,
    opacity: 0.04,
  },
  backgroundGlow2: {
    position: 'absolute',
    bottom: 100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.secondary,
    opacity: 0.03,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  headerWrapper: {
    paddingHorizontal: 20,
  },
  webWrapper: {
    maxWidth: MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
  },
  headerIconContainer: {
    marginRight: 14,
  },
  headerIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  webContentContainer: {
    paddingHorizontal: 0,
  },
  contentInner: {
    flex: 1,
  },
  heroCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 20,
  },
  heroGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 18,
    position: 'relative',
  },
  heroBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.accentOrange + '30',
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.accentOrange,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    position: 'relative',
  },
  tabsBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  activeTab: {
    padding: 0,
  },
  activeTabGradient: {
    flex: 1,
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  activeTabText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  checklistSection: {
    gap: 20,
  },
  checklistGrid: {
    gap: 12,
  },
  checklistGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  checklistBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  checklistBorderCompleted: {
    borderColor: Colors.success,
  },
  checklistItemWide: {
    width: 'calc(50% - 6px)' as any,
  },
  checklistItemCompleted: {
    backgroundColor: Colors.successLight,
  },
  checkbox: {
    marginTop: 2,
  },
  checklistContent: {
    flex: 1,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  checklistIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistIconCompleted: {
    backgroundColor: Colors.success + '20',
  },
  checklistTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  checklistTitleCompleted: {
    color: Colors.success,
  },
  checklistDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginLeft: 38,
  },
  tipsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  tipsBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  tipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  evidenceSection: {
    gap: 24,
  },
  evidenceGrid: {
    gap: 24,
  },
  evidenceGridWide: {
    flexDirection: 'row',
  },
  photoSection: {
    gap: 12,
  },
  photoSectionWide: {
    flex: 1,
  },
  formSectionWide: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  addPhotoButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    backgroundColor: Colors.secondary + '10',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.secondary + '30',
    borderStyle: 'dashed',
    gap: 8,
  },
  addPhotoText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.secondary,
  },
  photoCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoCount: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '500' as const,
  },
  formSection: {
    gap: 12,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  submitSection: {
    alignItems: 'center',
    gap: 24,
  },
  summaryCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  summaryGradient: {
    alignItems: 'center',
    padding: 32,
    position: 'relative',
  },
  summaryBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  summaryIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 300,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 28,
  },
  summaryStat: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.secondary,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  submitButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  bottomSpacer: {
    height: 40,
  },
  videoEvidenceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  videoEvidenceBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  videoEvidenceTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  videoEvidenceSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  videoEvidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  videoEvidenceButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  videoEvidenceAttached: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.secondary + '15',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  videoEvidencePreview: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoEvidenceAttachedText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.secondary,
  },
});
