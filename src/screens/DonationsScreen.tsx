import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    ActivityIndicator,
    Modal,
    TextInput,
    Alert,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/types';
import { apiService, DonationCampaign, DonationRecord } from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';

type Props = BottomTabScreenProps<MainTabParamList, 'Donations'>;

export default function DonationsScreen({}: Props) {
    const { colors } = useTheme();
    const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
    const [myDonations, setMyDonations] = useState<DonationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<DonationCampaign | null>(null);
    const [amount, setAmount] = useState('10');
    const [donorName, setDonorName] = useState('');
    const [note, setNote] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [campaignData, donationData] = await Promise.all([
                apiService.getDonationCampaigns(),
                apiService.getMyDonations(),
            ]);
            setCampaigns(campaignData);
            setMyDonations(donationData);
        } catch (error: any) {
            Alert.alert('Erro', error?.message || 'Não foi possível carregar as campanhas.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const totalDonated = useMemo(
        () => myDonations.reduce((sum, donation) => sum + Number(donation.amount || 0), 0),
        [myDonations]
    );

    const closeModal = () => {
        setSelectedCampaign(null);
        setAmount('10');
        setDonorName('');
        setNote('');
    };

    const submitDonation = async () => {
        if (!selectedCampaign) {
            return;
        }

        const numericAmount = Number(amount.replace(',', '.'));
        if (!numericAmount || numericAmount <= 0) {
            Alert.alert('Valor inválido', 'Indica um montante superior a 0 EUR.');
            return;
        }

        try {
            setSaving(true);
            await apiService.createDonation({
                campaignId: selectedCampaign.id,
                amount: numericAmount,
                donorName: donorName.trim() || undefined,
                note: note.trim() || undefined,
            });
            closeModal();
            await fetchData();
            Alert.alert('Doação registada', 'A tua intenção de doação foi registada com sucesso.');
        } catch (error: any) {
            Alert.alert('Erro', error?.message || 'Não foi possível registar a doação.');
        } finally {
            setSaving(false);
        }
    };

    const renderCampaign = ({ item }: { item: DonationCampaign }) => {
        const progress = item.goal_amount > 0 ? Math.min(1, item.current_amount / item.goal_amount) : 0;

        return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardTitleWrap}>
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                            {item.place?.name || 'Instituição parceira'}
                        </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.badgeText, { color: colors.accent }]}>Ativa</Text>
                    </View>
                </View>

                {!!item.description && (
                    <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
                )}

                <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
                    <View style={[styles.progressBar, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
                </View>

                <View style={styles.amountRow}>
                    <Text style={[styles.amountMain, { color: colors.textPrimary }]}>{Number(item.current_amount).toFixed(2)} EUR</Text>
                    <Text style={[styles.amountGoal, { color: colors.textSecondary }]}>
                        meta {Number(item.goal_amount).toFixed(2)} EUR
                    </Text>
                </View>

                <Pressable onPress={() => setSelectedCampaign(item)}>
                    <View style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
                        <Ionicons name="heart" size={18} color="#fff" />
                        <Text style={styles.primaryButtonText}>Apoiar campanha</Text>
                    </View>
                </Pressable>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
            <FlatList
                data={campaigns}
                keyExtractor={(item) => item.id}
                renderItem={renderCampaign}
                ListHeaderComponent={
                    <View style={styles.headerWrap}>
                        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Doações</Text>
                        <Text style={[styles.headerText, { color: colors.textSecondary }]}>Apoia instituições parceiras e acompanha o teu contributo.</Text>

                        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total doado por ti</Text>
                            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{totalDonated.toFixed(2)} EUR</Text>
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Registos: {myDonations.length}</Text>
                        </View>

                        {myDonations.length > 0 && (
                            <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>Últimas doações</Text>
                                {myDonations.slice(0, 3).map((donation) => (
                                    <View key={donation.id} style={styles.historyRow}>
                                        <Text style={[styles.historyAmount, { color: colors.textPrimary }]}>{Number(donation.amount).toFixed(2)} EUR</Text>
                                        <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>Estado: {donation.status}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <Text style={[styles.headerText, { color: colors.textSecondary }]}>Ainda não existem campanhas ativas.</Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
            />

            <Modal visible={!!selectedCampaign} transparent animationType="slide" onRequestClose={closeModal}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{selectedCampaign?.title}</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Montante (EUR)</Text>
                            <TextInput
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="decimal-pad"
                                placeholder="10"
                                placeholderTextColor={colors.textMuted}
                                style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            />

                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nome do doador</Text>
                            <TextInput
                                value={donorName}
                                onChangeText={setDonorName}
                                placeholder="Opcional"
                                placeholderTextColor={colors.textMuted}
                                style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            />

                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nota</Text>
                            <TextInput
                                value={note}
                                onChangeText={setNote}
                                placeholder="Mensagem de apoio"
                                placeholderTextColor={colors.textMuted}
                                multiline
                                style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            />
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <Pressable onPress={closeModal} style={styles.modalButtonWrap}>
                                <View style={[styles.secondaryButton, { borderColor: colors.border }]}> 
                                    <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
                                </View>
                            </Pressable>
                            <Pressable onPress={submitDonation} style={styles.modalButtonWrap} disabled={saving}>
                                <View style={[styles.primaryButton, { backgroundColor: colors.primary }]}> 
                                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Confirmar</Text>}
                                </View>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    listContent: { paddingBottom: 40 },
    headerWrap: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
    headerTitle: { fontSize: 28, fontFamily: 'Poppins_700Bold', marginBottom: 6 },
    headerText: { fontSize: 14, lineHeight: 22, fontFamily: 'Poppins_400Regular' },
    summaryCard: { marginTop: 18, borderRadius: 22, borderWidth: 1, padding: 18 },
    summaryLabel: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
    summaryValue: { fontSize: 26, fontFamily: 'Poppins_700Bold', marginVertical: 8 },
    historyCard: { marginTop: 16, borderRadius: 22, borderWidth: 1, padding: 18 },
    historyTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', marginBottom: 10 },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    historyAmount: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
    historyMeta: { fontSize: 13, fontFamily: 'Poppins_400Regular' },
    card: { marginHorizontal: 20, marginTop: 16, borderRadius: 24, borderWidth: 1, padding: 18 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
    cardTitleWrap: { flex: 1 },
    cardTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
    cardSubtitle: { fontSize: 13, fontFamily: 'Poppins_500Medium', marginTop: 4 },
    badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    badgeText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
    description: { fontSize: 14, lineHeight: 22, fontFamily: 'Poppins_400Regular', marginBottom: 16 },
    progressTrack: { height: 10, borderRadius: 999, overflow: 'hidden', marginBottom: 12 },
    progressBar: { height: '100%' },
    amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    amountMain: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
    amountGoal: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
    primaryButton: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
    primaryButtonText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', padding: 20 },
    modalCard: { borderRadius: 28, borderWidth: 1, padding: 20, maxHeight: '80%' },
    modalTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 16 },
    fieldLabel: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', marginBottom: 8, marginTop: 8, textTransform: 'uppercase' },
    input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Poppins_400Regular' },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 18 },
    modalButtonWrap: { flex: 1 },
    secondaryButton: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    secondaryButtonText: { fontSize: 15, fontFamily: 'Poppins_700Bold' },
});