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
    ScrollView,
    Linking,
    Dimensions,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CustomAlertModal from '../components/CustomAlertModal';
import { useNavigation } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { apiService, DonationCampaign, DonationRecord } from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { CampaignCard } from '../components/donations/CampaignCard';
import { OrganizationCard } from '../components/donations/OrganizationCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Donations'>;

const { width } = Dimensions.get('window');
const ORG_CARD_WIDTH = width * 0.75;

const NATIONAL_ORGS = [
    {
        id: 'org1',
        name: 'Vencer Autismo',
        desc: 'Promove a compreensão e aceitação do Autismo em Portugal através de palestras e mentoria gratuita.',
        url: 'https://vencerautismo.org/',
        color: '#007AFF',
        icon: 'heart-circle'
    },
    {
        id: 'org2',
        name: 'APPDA',
        desc: 'Defesa acérrima dos direitos e apoio integrado e especializado a pessoas com Autismo e famílias.',
        url: 'https://www.appda-lisboa.org.pt/',
        color: '#AF52DE',
        icon: 'people-circle'
    },
    {
        id: 'org3',
        name: 'APSA',
        desc: 'Associação de Síndrome de Asperger focada em promover a empregabilidade, autonomia e integração.',
        url: 'https://www.apsa.org.pt/',
        color: '#34C759',
        icon: 'briefcase'
    },
    {
        id: 'org4',
        name: 'Inovar Autismo',
        desc: 'Luta pela inclusão plena na sociedade, garantindo a autodeterminação e capacitação.',
        url: 'https://inovarautismo.pt/',
        color: '#FF9500',
        icon: 'rocket'
    }
];

