import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Shield, Calendar, DollarSign, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Policy } from '@/types';

interface PolicyCardProps {
  policy: Policy;
  onPress: () => void;
  compact?: boolean;
}

export default function PolicyCard({ policy, onPress, compact = false }: PolicyCardProps) {
  const daysUntilExpiry = Math.ceil(
    (new Date(policy.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry <= 0;

  const getStatusColor = () => {
    if (isExpired) return Colors.danger;
    if (isExpiringSoon) return Colors.warning;
    return Colors.success;
  };

  const getStatusText = () => {
    if (isExpired) return 'Expired';
    if (isExpiringSoon) return `${daysUntilExpiry} days left`;
    return 'Active';
  };

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactContainer} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.compactLeft}>
          <View style={[styles.carrierBadge, { backgroundColor: Colors.primaryLight }]}>
            <Shield size={16} color={Colors.textInverse} />
          </View>
          <View>
            <Text style={styles.compactCarrier}>{policy.carrier}</Text>
            <Text style={styles.compactVehicle}>
              {policy.vehicles[0]?.year} {policy.vehicles[0]?.make} {policy.vehicles[0]?.model}
            </Text>
          </View>
        </View>
        <ChevronRight size={20} color={Colors.textTertiary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.carrierInfo}>
          <View style={[styles.carrierLogo, { backgroundColor: Colors.primary }]}>
            <Shield size={24} color={Colors.textInverse} />
          </View>
          <View>
            <Text style={styles.carrier}>{policy.carrier}</Text>
            <Text style={styles.policyNumber}>#{policy.policyNumber}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
        </View>
      </View>

      <View style={styles.vehicleSection}>
        {policy.vehicles.map((vehicle, index) => (
          <Text key={vehicle.id} style={styles.vehicle}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </Text>
        ))}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <DollarSign size={16} color={Colors.textSecondary} />
          <Text style={styles.footerText}>${policy.premium}/mo</Text>
        </View>
        <View style={styles.footerItem}>
          <Calendar size={16} color={Colors.textSecondary} />
          <Text style={styles.footerText}>
            Exp: {new Date(policy.expirationDate).toLocaleDateString()}
          </Text>
        </View>
        <ChevronRight size={20} color={Colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  compactContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  carrierBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactCarrier: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  compactVehicle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  carrierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  carrierLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carrier: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  policyNumber: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  vehicleSection: {
    marginBottom: 16,
  },
  vehicle: {
    fontSize: 15,
    color: Colors.text,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
});
