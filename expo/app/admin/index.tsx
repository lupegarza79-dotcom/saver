import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Inbox,
  Search,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';

const WHATSAPP_NUMBER = '+19567738844';

function hapticFeedback() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export default function AdminHubScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const statsQuery = trpc.adminOps.getStats.useQuery({});
  const stats = statsQuery.data?.summary;

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await statsQuery.refetch();
    setRefreshing(false);
  }, [statsQuery]);

  const handleNavigate = (path: string) => {
    hapticFeedback();
    router.push(path as any);
  };

  const handleOpenWhatsApp = () => {
    hapticFeedback();
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.secondary}
          />
        }
      >
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderLeftColor: Colors.info }]}>
            <Users size={20} color={Colors.info} />
            <Text style={styles.statValue}>{stats?.totalLeads || 0}</Text>
            <Text style={styles.statLabel}>Total Leads</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.success }]}>
            <CheckCircle size={20} color={Colors.success} />
            <Text style={styles.statValue}>{stats?.readyToQuote || 0}</Text>
            <Text style={styles.statLabel}>Ready to Quote</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
            <Clock size={20} color={Colors.warning} />
            <Text style={styles.statValue}>{stats?.needsInfo || 0}</Text>
            <Text style={styles.statLabel}>Needs Info</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.textTertiary }]}>
            <AlertCircle size={20} color={Colors.textTertiary} />
            <Text style={styles.statValue}>{stats?.waitingDocs || 0}</Text>
            <Text style={styles.statLabel}>Waiting Docs</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.menuList}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNavigate('/admin/inbox')}
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.secondary + '15' }]}>
              <Inbox size={22} color={Colors.secondary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Inbox</Text>
              <Text style={styles.menuSubtitle}>View all leads and quote requests</Text>
            </View>
            <ChevronRight size={20} color={Colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNavigate('/admin/search')}
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.info + '15' }]}>
              <Search size={22} color={Colors.info} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Search</Text>
              <Text style={styles.menuSubtitle}>Find leads by phone or ID</Text>
            </View>
            <ChevronRight size={20} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Quote Requests</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statSmall, { borderLeftColor: Colors.info }]}>
            <Text style={styles.statSmallValue}>{stats?.totalQuoteRequests || 0}</Text>
            <Text style={styles.statSmallLabel}>Total</Text>
          </View>
          <View style={[styles.statSmall, { borderLeftColor: Colors.success }]}>
            <Text style={styles.statSmallValue}>{stats?.completedQuotes || 0}</Text>
            <Text style={styles.statSmallLabel}>Completed</Text>
          </View>
          <View style={[styles.statSmall, { borderLeftColor: Colors.warning }]}>
            <Text style={styles.statSmallValue}>{stats?.pendingQuotes || 0}</Text>
            <Text style={styles.statSmallLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.whatsappBanner}>
          <MessageCircle size={24} color={Colors.success} />
          <View style={styles.whatsappContent}>
            <Text style={styles.whatsappTitle}>WhatsApp Support</Text>
            <Text style={styles.whatsappNumber}>{WHATSAPP_NUMBER}</Text>
          </View>
          <TouchableOpacity style={styles.whatsappBtn} onPress={handleOpenWhatsApp}>
            <ExternalLink size={18} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    gap: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  menuList: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  menuSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statSmall: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    alignItems: 'center',
  },
  statSmallValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statSmallLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  whatsappBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '15',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  whatsappContent: {
    flex: 1,
  },
  whatsappTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  whatsappNumber: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  whatsappBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