export default function DonationsScreen({}: Props) {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<any>();
    const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
    const [myDonations, setMyDonations] = useState<DonationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<DonationCampaign | null>(null);
    const [amount, setAmount] = useState('10');
    const [donorName, setDonorName] = useState('');
    const [note, setNote] = useState('');
    const [alertState, setAlertState] = useState({ visible: false, title: '', message: '', icon: undefined as any, iconColor: undefined as any, primaryButton: undefined as any });
    const closeAlert = () => setAlertState(s => ({ ...s, visible: false }));
    const showAlert = (config: Omit<typeof alertState, 'visible'>) => setAlertState({ ...config, visible: true });

    const fetchData = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            const [campaignData, donationData] = await Promise.all([
                apiService.getDonationCampaigns(),
                apiService.getMyDonations(),
            ]);
            setCampaigns(campaignData);
            setMyDonations(donationData);
        } catch (error: any) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
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
        if (!selectedCampaign) return;

        const numericAmount = Number(amount.replace(',', '.'));
        if (!numericAmount || numericAmount <= 0) {
            showAlert({ title: 'Valor inválido', message: 'Indica um montante superior a 0 EUR.', icon: 'alert-circle', iconColor: '#f59e0b', primaryButton: undefined });
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
            showAlert({ title: 'Doação registada!', message: 'Obrigado pelo teu contributo incrivelmente valioso.', icon: 'heart', iconColor: '#ef4444', primaryButton: undefined });
        } catch (error: any) {
            showAlert({ title: 'Erro', message: error?.message || 'Não foi possível registar a doação.', icon: 'alert-circle', iconColor: '#ef4444', primaryButton: undefined });
        } finally {
            setSaving(false);
        }
    };



    const renderCampaign = ({ item }: { item: DonationCampaign }) => (
        <CampaignCard item={item} onDonate={setSelectedCampaign} />
    );

    const ListHeader = () => (
        <View style={styles.headerContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 20 }}>
                <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 8, marginLeft: -8 }}>
                    <Ionicons name="chevron-back" size={28} color={colors.primary} />
                </Pressable>
                <View style={styles.pageTitleWrap}>
                    <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Impacto</Text>
                    <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>Faz a diferença na comunidade autista.</Text>
                </View>
            </View>

            {/* Impact Summary Card */}
            <View style={[styles.impactCard, { backgroundColor: colors.primary }]}>
                <View style={styles.impactCardBg1} />
                <View style={styles.impactCardBg2} />
                <View style={styles.impactCardContent}>
                    <Text style={styles.impactLabel}>O MEU IMPACTO</Text>
                    <Text style={styles.impactValue}>{totalDonated.toFixed(2)}€</Text>
                    <View style={styles.impactRow}>
                        <View style={styles.impactPill}>
                            <Ionicons name="receipt" size={14} color={colors.primary} />
                            <Text style={[styles.impactPillText, { color: colors.primary }]}>{myDonations.length} donativos</Text>
                        </View>
                        <Text style={styles.impactThanks}>Obrigado pelo apoio! 🌟</Text>
                    </View>
                </View>
            </View>

            {/* National Organizations Section */}
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Associações Nacionais</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Apoie organizações nacionais.</Text>
            </View>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.orgsScrollContent}
                snapToInterval={ORG_CARD_WIDTH + 16}
                decelerationRate="fast"
            >
                {NATIONAL_ORGS.map((org, index) => (
                    <View key={org.id} style={{ marginLeft: index === 0 ? 20 : 0 }}>
                        <OrganizationCard org={org} />
                    </View>
                ))}
            </ScrollView>

            <View style={[styles.sectionHeader, { marginTop: 32 }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Campanhas da Comunidade</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Causas pontuais de locais parceiros.</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
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
                ListHeaderComponent={ListHeader}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchData(true)}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Ionicons name="leaf-outline" size={48} color={colors.border} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            De momento não existem campanhas locais ativas.
                        </Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            {/* Modal de Doação */}
            <Modal visible={!!selectedCampaign} transparent animationType="slide" onRequestClose={closeModal}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.modalHandle} />
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Apoiar Campanha</Text>
                        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{selectedCampaign?.title}</Text>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.amountInputWrap}>
                                <Text style={[styles.amountCurrency, { color: colors.textPrimary }]}>€</Text>
                                <TextInput
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textMuted}
                                    style={[styles.amountInput, { color: colors.textPrimary }]}
                                    autoFocus
                                />
                            </View>

                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TEU NOME (OPCIONAL)</Text>
                            <TextInput
                                value={donorName}
                                onChangeText={setDonorName}
                                placeholder="Como queres ser reconhecido?"
                                placeholderTextColor={colors.textMuted}
                                style={[styles.input, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', color: colors.textPrimary }]}
                            />

                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>MENSAGEM (OPCIONAL)</Text>
                            <TextInput
                                value={note}
                                onChangeText={setNote}
                                placeholder="Deixa uma palavra de apoio..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                                style={[styles.input, styles.textArea, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', color: colors.textPrimary }]}
                            />
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <Pressable onPress={closeModal} style={[styles.modalBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
                            </Pressable>
                            <Pressable onPress={submitDonation} style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 2 }]} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" /> : (
                                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>Confirmar Doação</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <CustomAlertModal
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                icon={alertState.icon}
                iconColor={alertState.iconColor}
                primaryButton={alertState.primaryButton}
                onClose={closeAlert}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingBottom: 40 },
    headerContainer: { paddingTop: 40, paddingBottom: 24 },
    pageTitleWrap: { flex: 1 },
    pageTitle: { fontSize: 32, fontFamily: 'Poppins_700Bold', letterSpacing: -0.5 },
    pageSubtitle: { fontSize: 15, fontFamily: 'Poppins_400Regular', marginTop: -2 },
    
    impactCard: {
        marginHorizontal: 20,
        borderRadius: 24,
        overflow: 'hidden',
        padding: 24,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    impactCardBg1: { position: 'absolute', top: -50, right: -20, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.1)' },
    impactCardBg2: { position: 'absolute', bottom: -40, left: -40, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' },
    impactCardContent: { position: 'relative', zIndex: 2 },
    impactLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Poppins_700Bold', letterSpacing: 1 },
    impactValue: { color: '#fff', fontSize: 40, fontFamily: 'Poppins_700Bold', marginVertical: 8, letterSpacing: -1 },
    impactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    impactPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, gap: 6 },
    impactPillText: { fontSize: 13, fontFamily: 'Poppins_700Bold' },
    impactThanks: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontFamily: 'Poppins_500Medium', flexShrink: 1, marginLeft: 8, textAlign: 'right' },

    sectionHeader: { paddingHorizontal: 20, marginTop: 32, marginBottom: 4 },
    sectionTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold' },
    sectionSubtitle: { fontSize: 14, fontFamily: 'Poppins_400Regular' },
    
    orgsScrollContent: { paddingRight: 20, paddingVertical: 12, gap: 16 },

    emptyWrap: { alignItems: 'center', justifyContent: 'center', padding: 40, opacity: 0.6 },
    emptyText: { fontSize: 14, fontFamily: 'Poppins_500Medium', textAlign: 'center', marginTop: 12 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
    modalHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#C7C7CC', alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 24, fontFamily: 'Poppins_700Bold', textAlign: 'center' },
    modalSubtitle: { fontSize: 14, fontFamily: 'Poppins_500Medium', textAlign: 'center', marginBottom: 24 },
    
    amountInputWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
    amountCurrency: { fontSize: 32, fontFamily: 'Poppins_700Bold', marginRight: 8 },
    amountInput: { fontSize: 48, fontFamily: 'Poppins_700Bold', minWidth: 100, textAlign: 'center' },
    
    fieldLabel: { fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
    input: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: 'Poppins_400Regular', marginBottom: 20 },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 10, paddingBottom: 20 },
    modalBtn: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    modalBtnText: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
});