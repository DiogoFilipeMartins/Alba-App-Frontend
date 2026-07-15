import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    Pressable, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import CustomAlertModal from '../components/CustomAlertModal';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfessionalProfile'>;
type Institution = { id: string; full_name: string; specialty: string | null; verified: boolean; city: string | null };

export default function EditProfessionalProfileScreen({ navigation, route }: Props) {
    const { colors, isDark } = useTheme();
    const { profile, refreshProfile, isProfessional, isInstitution } = useAuth();

    const [specialty, setSpecialty] = useState(profile?.specialty || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [website, setWebsite] = useState(profile?.website || '');
    const [services, setServices] = useState(profile?.services || '');
    const [hours, setHours] = useState(profile?.hours || '');
    const [experience, setExperience] = useState(profile?.experience || '');
    const [saving, setSaving] = useState(false);

    // Associação / localização
    const [requests, setRequests] = useState<any[]>([]);
    const [associatedPros, setAssociatedPros] = useState<any[]>([]);
    const [loadingAssoc, setLoadingAssoc] = useState(false);
    const [respondingId, setRespondingId] = useState<string | null>(null);

    // Picker de instituição (profissional a pedir associação)
    const [instModal, setInstModal] = useState(false);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [instLoading, setInstLoading] = useState(false);
    const [instSearch, setInstSearch] = useState('');

    // Definir localização própria
    const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [locCity, setLocCity] = useState('');
    const [locAddress, setLocAddress] = useState('');
    const [savingPlace, setSavingPlace] = useState(false);

    const [alertState, setAlertState] = useState({ visible: false, title: '', message: '', icon: undefined as any, iconColor: undefined as any, primaryButton: undefined as any });
    const closeAlert = () => setAlertState(s => ({ ...s, visible: false }));
    const showAlert = (config: Omit<typeof alertState, 'visible'>) => setAlertState({ ...config, visible: true });

    const verified = profile?.verified === true;
    const accentColor = isProfessional ? '#0ebd5f' : '#7c3aed';
    const iconName: any = isProfessional ? 'medkit' : 'business';

    const affiliated = !!profile?.institution_id;
    const myPendingRequest = isProfessional ? requests.find(r => r.status === 'pending') : null;
    const hasOwnPlace = !!profile?.claimed_place_id;

    // Carrega pedidos de associação e profissionais associados.
    const loadAssoc = useCallback(async () => {
        if (!profile?.id) return;
        setLoadingAssoc(true);
        try {
            if (isInstitution) {
                const [pending, pros] = await Promise.all([
                    apiService.getAssociationRequests('pending'),
                    apiService.getInstitutionProfessionals(profile.id),
                ]);
                setRequests(pending || []);
                setAssociatedPros(pros || []);
            } else if (isProfessional) {
                const reqs = await apiService.getAssociationRequests();
                setRequests(reqs || []);
            }
        } catch (_) { /* silencioso */ } finally {
            setLoadingAssoc(false);
        }
    }, [profile?.id, isInstitution, isProfessional]);

    useFocusEffect(useCallback(() => { loadAssoc(); }, [loadAssoc]));

    // Coordenadas devolvidas pelo MapPicker.
    useEffect(() => {
        const coords = route.params?.pickedCoords;
        if (coords) {
            setPendingCoords(coords);
            navigation.setParams({ pickedCoords: undefined });
        }
    }, [route.params?.pickedCoords]);

    const handleSave = async () => {
        try {
            setSaving(true);
            await apiService.updateProfile({
                specialty: specialty.trim() || undefined,
                bio: bio.trim() || undefined,
                website: website.trim() || undefined,
                services: services.trim() || undefined,
                hours: hours.trim() || undefined,
                experience: experience.trim() || undefined,
            });
            await refreshProfile();
            showAlert({ title: 'Guardado', message: 'O teu perfil foi atualizado.', icon: 'checkmark-circle', iconColor: '#22c55e', primaryButton: { text: 'OK', onPress: () => navigation.goBack() } });
        } catch (e: any) {
            showAlert({ title: 'Erro', message: e.message || 'Não foi possível guardar as alterações.', icon: 'alert-circle', iconColor: '#ef4444', primaryButton: undefined });
        } finally {
            setSaving(false);
        }
    };

    // ── Localização própria ──
    const openMapPicker = () => {
        navigation.navigate('MapPicker', {
            initialCoords: pendingCoords ?? null,
            returnTo: 'EditProfessionalProfile',
        });
    };

    const handleSavePlace = async () => {
        if (!pendingCoords) return;
        try {
            setSavingPlace(true);
            await apiService.setOwnPlace({
                latitude: pendingCoords.lat,
                longitude: pendingCoords.lng,
                city: locCity.trim() || undefined,
                address_line: locAddress.trim() || undefined,
            });
            await refreshProfile();
            setPendingCoords(null);
            setLocCity(''); setLocAddress('');
            showAlert({ title: 'Localização definida', message: 'O teu local foi submetido e fica pendente de aprovação por um administrador.', icon: 'location', iconColor: accentColor, primaryButton: undefined });
        } catch (e: any) {
            showAlert({ title: 'Erro', message: e.message || 'Não foi possível guardar a localização.', icon: 'alert-circle', iconColor: '#ef4444', primaryButton: undefined });
        } finally {
            setSavingPlace(false);
        }
    };

    // ── Associação (profissional) ──
    const loadInstitutions = () => {
        if (institutions.length || instLoading) return;
        setInstLoading(true);
        apiService.getInstitutions().then(l => setInstitutions(l || [])).catch(() => setInstitutions([])).finally(() => setInstLoading(false));
    };

    const requestAssociation = async (inst: Institution) => {
        setInstModal(false);
        try {
            await apiService.requestAssociation(inst.id);
            await Promise.all([refreshProfile(), loadAssoc()]);
            showAlert({ title: 'Pedido enviado', message: `O teu pedido de associação a "${inst.full_name}" foi enviado. Aguarda a aprovação da instituição.`, icon: 'send', iconColor: accentColor, primaryButton: undefined });
        } catch (e: any) {
            showAlert({ title: 'Não foi possível', message: e.message || 'Erro ao enviar o pedido.', icon: 'alert-circle', iconColor: '#ef4444', primaryButton: undefined });
        }
    };

    const cancelRequest = async (id: string) => {
        try {
            await apiService.cancelAssociationRequest(id);
            await Promise.all([refreshProfile(), loadAssoc()]);
        } catch (e: any) {
            showAlert({ title: 'Erro', message: e.message || 'Não foi possível cancelar.', icon: 'alert-circle', iconColor: '#ef4444', primaryButton: undefined });
        }
    };

    const leaveInstitution = () => {
        showAlert({
            title: 'Sair da instituição',
            message: 'Tens a certeza? Perdes a associação e a localização herdada da instituição.',
            icon: 'exit-outline', iconColor: '#ef4444',
            primaryButton: {
                text: 'Sair', onPress: async () => {
                    try {
                        await apiService.leaveInstitution();
                        await Promise.all([refreshProfile(), loadAssoc()]);
                        showAlert({ title: 'Feito', message: 'Saíste da instituição.', icon: 'checkmark-circle', iconColor: '#22c55e', primaryButton: undefined });
                    } catch (e: any) {
                        showAlert({ title: 'Erro', message: e.message || 'Não foi possível sair.', icon: 'alert-circle', iconColor: '#ef4444', primaryButton: undefined });
                    }
                }
            },
        });
    };

    // ── Pedidos (instituição) ──
    const respond = async (id: string, action: 'accept' | 'reject') => {
        setRespondingId(id);
        try {
            await apiService.respondAssociationRequest(id, action);
            await loadAssoc();
        } catch (e: any) {
            showAlert({ title: 'Erro', message: e.message || 'Não foi possível responder.', icon: 'alert-circle', iconColor: '#ef4444', primaryButton: undefined });
        } finally {
            setRespondingId(null);
        }
    };

    const filteredInstitutions = institutions.filter(i => i.full_name.toLowerCase().includes(instSearch.toLowerCase().trim()));

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={accentColor} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    {isProfessional ? 'Perfil Profissional' : 'Perfil da Instituição'}
                </Text>
                <Pressable onPress={handleSave} disabled={saving} style={styles.saveBtn}>
                    {saving ? <ActivityIndicator size="small" color={accentColor} /> : <Text style={[styles.saveBtnText, { color: accentColor }]}>Guardar</Text>}
                </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {/* Verification status banner */}
                <View style={[styles.verificationBanner, { backgroundColor: verified ? '#0ebd5f15' : '#b4530915', borderColor: verified ? '#0ebd5f30' : '#b4530930' }]}>
                    <View style={[styles.verificationIcon, { backgroundColor: verified ? '#0ebd5f' : '#b45309' }]}>
                        <Ionicons name={verified ? 'shield-checkmark' : 'time'} size={20} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.verificationTitle, { color: verified ? '#0ebd5f' : '#b45309' }]}>
                            {verified ? 'Conta Verificada' : 'Verificação Pendente'}
                        </Text>
                        <Text style={[styles.verificationDesc, { color: colors.textSecondary }]}>
                            {verified ? 'O teu perfil está verificado e o badge aparece publicamente.' : 'A nossa equipa está a analisar o teu perfil. Serás notificado assim que for verificado.'}
                        </Text>
                    </View>
                </View>

                {/* Type badge */}
                <View style={[styles.typeBadge, { backgroundColor: accentColor + '15' }]}>
                    <Ionicons name={iconName} size={18} color={accentColor} />
                    <Text style={[styles.typeBadgeText, { color: accentColor }]}>
                        {isProfessional ? 'Conta Profissional' : 'Conta Instituição'}
                    </Text>
                </View>

                {/* ═══ PROFISSIONAL: Instituição / Localização ═══ */}
                {isProfessional && (
                    <View style={[styles.assocCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.assocCardTitle, { color: colors.textPrimary }]}>Instituição & Localização</Text>

                        {affiliated ? (
                            <>
                                <View style={styles.assocRow}>
                                    <Ionicons name="business" size={18} color={accentColor} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.assocName, { color: colors.textPrimary }]}>{profile?.institution?.full_name || 'Instituição'}</Text>
                                        <Text style={[styles.assocMeta, { color: colors.textSecondary }]}>Estás associado. A tua localização é a da instituição.</Text>
                                    </View>
                                </View>
                                <Pressable onPress={leaveInstitution} style={[styles.dangerBtn, { borderColor: '#ef444440' }]}>
                                    <Ionicons name="exit-outline" size={16} color="#ef4444" />
                                    <Text style={styles.dangerBtnText}>Sair da instituição</Text>
                                </Pressable>
                            </>
                        ) : myPendingRequest ? (
                            <>
                                <View style={styles.assocRow}>
                                    <Ionicons name="time" size={18} color="#f59e0b" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.assocName, { color: colors.textPrimary }]}>{myPendingRequest.institution?.full_name || 'Instituição'}</Text>
                                        <Text style={[styles.assocMeta, { color: colors.textSecondary }]}>Pedido de associação pendente de aprovação.</Text>
                                    </View>
                                </View>
                                <Pressable onPress={() => cancelRequest(myPendingRequest.id)} style={[styles.dangerBtn, { borderColor: '#ef444440' }]}>
                                    <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                                    <Text style={styles.dangerBtnText}>Cancelar pedido</Text>
                                </Pressable>
                            </>
                        ) : (
                            <>
                                <Text style={[styles.assocMeta, { color: colors.textSecondary, marginBottom: 12 }]}>
                                    Por conta própria. Podes associar-te a uma instituição ou definir a tua própria localização.
                                </Text>
                                <Pressable onPress={() => { loadInstitutions(); setInstModal(true); }} style={[styles.actionBtn, { backgroundColor: accentColor + '15' }]}>
                                    <Ionicons name="business-outline" size={16} color={accentColor} />
                                    <Text style={[styles.actionBtnText, { color: accentColor }]}>Pedir associação a instituição</Text>
                                </Pressable>

                                {/* Localização própria (independente) */}
                                {pendingCoords ? (
                                    <View style={{ marginTop: 12, gap: 8 }}>
                                        <Text style={[styles.assocMeta, { color: colors.textSecondary }]}>
                                            Ponto: {pendingCoords.lat.toFixed(5)}, {pendingCoords.lng.toFixed(5)}
                                        </Text>
                                        <View style={[styles.inputWrap, { backgroundColor: colors.background }]}>
                                            <TextInput value={locCity} onChangeText={setLocCity} placeholder="Cidade (opcional)" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.textPrimary }]} />
                                        </View>
                                        <View style={[styles.inputWrap, { backgroundColor: colors.background }]}>
                                            <TextInput value={locAddress} onChangeText={setLocAddress} placeholder="Morada (opcional)" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.textPrimary }]} />
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <Pressable onPress={openMapPicker} style={[styles.actionBtn, { backgroundColor: colors.background, flex: 1 }]}>
                                                <Ionicons name="map-outline" size={16} color={colors.textSecondary} />
                                                <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Mudar ponto</Text>
                                            </Pressable>
                                            <Pressable onPress={handleSavePlace} disabled={savingPlace} style={[styles.actionBtn, { backgroundColor: accentColor, flex: 1 }]}>
                                                {savingPlace ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="checkmark" size={16} color="#fff" /><Text style={[styles.actionBtnText, { color: '#fff' }]}>Guardar local</Text></>}
                                            </Pressable>
                                        </View>
                                    </View>
                                ) : (
                                    <Pressable onPress={openMapPicker} style={[styles.actionBtn, { backgroundColor: colors.background, marginTop: 8 }]}>
                                        <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                                        <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>{hasOwnPlace ? 'Alterar a minha localização' : 'Definir a minha localização'}</Text>
                                    </Pressable>
                                )}
                            </>
                        )}
                    </View>
                )}

                {/* ═══ INSTITUIÇÃO: Sede / Pedidos / Profissionais ═══ */}
                {isInstitution && (
                    <>
                        <View style={[styles.assocCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.assocCardTitle, { color: colors.textPrimary }]}>Sede / Localização</Text>
                            <Text style={[styles.assocMeta, { color: colors.textSecondary, marginBottom: 12 }]}>
                                {hasOwnPlace ? 'Localização definida. Alterações ficam pendentes de aprovação.' : 'Marca no mapa onde fica a tua instituição. Fica pendente de aprovação.'}
                            </Text>
                            {pendingCoords ? (
                                <View style={{ gap: 8 }}>
                                    <Text style={[styles.assocMeta, { color: colors.textSecondary }]}>Ponto: {pendingCoords.lat.toFixed(5)}, {pendingCoords.lng.toFixed(5)}</Text>
                                    <View style={[styles.inputWrap, { backgroundColor: colors.background }]}>
                                        <TextInput value={locCity} onChangeText={setLocCity} placeholder="Cidade (opcional)" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.textPrimary }]} />
                                    </View>
                                    <View style={[styles.inputWrap, { backgroundColor: colors.background }]}>
                                        <TextInput value={locAddress} onChangeText={setLocAddress} placeholder="Morada (opcional)" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.textPrimary }]} />
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <Pressable onPress={openMapPicker} style={[styles.actionBtn, { backgroundColor: colors.background, flex: 1 }]}>
                                            <Ionicons name="map-outline" size={16} color={colors.textSecondary} />
                                            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Mudar ponto</Text>
                                        </Pressable>
                                        <Pressable onPress={handleSavePlace} disabled={savingPlace} style={[styles.actionBtn, { backgroundColor: accentColor, flex: 1 }]}>
                                            {savingPlace ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="checkmark" size={16} color="#fff" /><Text style={[styles.actionBtnText, { color: '#fff' }]}>Guardar sede</Text></>}
                                        </Pressable>
                                    </View>
                                </View>
                            ) : (
                                <Pressable onPress={openMapPicker} style={[styles.actionBtn, { backgroundColor: accentColor + '15' }]}>
                                    <Ionicons name="location-outline" size={16} color={accentColor} />
                                    <Text style={[styles.actionBtnText, { color: accentColor }]}>{hasOwnPlace ? 'Alterar localização' : 'Definir localização no mapa'}</Text>
                                </Pressable>
                            )}
                        </View>

                        {/* Pedidos pendentes */}
                        <View style={[styles.assocCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.assocCardTitle, { color: colors.textPrimary }]}>
                                Pedidos de associação {requests.length > 0 ? `(${requests.length})` : ''}
                            </Text>
                            {loadingAssoc ? (
                                <ActivityIndicator color={accentColor} style={{ marginVertical: 12 }} />
                            ) : requests.length === 0 ? (
                                <Text style={[styles.assocMeta, { color: colors.textMuted }]}>Sem pedidos pendentes.</Text>
                            ) : requests.map(req => (
                                <View key={req.id} style={[styles.reqRow, { borderBottomColor: colors.border }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.assocName, { color: colors.textPrimary }]}>{req.professional?.full_name || 'Profissional'}</Text>
                                        {req.professional?.specialty ? <Text style={[styles.assocMeta, { color: colors.textSecondary }]}>{req.professional.specialty}</Text> : null}
                                    </View>
                                    {respondingId === req.id ? (
                                        <ActivityIndicator size="small" color={accentColor} />
                                    ) : (
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <Pressable onPress={() => respond(req.id, 'reject')} style={[styles.iconBtn, { backgroundColor: '#ef444415' }]}>
                                                <Ionicons name="close" size={18} color="#ef4444" />
                                            </Pressable>
                                            <Pressable onPress={() => respond(req.id, 'accept')} style={[styles.iconBtn, { backgroundColor: '#22c55e15' }]}>
                                                <Ionicons name="checkmark" size={18} color="#22c55e" />
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>

                        {/* Profissionais associados */}
                        <View style={[styles.assocCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.assocCardTitle, { color: colors.textPrimary }]}>
                                Profissionais associados {associatedPros.length > 0 ? `(${associatedPros.length})` : ''}
                            </Text>
                            {associatedPros.length === 0 ? (
                                <Text style={[styles.assocMeta, { color: colors.textMuted }]}>Ainda não há profissionais associados.</Text>
                            ) : associatedPros.map(pro => (
                                <View key={pro.id} style={styles.assocRow}>
                                    <View style={[styles.iconBtn, { backgroundColor: accentColor + '15' }]}>
                                        <Ionicons name="person" size={16} color={accentColor} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.assocName, { color: colors.textPrimary }]}>{pro.full_name}</Text>
                                        {pro.specialty ? <Text style={[styles.assocMeta, { color: colors.textSecondary }]}>{pro.specialty}</Text> : null}
                                    </View>
                                    {pro.verified && <Ionicons name="shield-checkmark" size={15} color="#22c55e" />}
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {/* Form base */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        {isProfessional ? 'ESPECIALIDADE' : 'TIPO DE INSTITUIÇÃO'}
                    </Text>
                    <View style={[styles.inputWrap, { backgroundColor: colors.card }]}>
                        <Ionicons name="briefcase-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
                        <TextInput value={specialty} onChangeText={setSpecialty} placeholder={isProfessional ? 'Ex: Terapeuta ABA, Psicólogo Clínico...' : 'Ex: Centro de Terapias, Associação...'} placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.textPrimary }]} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BIO / DESCRIÇÃO</Text>
                    <View style={[styles.inputWrap, styles.inputWrapMulti, { backgroundColor: colors.card }]}>
                        <Ionicons name="document-text-outline" size={18} color={colors.textMuted} style={{ marginRight: 12, marginTop: 2 }} />
                        <TextInput value={bio} onChangeText={setBio} placeholder="Apresenta-te brevemente. Esta informação será visível no teu perfil público." placeholderTextColor={colors.textMuted} style={[styles.input, styles.inputMulti, { color: colors.textPrimary }]} multiline numberOfLines={4} />
                    </View>
                    <Text style={[styles.hint, { color: colors.textMuted }]}>{bio.length}/400 caracteres</Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>WEBSITE</Text>
                    <View style={[styles.inputWrap, { backgroundColor: colors.card }]}>
                        <Ionicons name="globe-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
                        <TextInput value={website} onChangeText={setWebsite} placeholder="https://www.exemplo.pt" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.textPrimary }]} autoCapitalize="none" keyboardType="url" />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        {isProfessional ? 'SERVIÇOS E VALÊNCIAS' : 'SERVIÇOS PRESTADOS'}
                    </Text>
                    <View style={[styles.inputWrap, { backgroundColor: colors.card }]}>
                        <Ionicons name="medical-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
                        <TextInput value={services} onChangeText={setServices} placeholder="Ex: Terapia de Fala, Integração Sensorial..." placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.textPrimary }]} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>HORÁRIO DE FUNCIONAMENTO</Text>
                    <View style={[styles.inputWrap, { backgroundColor: colors.card }]}>
                        <Ionicons name="time-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
                        <TextInput value={hours} onChangeText={setHours} placeholder="Ex: Seg a Sex, 9h-13h e 14h-18h" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.textPrimary }]} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        {isProfessional ? 'FORMAÇÃO E EXPERIÊNCIA' : 'SOBRE A INSTITUIÇÃO / CREDENCIAIS'}
                    </Text>
                    <View style={[styles.inputWrap, styles.inputWrapMulti, { backgroundColor: colors.card }]}>
                        <Ionicons name="ribbon-outline" size={18} color={colors.textMuted} style={{ marginRight: 12, marginTop: 2 }} />
                        <TextInput value={experience} onChangeText={setExperience} placeholder={isProfessional ? "Ex: Licenciatura em Psicologia, Mestrado em Neurodesenvolvimento, 5 anos de experiência..." : "Ex: Associação sem fins lucrativos fundada em 2018..."} placeholderTextColor={colors.textMuted} style={[styles.input, styles.inputMulti, { color: colors.textPrimary }]} multiline numberOfLines={3} />
                    </View>
                </View>

                <View style={[styles.infoBox, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', borderColor: colors.border }]}>
                    <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} style={{ marginTop: 1 }} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        O teu perfil público (especialidade, bio e website) é visível para outros utilizadores da app ao consultarem a listagem de profissionais.
                    </Text>
                </View>

                <Pressable onPress={handleSave} disabled={saving} style={[styles.saveFullBtn, { backgroundColor: accentColor }]}>
                    {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.saveFullBtnText}>Guardar Alterações</Text></>}
                </Pressable>
            </ScrollView>

            {/* Modal picker de instituição */}
            <Modal visible={instModal} animationType="slide" transparent onRequestClose={() => setInstModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Escolher instituição</Text>
                            <Pressable onPress={() => setInstModal(false)} style={{ padding: 4 }}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </Pressable>
                        </View>
                        <View style={[styles.inputWrap, { backgroundColor: colors.card, marginBottom: 12 }]}>
                            <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 12 }} />
                            <TextInput value={instSearch} onChangeText={setInstSearch} placeholder="Procurar por nome..." placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.textPrimary }]} autoFocus />
                        </View>
                        {instLoading ? (
                            <ActivityIndicator color={accentColor} style={{ marginTop: 24 }} />
                        ) : (
                            <FlatList
                                data={filteredInstitutions}
                                keyExtractor={i => i.id}
                                keyboardShouldPersistTaps="handled"
                                ListEmptyComponent={<Text style={[styles.assocMeta, { color: colors.textMuted, textAlign: 'center', marginTop: 24 }]}>{institutions.length === 0 ? 'Ainda não há instituições registadas.' : 'Nenhuma encontrada.'}</Text>}
                                renderItem={({ item }) => (
                                    <Pressable onPress={() => requestAssociation(item)} style={[styles.reqRow, { borderBottomColor: colors.border }]}>
                                        <View style={[styles.iconBtn, { backgroundColor: accentColor + '18' }]}>
                                            <Ionicons name="business" size={16} color={accentColor} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={[styles.assocName, { color: colors.textPrimary }]} numberOfLines={1}>{item.full_name}</Text>
                                                {item.verified && <Ionicons name="shield-checkmark" size={13} color="#22c55e" />}
                                            </View>
                                            <Text style={[styles.assocMeta, { color: colors.textSecondary }]} numberOfLines={1}>{[item.specialty, item.city].filter(Boolean).join(' · ') || 'Instituição'}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                                    </Pressable>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            <CustomAlertModal visible={alertState.visible} title={alertState.title} message={alertState.message} icon={alertState.icon} iconColor={alertState.iconColor} primaryButton={alertState.primaryButton} onClose={closeAlert} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
    backBtn: { padding: 4, marginRight: 8 },
    headerTitle: { flex: 1, fontSize: 17, fontFamily: 'Poppins_700Bold' },
    saveBtn: { padding: 4 },
    saveBtnText: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
    scroll: { padding: 20, paddingBottom: 48, gap: 4 },
    verificationBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
    verificationIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    verificationTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold', marginBottom: 2 },
    verificationDesc: { fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 18 },
    typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginBottom: 20 },
    typeBadgeText: { fontSize: 13, fontFamily: 'Poppins_700Bold' },

    assocCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
    assocCardTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold', marginBottom: 10 },
    assocRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    assocName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
    assocMeta: { fontSize: 12, fontFamily: 'Poppins_400Regular', lineHeight: 17, marginTop: 1 },
    reqRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
    iconBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
    actionBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
    dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12, borderWidth: 1, marginTop: 10 },
    dangerBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#ef4444' },

    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 0.8, marginBottom: 10 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
    inputWrapMulti: { alignItems: 'flex-start' },
    input: { flex: 1, fontSize: 15, fontFamily: 'Poppins_400Regular', paddingVertical: 0 },
    inputMulti: { minHeight: 90, textAlignVertical: 'top' },
    hint: { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 6, textAlign: 'right' },
    infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 24 },
    infoText: { flex: 1, fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 19 },
    saveFullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16 },
    saveFullBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: { maxHeight: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
});
