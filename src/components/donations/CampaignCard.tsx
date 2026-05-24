import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DonationCampaign } from '../../services/apiService';
import { useTheme } from '../../contexts/ThemeContext';

interface CampaignCardProps {
    item: DonationCampaign;
    onDonate: (campaign: DonationCampaign) => void;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({ item, onDonate }) => {
    const { colors, isDark } = useTheme();
    const progress = item.goal_amount > 0 ? Math.min(1, item.current_amount / item.goal_amount) : 0;

    return (
        <View style={[styles.campaignCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            <View style={styles.campaignHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.campaignTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <View style={styles.campaignPlaceRow}>
                        <Ionicons name="location" size={14} color={colors.textSecondary} />
                        <Text style={[styles.campaignPlace, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.place?.name || 'Comunidade local'}
                        </Text>
                    </View>
                </View>
            </View>

            {!!item.description && (
                <Text style={[styles.campaignDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.description}
                </Text>
            )}

            <View style={styles.progressWrap}>
                <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                    <View style={[styles.progressBar, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
                </View>
                <View style={styles.amountRow}>
                    <Text style={[styles.amountText, { color: colors.textPrimary, fontFamily: 'Poppins_700Bold' }]}>
                        {Number(item.current_amount).toFixed(0)}€ <Text style={{ fontSize: 11, fontFamily: 'Poppins_400Regular', color: colors.textSecondary }}>angariados</Text>
                    </Text>
                    <Text style={[styles.amountText, { color: colors.textSecondary }]}>
                        Objetivo: {Number(item.goal_amount).toFixed(0)}€
                    </Text>
                </View>
            </View>

            <Pressable
                style={({ pressed }) => [styles.donateBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                onPress={() => onDonate(item)}
            >
                <Text style={styles.donateBtnText}>Doar Agora</Text>
                <Ionicons name="heart" size={16} color="#fff" style={{ marginLeft: 6 }} />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    campaignCard: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    campaignHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    campaignTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', lineHeight: 24 },
    campaignPlaceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    campaignPlace: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
    campaignDesc: { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 22, marginBottom: 16 },
    progressWrap: { marginBottom: 20 },
    progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    progressBar: { height: '100%', borderRadius: 4 },
    amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    amountText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
    donateBtn: { paddingVertical: 14, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    donateBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },
});
