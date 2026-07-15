import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Switch,
    Image,
    Modal,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { apiService, CommunityMember, DonationCampaign } from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import CustomAlertModal from '../components/CustomAlertModal';

type Props = NativeStackScreenProps<RootStackParamList, 'CommunityDetail'>;

const AVATAR_COLORS = ['#6D28D9', '#0369a1', '#0f766e', '#b45309', '#be185d', '#047857', '#c2410c', '#1d4ed8'];

const getAvatarColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function CommunityDetailScreen({ route, navigation }: Props) {
    const { communityId, communityName, communityColor, description, memberCount } = route.params;
    const { colors, isDark } = useTheme();
    const { user } = useAuth();

    const [members, setMembers] = useState<CommunityMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);
    const [leaving, setLeaving] = useState(false);
    
    // Dynamically loaded community states
    const [commDesc, setCommDesc] = useState(description || '');
    const [commColor, setCommColor] = useState(communityColor || colors.primary);
    const [createdAt, setCreatedAt] = useState<string | null>(null);
    const [createdBy, setCreatedBy] = useState<string | null>(null);
    const [photoUrl, setPhotoUrl] = useState(route.params.photoUrl || '');

    // Edit modal states
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editDesc, setEditDesc] = useState(description || '');
    const [editPhotoUrl, setEditPhotoUrl] = useState(route.params.photoUrl || '');
    const [updating, setUpdating] = useState(false);
    
    // Community privacy
    const [isPrivate, setIsPrivate] = useState(false);
    const [editIsPrivate, setEditIsPrivate] = useState(false);

    // Invite modal
    const [inviteModalVisible, setInviteModalVisible] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [sendingInvite, setSendingInvite] = useState(false);

    // Mute Switch Mock State
    const [isMuted, setIsMuted] = useState(false);

    // Search participants
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Custom Alert Modal State
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        icon?: keyof typeof Ionicons.glyphMap;
        iconColor?: string;
        primaryButton?: { text: string; onPress: () => void; destructive?: boolean };
        secondaryButton?: { text: string; onPress: () => void };
    }>({
        visible: false,
        title: '',
        message: '',
    });

    const showAlert = (
        title: string,
        message: string,
        icon?: keyof typeof Ionicons.glyphMap,
        iconColor?: string,
        primaryButton?: { text: string; onPress: () => void; destructive?: boolean },
        secondaryButton?: { text: string; onPress: () => void }
    ) => {
        setAlertConfig({
            visible: true,
            title,
            message,
            icon,
            iconColor,
            primaryButton,
            secondaryButton,
        });
    };

    // Campaigns states
    const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
    const [campaignsLoading, setCampaignsLoading] = useState(true);

    // New campaign modal states
    const [campaignModalVisible, setCampaignModalVisible] = useState(false);
    const [campaignTitle, setCampaignTitle] = useState('');
    const [campaignDesc, setCampaignDesc] = useState('');
    const [campaignGoal, setCampaignGoal] = useState('');
    const [campaignMbway, setCampaignMbway] = useState('');
    const [campaignIban, setCampaignIban] = useState('');
    const [creatingCampaign, setCreatingCampaign] = useState(false);

    // Contribution modal states
    const [contribModalVisible, setContribModalVisible] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<DonationCampaign | null>(null);
    const [contribAmount, setContribAmount] = useState('');
    const [contribName, setContribName] = useState('');
    const [contribNote, setContribNote] = useState('');
    const [submittingContrib, setSubmittingContrib] = useState(false);

    const fetchCampaigns = async () => {
        try {
            setCampaignsLoading(true);
            const data = await apiService.getCommunityCampaigns(communityId);
            setCampaigns(data || []);
        } catch (e) {
            console.error('[CommunityDetailScreen] Error fetching campaigns:', e);
        } finally {
            setCampaignsLoading(false);
        }
    };

    const myMemberRecord = members.find(m => m.user_id === user?.id);
    const isMeAdmin = myMemberRecord?.role === 'admin';

    // Menu de ações de um membro (aberto pelos 3 pontinhos)
    const [memberMenu, setMemberMenu] = useState<CommunityMember | null>(null);

    const openDirectMessage = (targetMember: CommunityMember) => {
        setMemberMenu(null);
        navigation.navigate('DirectMessage', {
            userId: targetMember.user_id,
            userName: targetMember.profiles?.full_name || 'Utilizador',
        });
    };

    const handlePromoteMember = (targetMember: CommunityMember) => {
        const memberName = targetMember.profiles?.full_name || 'Utilizador';
        
        showAlert(
            'Promover a Administrador',
            `Tens a certeza que desejas promover "${memberName}" a administrador desta comunidade? Esta ação dará permissões para editar o grupo e gerir campanhas.`,
            'shield-checkmark-outline',
            colors.primary,
            {
                text: 'Promover',
                onPress: async () => {
                    try {
                        await apiService.updateCommunityMemberRole(communityId, targetMember.user_id, 'admin');
                        showAlert('Sucesso', `"${memberName}" foi promovido a administrador.`, 'checkmark-circle-outline', colors.primary);
                        
                        // Refresh list
                        const updatedMembers = await apiService.getCommunityMembers(communityId);
                        setMembers(updatedMembers);
                    } catch (e: any) {
                        showAlert('Erro', e.message || 'Não foi possível promover o membro.', 'alert-circle-outline', '#ef4444');
                    }
                }
            },
            {
                text: 'Cancelar',
                onPress: () => {}
            }
        );
    };

    const handleSaveCampaign = async () => {
        if (!campaignTitle.trim()) {
            showAlert('Dados Inválidos', 'Por favor, insere um título para a campanha.', 'alert-circle-outline', '#ef4444');
            return;
        }
        const goalNum = Number(campaignGoal);
        if (isNaN(goalNum) || goalNum <= 0) {
            showAlert('Dados Inválidos', 'Por favor, insere um montante objetivo válido.', 'alert-circle-outline', '#ef4444');
            return;
        }

        try {
            setCreatingCampaign(true);
            await apiService.createCommunityCampaign(communityId, {
                title: campaignTitle.trim(),
                description: campaignDesc.trim() || undefined,
                goal_amount: goalNum,
                mbway_phone: campaignMbway.trim() || undefined,
                iban: campaignIban.trim() || undefined
            });

            setCampaignModalVisible(false);
            setCampaignTitle('');
            setCampaignDesc('');
            setCampaignGoal('');
            setCampaignMbway('');
            setCampaignIban('');
            
            showAlert('Sucesso', 'Campanha criada com sucesso!', 'checkmark-circle-outline', colors.primary);
            await fetchCampaigns();
        } catch (e: any) {
            showAlert('Erro', e.message || 'Não foi possível criar a campanha.', 'alert-circle-outline', '#ef4444');
        } finally {
            setCreatingCampaign(false);
        }
    };

    const handleDonate = async () => {
        if (!selectedCampaign) return;
        const amountNum = Number(contribAmount);
        if (isNaN(amountNum) || amountNum <= 0) {
            showAlert('Dados Inválidos', 'Por favor, insere um montante válido.', 'alert-circle-outline', '#ef4444');
            return;
        }

        try {
            setSubmittingContrib(true);
            await apiService.createDonation({
                campaignId: selectedCampaign.id,
                amount: amountNum,
                donorName: contribName.trim() || undefined,
                note: contribNote.trim() || undefined
            });

            setContribModalVisible(false);
            setContribAmount('');
            setContribName('');
            setContribNote('');

            showAlert('Doação Registada', 'A tua contribuição foi registada com sucesso. Obrigado!', 'checkmark-circle-outline', colors.primary);
            await fetchCampaigns();
        } catch (e: any) {
            showAlert('Erro', e.message || 'Não foi possível registar a contribuição.', 'alert-circle-outline', '#ef4444');
        } finally {
            setSubmittingContrib(false);
        }
    };

    useEffect(() => {
        const fetchDetailsAndMembers = async () => {
            try {
                // 1. Fetch community members
                const data = await apiService.getCommunityMembers(communityId);
                setMembers(data);
                setIsMember(data.some(m => m.user_id === user?.id));

                // 2. Fetch communities list to gather description & dates
                const allComms = await apiService.getCommunities();
                const matchedComm = allComms.find(c => c.id === communityId);
                if (matchedComm) {
                    if (matchedComm.description) {
                        setCommDesc(matchedComm.description);
                        setEditDesc(matchedComm.description);
                    }
                    if (matchedComm.color) setCommColor(matchedComm.color);
                    if (matchedComm.created_at) setCreatedAt(matchedComm.created_at);
                    if (matchedComm.created_by) setCreatedBy(matchedComm.created_by);
                    if (matchedComm.photo_url) {
                        setPhotoUrl(matchedComm.photo_url);
                        setEditPhotoUrl(matchedComm.photo_url);
                    }
                    setIsPrivate(!!matchedComm.is_private);
                    setEditIsPrivate(!!matchedComm.is_private);
                }

                // 3. Fetch community campaigns
                await fetchCampaigns();
            } catch (e) {
                console.error('[CommunityDetailScreen] Error fetching info:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchDetailsAndMembers();
    }, [communityId]);

    const handleSaveEdit = async () => {
        try {
            setUpdating(true);
            const updatedComm = await apiService.updateCommunity(communityId, {
                description: editDesc.trim(),
                photo_url: editPhotoUrl.trim(),
                ...(isMeAdmin ? { is_private: editIsPrivate } : {}),
            });
            setCommDesc(updatedComm.description || '');
            setPhotoUrl(updatedComm.photo_url || '');
            setIsPrivate(!!updatedComm.is_private);
            setEditModalVisible(false);
            showAlert('Sucesso', 'Dados da comunidade atualizados.', 'checkmark-circle', '#22c55e');
        } catch (e: any) {
            showAlert('Erro', e.message || 'Não foi possível atualizar a comunidade.', 'alert-circle', '#ef4444');
        } finally {
            setUpdating(false);
        }
    };

    const handleSendInvite = async () => {
        if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
            showAlert('Email inválido', 'Por favor insere um endereço de email válido.', 'alert-circle-outline', '#ef4444');
            return;
        }
        try {
            setSendingInvite(true);
            await apiService.inviteToCommunity(communityId, inviteEmail.trim());
            setInviteModalVisible(false);
            setInviteEmail('');
            showAlert('Convite enviado', `O convite foi enviado para ${inviteEmail.trim()}.`, 'checkmark-circle-outline', '#22c55e');
        } catch (e: any) {
            showAlert('Erro', e.message || 'Não foi possível enviar o convite.', 'alert-circle-outline', '#ef4444');
        } finally {
            setSendingInvite(false);
        }
    };

    const handleRemoveMember = (targetMember: CommunityMember) => {
        const memberName = targetMember.profiles?.full_name || 'Utilizador';
        showAlert(
            'Remover Membro',
            `Tens a certeza que desejas remover "${memberName}" desta comunidade?`,
            'person-remove-outline',
            '#ef4444',
            {
                text: 'Remover',
                destructive: true,
                onPress: async () => {
                    try {
                        await apiService.removeCommunityMember(communityId, targetMember.user_id);
                        setMembers(prev => prev.filter(m => m.user_id !== targetMember.user_id));
                        showAlert('Membro removido', `"${memberName}" foi removido da comunidade.`, 'checkmark-circle-outline', '#22c55e');
                    } catch (e: any) {
                        showAlert('Erro', e.message || 'Não foi possível remover o membro.', 'alert-circle-outline', '#ef4444');
                    }
                }
            },
            { text: 'Cancelar', onPress: () => {} }
        );
    };

    const handleDeleteCommunity = () => {
        showAlert(
            'Eliminar Comunidade',
            `Tens a certeza que queres eliminar a comunidade "${communityName}"? Esta ação é irreversível e apagará todas as mensagens e dados.`,
            'trash-outline',
            '#ef4444',
            {
                text: 'Eliminar',
                destructive: true,
                onPress: async () => {
                    try {
                        await apiService.deleteCommunity(communityId);
                        (navigation as any).navigate('Main', { screen: 'Communities' });
                    } catch (e: any) {
                        showAlert('Erro', e.message || 'Não foi possível eliminar a comunidade.', 'alert-circle-outline', '#ef4444');
                    }
                }
            },
            { text: 'Cancelar', onPress: () => {} }
        );
    };

    const handleLeave = () => {
        showAlert(
            'Sair da Comunidade',
            'Tens a certeza que queres sair desta comunidade?',
            'people',
            '#ef4444',
            {
                text: 'Sair',
                onPress: async () => {
                    try {
                        setLeaving(true);
                        await apiService.leaveCommunity(communityId);
                        (navigation as any).navigate('Main', { screen: 'Communities' });
                    } catch (e: any) {
                        showAlert('Erro', e.message || 'Não foi possível sair.', 'alert-circle', '#ef4444');
                    } finally {
                        setLeaving(false);
                    }
                },
                destructive: true,
            },
            { text: 'Cancelar', onPress: () => {} }
        );
    };

    // Literal WhatsApp Theme Colors
    const containerBg = isDark ? '#0B141A' : '#F0F2F5';
    const cardBg = isDark ? '#111B21' : '#FFFFFF';
    const textPrimary = isDark ? '#E9EDEF' : '#111B21';
    const textSecondary = isDark ? '#8696A0' : '#667781';
    const borderCol = isDark ? '#222E35' : '#E9E9EB';
    const accentGreen = '#13CF75'; // WhatsApp green
    const iconMuted = isDark ? '#8696A0' : '#667781';

    const creatorMember = members.find(m => m.user_id === createdBy);
    const creatorName = creatorMember?.profiles?.full_name 
        ? (creatorMember.user_id === user?.id ? 'tu' : creatorMember.profiles.full_name)
        : 'um administrador';

    const formattedDate = createdAt 
        ? new Date(createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: containerBg }]} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={textPrimary} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: textPrimary }]} numberOfLines={1}>
                    Dados do grupo
                </Text>
                {isMember ? (
                    <Pressable onPress={() => {
                        setEditDesc(commDesc);
                        setEditPhotoUrl(photoUrl);
                        setEditModalVisible(true);
                    }} style={styles.backBtn}>
                        <Ionicons name="create-outline" size={24} color={accentGreen} />
                    </Pressable>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={accentGreen} />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {/* Block 1: Cover Header & Title */}
                    <View style={[styles.sectionBlock, { backgroundColor: cardBg }]}>
                        <View style={styles.heroContent}>
                            <View style={[styles.heroIconWrap, { backgroundColor: commColor }]}>
                                {photoUrl ? (
                                    <Image source={{ uri: photoUrl }} style={styles.heroImage} />
                                ) : (
                                    <Ionicons name="people" size={48} color="#fff" />
                                )}
                            </View>
                            <Text style={[styles.heroName, { color: textPrimary }]}>{communityName}</Text>
                            <Text style={[styles.heroMetaText, { color: textSecondary }]}>
                                Grupo · {members.length} participantes
                            </Text>

                            {/* WhatsApp Actions Row */}
                            <View style={styles.actionsRow}>
                                <Pressable onPress={() => setSearchVisible(true)} style={styles.actionBtnContainer}>
                                    <View style={[styles.actionIconCircle, { borderColor: borderCol }]}>
                                        <Ionicons name="search-outline" size={20} color={accentGreen} />
                                    </View>
                                    <Text style={[styles.actionLabel, { color: textPrimary }]}>Pesquisar</Text>
                                </Pressable>
                                <Pressable onPress={handleLeave} style={styles.actionBtnContainer}>
                                    <View style={[styles.actionIconCircle, { borderColor: borderCol }]}>
                                        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                                    </View>
                                    <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Sair</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.separator, { backgroundColor: containerBg }]} />

                    {/* Block 2: Description Box */}
                    <View style={[styles.sectionBlock, { backgroundColor: cardBg }]}>
                        <View style={styles.descContainer}>
                            <Text style={[styles.descText, { color: textPrimary }]}>
                                {commDesc || 'Este grupo não possui descrição.'}
                            </Text>
                            <Text style={[styles.creationText, { color: textSecondary }]}>
                                Grupo criado por {creatorName} a {formattedDate || 'recentemente'}.
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.separator, { backgroundColor: containerBg }]} />

                    {/* Block 3: Media & Files */}
                    <View style={[styles.sectionBlock, { backgroundColor: cardBg }]}>
                        <Pressable style={styles.rowItem}>
                            <Ionicons name="image-outline" size={22} color={iconMuted} style={styles.rowIcon} />
                            <Text style={[styles.rowText, { color: textPrimary }]}>Ficheiros, links e docs</Text>
                            <Text style={[styles.rowValue, { color: textSecondary }]}>0</Text>
                            <Ionicons name="chevron-forward" size={16} color={iconMuted} />
                        </Pressable>
                    </View>

                    <View style={[styles.separator, { backgroundColor: containerBg }]} />

                    {/* Block 4: Notifications Settings */}
                    <View style={[styles.sectionBlock, { backgroundColor: cardBg }]}>
                        {/* Silenciar */}
                        <View style={styles.rowItem}>
                            <Ionicons name="notifications-outline" size={22} color={iconMuted} style={styles.rowIcon} />
                            <Text style={[styles.rowText, { color: textPrimary }]}>Silenciar notificações</Text>
                            <Switch
                                value={isMuted}
                                onValueChange={setIsMuted}
                                trackColor={{ false: borderCol, true: accentGreen }}
                                thumbColor="#FFF"
                            />
                        </View>
                        <View style={[styles.innerDivider, { backgroundColor: borderCol }]} />

                        {/* Personalizadas */}
                        <Pressable style={styles.rowItem}>
                            <Ionicons name="musical-notes-outline" size={22} color={iconMuted} style={styles.rowIcon} />
                            <Text style={[styles.rowText, { color: textPrimary }]}>Notificações personalizadas</Text>
                            <Ionicons name="chevron-forward" size={16} color={iconMuted} />
                        </Pressable>
                        <View style={[styles.innerDivider, { backgroundColor: borderCol }]} />

                        {/* Visibilidade */}
                        <Pressable style={styles.rowItem}>
                            <Ionicons name="download-outline" size={22} color={iconMuted} style={styles.rowIcon} />
                            <Text style={[styles.rowText, { color: textPrimary }]}>Visibilidade dos media</Text>
                            <Ionicons name="chevron-forward" size={16} color={iconMuted} />
                        </Pressable>
                    </View>

                    <View style={[styles.separator, { backgroundColor: containerBg }]} />

                    {/* Block 5.5: Community Campaigns (hidden from non-members in private communities). Criação restrita a admins via botão "Nova". */}
                    {(!isPrivate || isMember) && <View style={[styles.sectionBlock, { backgroundColor: cardBg }]}>
                        <View style={styles.campaignsHeader}>
                            <Text style={[styles.participantsTitle, { color: textPrimary }]}>
                                Campanhas de Apoio
                            </Text>
                            {isMeAdmin && (
                                <Pressable
                                    onPress={() => {
                                        setCampaignTitle('');
                                        setCampaignDesc('');
                                        setCampaignGoal('');
                                        setCampaignMbway('');
                                        setCampaignIban('');
                                        setCampaignModalVisible(true);
                                    }}
                                    style={styles.newCampaignBtn}
                                >
                                    <Ionicons name="add" size={16} color={accentGreen} style={{ marginRight: 4 }} />
                                    <Text style={[styles.newCampaignBtnText, { color: accentGreen }]}>Nova</Text>
                                </Pressable>
                            )}
                        </View>

                        {campaignsLoading ? (
                            <ActivityIndicator size="small" color={accentGreen} style={{ marginVertical: 16 }} />
                        ) : campaigns.length === 0 ? (
                            <View style={styles.emptyCampaignsBox}>
                                <Ionicons name="gift-outline" size={24} color={iconMuted} />
                                <Text style={[styles.emptyCampaignsText, { color: textSecondary }]}>
                                    Ainda não há campanhas criadas para esta comunidade.
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.campaignsList}>
                                {campaigns.map((c, idx) => {
                                    const percent = Math.min(100, Math.round((Number(c.current_amount || 0) / Number(c.goal_amount || 1)) * 100));
                                    
                                    return (
                                        <View key={c.id}>
                                            {idx > 0 && <View style={[styles.innerDivider, { backgroundColor: borderCol, marginLeft: 0 }]} />}
                                            <View style={styles.campaignItem}>
                                                <Text style={[styles.campaignItemTitle, { color: textPrimary }]}>{c.title}</Text>
                                                {c.description ? (
                                                    <Text style={[styles.campaignItemDesc, { color: textSecondary }]}>{c.description}</Text>
                                                ) : null}

                                                {/* Progress indicator */}
                                                <View style={styles.progressLabelRow}>
                                                    <Text style={[styles.progressValText, { color: textPrimary }]}>
                                                        {Number(c.current_amount || 0).toFixed(2)}€ <Text style={{ color: textSecondary, fontSize: 11, fontFamily: 'Poppins_400Regular' }}>de {Number(c.goal_amount).toFixed(2)}€</Text>
                                                    </Text>
                                                    <Text style={[styles.progressPercentText, { color: accentGreen }]}>{percent}%</Text>
                                                </View>

                                                <View style={[styles.progressBarBg, { backgroundColor: borderCol }]}>
                                                    <View style={[styles.progressBarFill, { backgroundColor: accentGreen, width: `${percent}%` }]} />
                                                </View>

                                                {/* Payment Info */}
                                                <View style={styles.paymentMethodsBox}>
                                                    {c.mbway_phone ? (
                                                        <Text style={[styles.paymentMethodText, { color: textSecondary }]}>
                                                            <Ionicons name="phone-portrait-outline" size={12} /> MB Way: <Text style={{ color: textPrimary, fontFamily: 'Poppins_600SemiBold' }}>{c.mbway_phone}</Text>
                                                        </Text>
                                                    ) : null}
                                                    {c.iban ? (
                                                        <Text style={[styles.paymentMethodText, { color: textSecondary, marginTop: 2 }]}>
                                                            <Ionicons name="card-outline" size={12} /> IBAN: <Text style={{ color: textPrimary, fontFamily: 'Poppins_600SemiBold' }}>{c.iban}</Text>
                                                        </Text>
                                                    ) : null}
                                                </View>

                                                {c.is_active && (
                                                    <Pressable
                                                        onPress={() => {
                                                            setSelectedCampaign(c);
                                                            setContribAmount('');
                                                            setContribName('');
                                                            setContribNote('');
                                                            setContribModalVisible(true);
                                                        }}
                                                        style={[styles.donateBtn, { backgroundColor: accentGreen }]}
                                                    >
                                                        <Ionicons name="heart" size={14} color="#FFF" style={{ marginRight: 6 }} />
                                                        <Text style={styles.donateBtnText}>Apoiar Campanha</Text>
                                                    </Pressable>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>}

                    <View style={[styles.separator, { backgroundColor: containerBg }]} />

                    {/* Block 6: Participant List */}
                    <View style={[styles.sectionBlock, { backgroundColor: cardBg }]}>
                        <View style={styles.participantsHeader}>
                            <Text style={[styles.participantsTitle, { color: textPrimary }]}>
                                {members.length} participantes
                            </Text>
                            <Pressable style={styles.searchIconBtn} onPress={() => { setSearchVisible(v => !v); setSearchQuery(''); }}>
                                <Ionicons name={searchVisible ? 'close' : 'search'} size={20} color={accentGreen} />
                            </Pressable>
                        </View>

                        {/* Search input */}
                        {searchVisible && (
                            <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                                <TextInput
                                    style={{ borderBottomWidth: 1.5, borderBottomColor: accentGreen, color: textPrimary, fontSize: 14, fontFamily: 'Poppins_400Regular', paddingVertical: 6 }}
                                    placeholder="Pesquisar participante..."
                                    placeholderTextColor={textSecondary}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoFocus
                                />
                            </View>
                        )}

                        {/* Add members button (admin-only invite) */}
                        {isMeAdmin && (
                            <>
                                <Pressable style={styles.rowItem} onPress={() => { setInviteEmail(''); setInviteModalVisible(true); }}>
                                    <View style={[styles.addParticipantCircle, { backgroundColor: accentGreen }]}>
                                        <Ionicons name="person-add" size={18} color="#FFF" />
                                    </View>
                                    <Text style={[styles.rowText, { color: accentGreen, fontFamily: 'Poppins_700Bold' }]}>
                                        Convidar por email
                                    </Text>
                                </Pressable>
                                <View style={[styles.innerDivider, { backgroundColor: borderCol }]} />
                            </>
                        )}

                        {/* Participant entries */}
                        {members.filter(m => {
                            if (!searchQuery.trim()) return true;
                            return (m.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
                        }).map((m, idx) => {
                            const name = m.profiles?.full_name || 'Utilizador';
                            const isMe = m.user_id === user?.id;
                            const avatarCol = getAvatarColor(m.user_id);

                            return (
                                <View key={m.user_id}>
                                    {idx > 0 && <View style={[styles.innerDivider, { backgroundColor: borderCol }]} />}
                                    <Pressable
                                        style={styles.memberRow}
                                        onPress={() => { if (!isMe) setMemberMenu(m); }}
                                        onLongPress={() => { if (!isMe) setMemberMenu(m); }}
                                    >
                                        <View style={[styles.memberAvatar, { backgroundColor: avatarCol }]}>
                                            <Text style={styles.memberAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.memberName, { color: textPrimary }]} numberOfLines={1}>
                                                {name} {isMe && <Text style={{ color: textSecondary, fontFamily: 'Poppins_400Regular' }}>(tu)</Text>}
                                            </Text>
                                        </View>
                                        {m.role === 'admin' && (
                                            <View style={[styles.adminPill, { borderColor: accentGreen }]}>
                                                <Text style={[styles.adminPillText, { color: accentGreen }]}>Admin do grupo</Text>
                                            </View>
                                        )}
                                        {!isMe && (
                                            <Ionicons name="ellipsis-vertical" size={16} color={textSecondary} style={{ marginLeft: 8 }} />
                                        )}
                                    </Pressable>
                                </View>
                            );
                        })}
                    </View>

                    <View style={[styles.separator, { backgroundColor: containerBg }]} />

                    {/* Block 7: Dangerous actions */}
                    <View style={[styles.sectionBlock, { backgroundColor: cardBg }]}>
                        {/* Leave */}
                        <Pressable onPress={handleLeave} style={styles.rowItem} disabled={leaving}>
                            <Ionicons name="log-out-outline" size={22} color="#ef4444" style={styles.rowIcon} />
                            {leaving ? (
                                <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                                <Text style={[styles.rowText, { color: '#ef4444', fontFamily: 'Poppins_700Bold' }]}>Sair do grupo</Text>
                            )}
                        </Pressable>
                        {/* Delete community (admin only) */}
                        {isMeAdmin && (
                            <>
                                <View style={[styles.innerDivider, { backgroundColor: borderCol, marginLeft: 0 }]} />
                                <Pressable onPress={handleDeleteCommunity} style={styles.rowItem}>
                                    <Ionicons name="trash-outline" size={22} color="#b91c1c" style={styles.rowIcon} />
                                    <Text style={[styles.rowText, { color: '#b91c1c', fontFamily: 'Poppins_700Bold' }]}>Eliminar comunidade</Text>
                                </Pressable>
                            </>
                        )}
                    </View>

                    <View style={{ height: 40, backgroundColor: containerBg }} />
                </ScrollView>
            )}

            {/* Edit Community Modal */}
            <Modal visible={editModalVisible} animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
                <SafeAreaView style={[styles.root, { backgroundColor: cardBg }]} edges={['top', 'bottom']}>
                    {/* Header */}
                    <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
                        <Pressable onPress={() => setEditModalVisible(false)} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color={textPrimary} />
                        </Pressable>
                        <Text style={[styles.headerTitle, { color: textPrimary }]}>Editar Grupo</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
                        {/* Current avatar preview */}
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={[styles.heroIconWrap, { backgroundColor: commColor }]}>
                                {editPhotoUrl ? (
                                    <Image source={{ uri: editPhotoUrl }} style={styles.heroImage} />
                                ) : (
                                    <Ionicons name="people" size={48} color="#fff" />
                                )}
                            </View>
                        </View>

                        {/* Presets Grid */}
                        <Text style={{ fontSize: 13, fontFamily: 'Poppins_700Bold', color: textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>
                            FOTOS PRÉ-DEFINIDAS
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                            {[
                                { uri: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500', name: 'Médica' },
                                { uri: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=500', name: 'Clínica' },
                                { uri: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500', name: 'Terapia' },
                                { uri: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500', name: 'Consultório' },
                                { uri: 'https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?w=500', name: 'Apoio' },
                                { uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500', name: 'Social' },
                            ].map(p => (
                                <Pressable
                                    key={p.uri}
                                    onPress={() => setEditPhotoUrl(p.uri)}
                                    style={{
                                        width: 55,
                                        height: 55,
                                        borderRadius: 10,
                                        overflow: 'hidden',
                                        borderWidth: editPhotoUrl === p.uri ? 3 : 0,
                                        borderColor: accentGreen,
                                    }}
                                >
                                    <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} />
                                </Pressable>
                            ))}
                            {editPhotoUrl ? (
                                <Pressable
                                    onPress={() => setEditPhotoUrl('')}
                                    style={{
                                        width: 55,
                                        height: 55,
                                        borderRadius: 10,
                                        backgroundColor: borderCol,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                </Pressable>
                            ) : null}
                        </View>

                        {/* Custom Photo URL Input */}
                        <Text style={{ fontSize: 13, fontFamily: 'Poppins_700Bold', color: textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>
                            LINK DA FOTO PERSONALIZADO (URL)
                        </Text>
                        <TextInput
                            style={{
                                borderBottomWidth: 1.5,
                                borderBottomColor: editPhotoUrl ? accentGreen : borderCol,
                                color: textPrimary,
                                fontSize: 14,
                                fontFamily: 'Poppins_400Regular',
                                paddingVertical: 6,
                                marginBottom: 24,
                            }}
                            placeholder="Insere o URL de uma foto..."
                            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                            value={editPhotoUrl}
                            onChangeText={setEditPhotoUrl}
                        />

                        {/* Description Input */}
                        <Text style={{ fontSize: 13, fontFamily: 'Poppins_700Bold', color: textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>
                            DESCRIÇÃO DO GRUPO
                        </Text>
                        <TextInput
                            style={{
                                borderBottomWidth: 1.5,
                                borderBottomColor: editDesc ? accentGreen : borderCol,
                                color: textPrimary,
                                fontSize: 14,
                                fontFamily: 'Poppins_400Regular',
                                paddingVertical: 6,
                                minHeight: 60,
                                textAlignVertical: 'top',
                                marginBottom: 32,
                            }}
                            placeholder="Descreve o propósito desta comunidade..."
                            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                            value={editDesc}
                            onChangeText={setEditDesc}
                            multiline
                            numberOfLines={4}
                        />

                        {/* Privacy Toggle (admin only) */}
                        {isMeAdmin && (
                            <>
                                <Text style={{ fontSize: 13, fontFamily: 'Poppins_700Bold', color: textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>
                                    PRIVACIDADE
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: borderCol, paddingBottom: 20, marginBottom: 24 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                        <Ionicons name={editIsPrivate ? 'lock-closed' : 'lock-open-outline'} size={20} color={editIsPrivate ? accentGreen : iconMuted} />
                                        <View>
                                            <Text style={{ fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: textPrimary }}>Comunidade Privada</Text>
                                            <Text style={{ fontSize: 12, fontFamily: 'Poppins_400Regular', color: textSecondary }}>
                                                {editIsPrivate ? 'Só por convite · campanhas visíveis apenas a membros' : 'Qualquer utilizador pode entrar'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Switch
                                        value={editIsPrivate}
                                        onValueChange={setEditIsPrivate}
                                        trackColor={{ false: borderCol, true: accentGreen }}
                                        thumbColor="#FFF"
                                    />
                                </View>
                            </>
                        )}

                        {/* Save Button */}
                        <Pressable
                            onPress={handleSaveEdit}
                            disabled={updating}
                            style={{
                                backgroundColor: accentGreen,
                                paddingVertical: 14,
                                borderRadius: 25,
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                        >
                            {updating ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' }}>
                                    Guardar Alterações
                                </Text>
                            )}
                        </Pressable>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* New Campaign Modal */}
            <Modal
                visible={campaignModalVisible}
                animationType="slide"
                onRequestClose={() => setCampaignModalVisible(false)}
            >
                <SafeAreaView style={[styles.root, { backgroundColor: cardBg }]} edges={['top', 'bottom']}>
                    {/* Header */}
                    <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
                        <Pressable onPress={() => setCampaignModalVisible(false)} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color={textPrimary} />
                        </Pressable>
                        <Text style={[styles.headerTitle, { color: textPrimary }]}>Nova Campanha</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
                        <Text style={[styles.inputLabel, { color: textSecondary }]}>TÍTULO DA CAMPANHA</Text>
                        <TextInput
                            style={[styles.modalTextInput, { color: textPrimary, borderBottomColor: borderCol }]}
                            placeholder="Ex: Fundos para novas terapias ABA..."
                            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                            value={campaignTitle}
                            onChangeText={setCampaignTitle}
                        />

                        <Text style={[styles.inputLabel, { color: textSecondary }]}>DESCRIÇÃO</Text>
                        <TextInput
                            style={[styles.modalTextInput, { color: textPrimary, borderBottomColor: borderCol, minHeight: 60 }]}
                            placeholder="Explicita o objetivo desta campanha de apoio..."
                            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                            value={campaignDesc}
                            onChangeText={setCampaignDesc}
                            multiline
                            numberOfLines={3}
                        />

                        <Text style={[styles.inputLabel, { color: textSecondary }]}>MONTANTE OBJETIVO (€)</Text>
                        <TextInput
                            style={[styles.modalTextInput, { color: textPrimary, borderBottomColor: borderCol }]}
                            placeholder="Ex: 500"
                            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                            value={campaignGoal}
                            onChangeText={setCampaignGoal}
                            keyboardType="numeric"
                        />

                        <Text style={[styles.inputLabel, { color: textSecondary }]}>NÚMERO MB WAY (OPCIONAL)</Text>
                        <TextInput
                            style={[styles.modalTextInput, { color: textPrimary, borderBottomColor: borderCol }]}
                            placeholder="Ex: 912345678"
                            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                            value={campaignMbway}
                            onChangeText={setCampaignMbway}
                            keyboardType="phone-pad"
                        />

                        <Text style={[styles.inputLabel, { color: textSecondary }]}>IBAN PARA TRANSFERÊNCIA (OPCIONAL)</Text>
                        <TextInput
                            style={[styles.modalTextInput, { color: textPrimary, borderBottomColor: borderCol }]}
                            placeholder="Ex: PT50 0033 0000 1234 5678 9012 3"
                            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                            value={campaignIban}
                            onChangeText={setCampaignIban}
                        />

                        <Pressable
                            onPress={handleSaveCampaign}
                            disabled={creatingCampaign}
                            style={[styles.saveCampaignSubmitBtn, { backgroundColor: accentGreen }]}
                        >
                            {creatingCampaign ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' }}>
                                    Criar Campanha
                                </Text>
                            )}
                        </Pressable>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Contribution Modal */}
            <Modal
                visible={contribModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setContribModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContentCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                        <Text style={[styles.modalTitleText, { color: textPrimary }]}>Apoiar Campanha</Text>
                        <Text style={[styles.modalSubtitleText, { color: textSecondary }]}>
                            {selectedCampaign?.title}
                        </Text>

                        {/* Amount */}
                        <Text style={[styles.inputLabel, { color: textSecondary, marginTop: 10 }]}>MONTANTE DA DOAÇÃO (€)</Text>
                        <TextInput
                            style={[styles.modalTextInput, { color: textPrimary, borderBottomColor: borderCol, textAlign: 'center', fontSize: 18 }]}
                            placeholder="Ex: 10"
                            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                            value={contribAmount}
                            onChangeText={setContribAmount}
                            keyboardType="numeric"
                        />

                        {/* Donor details */}
                        <Text style={[styles.inputLabel, { color: textSecondary, marginTop: 10 }]}>TEU NOME (OPCIONAL)</Text>
                        <TextInput
                            style={[styles.modalTextInput, { color: textPrimary, borderBottomColor: borderCol }]}
                            placeholder="Ex: Maria"
                            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                            value={contribName}
                            onChangeText={setContribName}
                        />

                        <Text style={[styles.inputLabel, { color: textSecondary, marginTop: 10 }]}>MENSAGEM (OPCIONAL)</Text>
                        <TextInput
                            style={[styles.modalTextInput, { color: textPrimary, borderBottomColor: borderCol }]}
                            placeholder="Deixa uma mensagem..."
                            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                            value={contribNote}
                            onChangeText={setContribNote}
                        />

                        {/* Payment instructions */}
                        {(selectedCampaign?.mbway_phone || selectedCampaign?.iban) ? (
                            <View style={[styles.paymentInstructionsContainer, { backgroundColor: containerBg, borderColor: borderCol }]}>
                                <Text style={[styles.instructionsTitle, { color: textPrimary }]}>Instruções de Pagamento</Text>
                                <Text style={[styles.instructionsBody, { color: textSecondary }]}>
                                    Por favor, transfira o valor inserido acima.
                                </Text>
                                {selectedCampaign.mbway_phone ? (
                                    <Text style={[styles.instructionsDetail, { color: textPrimary }]}>
                                        MB Way: <Text style={{ fontFamily: 'Poppins_700Bold', color: accentGreen }}>{selectedCampaign.mbway_phone}</Text>
                                    </Text>
                                ) : null}
                                {selectedCampaign.iban ? (
                                    <Text style={[styles.instructionsDetail, { color: textPrimary, marginTop: 2 }]}>
                                        IBAN: <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 11 }}>{selectedCampaign.iban}</Text>
                                    </Text>
                                ) : null}
                            </View>
                        ) : null}

                        {/* Actions */}
                        <View style={styles.modalActionButtonsRow}>
                            <Pressable
                                onPress={() => setContribModalVisible(false)}
                                style={[styles.modalActionBtn, styles.modalCancelActionBtn]}
                            >
                                <Text style={[styles.modalBtnText, { color: textSecondary }]}>Cancelar</Text>
                            </Pressable>

                            <Pressable
                                onPress={handleDonate}
                                disabled={submittingContrib}
                                style={[styles.modalActionBtn, styles.modalSubmitActionBtn, { backgroundColor: accentGreen }]}
                            >
                                {submittingContrib ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>Confirmar</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Invite Modal */}
            <Modal visible={inviteModalVisible} transparent animationType="fade" onRequestClose={() => setInviteModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContentCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                        <Text style={[styles.modalTitleText, { color: textPrimary }]}>Convidar por Email</Text>
                        <Text style={[styles.modalSubtitleText, { color: textSecondary }]}>
                            Insere o email do utilizador que queres convidar para esta comunidade.
                        </Text>
                        <TextInput
                            style={[styles.modalTextInput, { color: textPrimary, borderBottomColor: borderCol, marginTop: 16 }]}
                            placeholder="email@exemplo.com"
                            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                            value={inviteEmail}
                            onChangeText={setInviteEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <View style={styles.modalActionButtonsRow}>
                            <Pressable
                                onPress={() => setInviteModalVisible(false)}
                                style={[styles.modalActionBtn, styles.modalCancelActionBtn]}
                            >
                                <Text style={[styles.modalBtnText, { color: textSecondary }]}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSendInvite}
                                disabled={sendingInvite}
                                style={[styles.modalActionBtn, styles.modalSubmitActionBtn, { backgroundColor: accentGreen }]}
                            >
                                {sendingInvite ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>Enviar Convite</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Custom Alert Modal */}
            <CustomAlertModal
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                icon={alertConfig.icon}
                iconColor={alertConfig.iconColor}
                primaryButton={alertConfig.primaryButton}
                secondaryButton={alertConfig.secondaryButton}
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />

            {/* Menu de ações de um membro (3 pontinhos) */}
            <Modal visible={!!memberMenu} transparent animationType="slide" onRequestClose={() => setMemberMenu(null)}>
                <Pressable style={styles.memberMenuOverlay} onPress={() => setMemberMenu(null)}>
                    <Pressable style={[styles.memberMenuSheet, { backgroundColor: cardBg }]} onPress={() => {}}>
                        <View style={[styles.memberMenuGrabber, { backgroundColor: borderCol }]} />
                        <View style={styles.memberMenuHeader}>
                            <View style={[styles.memberAvatar, { backgroundColor: getAvatarColor(memberMenu?.user_id || '') }]}>
                                <Text style={styles.memberAvatarText}>{(memberMenu?.profiles?.full_name || 'U').charAt(0).toUpperCase()}</Text>
                            </View>
                            <Text style={[styles.memberMenuName, { color: textPrimary }]} numberOfLines={1}>
                                {memberMenu?.profiles?.full_name || 'Utilizador'}
                            </Text>
                        </View>

                        <Pressable style={styles.memberMenuRow} onPress={() => memberMenu && openDirectMessage(memberMenu)}>
                            <Ionicons name="chatbubble-ellipses-outline" size={22} color={accentGreen} style={{ width: 28 }} />
                            <Text style={[styles.memberMenuRowText, { color: textPrimary }]}>Enviar mensagem privada</Text>
                        </Pressable>

                        {isMeAdmin && memberMenu?.role !== 'admin' && (
                            <>
                                <View style={[styles.innerDivider, { backgroundColor: borderCol, marginLeft: 0 }]} />
                                <Pressable style={styles.memberMenuRow} onPress={() => { const t = memberMenu; setMemberMenu(null); if (t) handlePromoteMember(t); }}>
                                    <Ionicons name="shield-checkmark-outline" size={22} color={accentGreen} style={{ width: 28 }} />
                                    <Text style={[styles.memberMenuRowText, { color: textPrimary }]}>Promover a admin do grupo</Text>
                                </Pressable>
                                <View style={[styles.innerDivider, { backgroundColor: borderCol, marginLeft: 0 }]} />
                                <Pressable style={styles.memberMenuRow} onPress={() => { const t = memberMenu; setMemberMenu(null); if (t) handleRemoveMember(t); }}>
                                    <Ionicons name="person-remove-outline" size={22} color="#ef4444" style={{ width: 28 }} />
                                    <Text style={[styles.memberMenuRowText, { color: '#ef4444' }]}>Remover do grupo</Text>
                                </Pressable>
                            </>
                        )}

                        <Pressable style={[styles.memberMenuCancel, { borderColor: borderCol }]} onPress={() => setMemberMenu(null)}>
                            <Text style={[styles.memberMenuRowText, { color: textSecondary, textAlign: 'center', width: '100%' }]}>Cancelar</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
    },
    backBtn: {
        padding: 6,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        flex: 1,
        marginLeft: 16,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionBlock: {
        width: '100%',
        paddingVertical: 4,
    },
    separator: {
        width: '100%',
        height: 10,
    },
    heroContent: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
    },
    heroIconWrap: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    heroImage: {
        width: '100%',
        height: '100%',
        borderRadius: 45,
    },
    heroName: {
        fontSize: 22,
        fontFamily: 'Poppins_700Bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    heroMetaText: {
        fontSize: 13,
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
        marginBottom: 20,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 28,
        width: '100%',
    },
    actionBtnContainer: {
        alignItems: 'center',
        width: 70,
    },
    actionIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    actionLabel: {
        fontSize: 11,
        fontFamily: 'Poppins_500Medium',
        textAlign: 'center',
    },
    descContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    descText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 20,
        marginBottom: 8,
    },
    creationText: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
    },
    rowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    rowItemMultiLine: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    rowIcon: {
        marginRight: 18,
    },
    rowIconTop: {
        marginRight: 18,
        marginTop: 2,
    },
    rowText: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        flex: 1,
    },
    rowSubtitle: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 16,
        marginTop: 1,
    },
    rowValue: {
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
        marginRight: 8,
    },
    innerDivider: {
        height: 0.5,
        marginLeft: 56,
    },
    participantsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    participantsTitle: {
        fontSize: 13,
        fontFamily: 'Poppins_700Bold',
    },
    searchIconBtn: {
        padding: 4,
    },
    addParticipantCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 18,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    memberAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    memberAvatarText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
    },
    memberName: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
    },
    adminPill: {
        borderWidth: 0.8,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    adminPillText: {
        fontSize: 9,
        fontFamily: 'Poppins_600SemiBold',
    },
    promoteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 0.8,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    promoteBtnText: {
        fontSize: 10,
        fontFamily: 'Poppins_600SemiBold',
    },
    campaignsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    newCampaignBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    newCampaignBtnText: {
        fontSize: 12,
        fontFamily: 'Poppins_700Bold',
    },
    emptyCampaignsBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 16,
    },
    emptyCampaignsText: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        flex: 1,
        lineHeight: 18,
    },
    campaignsList: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 12,
    },
    campaignItem: {
        paddingVertical: 12,
        gap: 8,
    },
    campaignItemTitle: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
    },
    campaignItemDesc: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 18,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 4,
    },
    progressValText: {
        fontSize: 13,
        fontFamily: 'Poppins_700Bold',
    },
    progressPercentText: {
        fontSize: 13,
        fontFamily: 'Poppins_700Bold',
    },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    paymentMethodsBox: {
        borderRadius: 8,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.02)',
        marginTop: 4,
    },
    paymentMethodText: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
    },
    donateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        paddingVertical: 8,
        marginTop: 8,
    },
    donateBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: 'Poppins_700Bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContentCard: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 24,
        borderWidth: 1,
        padding: 20,
        gap: 12,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalTitleText: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        textAlign: 'center',
    },
    modalSubtitleText: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
        lineHeight: 16,
        marginTop: -6,
    },
    inputLabel: {
        fontSize: 10,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: 0.5,
        marginTop: 4,
    },
    modalTextInput: {
        borderBottomWidth: 1.5,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        paddingVertical: 4,
    },
    saveCampaignSubmitBtn: {
        paddingVertical: 14,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    paymentInstructionsContainer: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginTop: 6,
        gap: 2,
    },
    instructionsTitle: {
        fontSize: 12,
        fontFamily: 'Poppins_700Bold',
    },
    instructionsBody: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 16,
        marginBottom: 4,
    },
    instructionsDetail: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
    },
    modalActionButtonsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    modalActionBtn: {
        flex: 1,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCancelActionBtn: {
        backgroundColor: 'transparent',
    },
    modalSubmitActionBtn: {
        elevation: 2,
    },
    modalBtnText: {
        fontSize: 13,
        fontFamily: 'Poppins_700Bold',
    },
    memberMenuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    memberMenuSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 32,
    },
    memberMenuGrabber: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    memberMenuHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingBottom: 12,
    },
    memberMenuName: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
    },
    memberMenuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 16,
    },
    memberMenuRowText: {
        fontSize: 15,
        fontFamily: 'Poppins_600SemiBold',
    },
    memberMenuCancel: {
        marginTop: 12,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: 'center',
    },
});
