import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { FavoritePlace, favoritesService } from '../services/favoritesService';
import { apiService } from '../services/apiService';
import { notificationService } from '../services/notificationService';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlertModal from '../components/CustomAlertModal';

type Props = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Profile'>,
    NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
    const { profile, signOut, isAdmin, isProfessional, isInstitution } = useAuth();
    const { colors, isDark } = useTheme();
    const username = profile?.full_name || profile?.username || 'Utilizador';
    const [favorites, setFavorites] = useState<FavoritePlace[]>([]);

    const isSpecialAccount = isProfessional || isInstitution;
    const accountColor = isProfessional ? '#0ebd5f' : isInstitution ? '#7c3aed' : colors.primary;
    const accountLabel = isProfessional ? 'Profissional' : isInstitution ? 'Instituição' : null;
    const accountIcon: any = isProfessional ? 'medkit' : isInstitution ? 'business' : null;

    const [notificationsGranted, setNotificationsGranted] = useState(false);

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

    useEffect(() => {
        const loadFavorites = async () => {
            const data = await favoritesService.list();
            setFavorites(data);
        };

        const checkNotifications = async () => {
            const granted = await notificationService.requestPermissions();
            setNotificationsGranted(granted);
        };

        const unsubscribe = navigation.addListener('focus', loadFavorites);
        loadFavorites();
        checkNotifications();

        return unsubscribe;
    }, [navigation]);

    const handleToggleNotifications = async () => {
        const granted = await notificationService.requestPermissions();
        setNotificationsGranted(granted);
        if (!granted) {
            showAlert(
                'Permissão necessária',
                'Para ativar notificações, vai às Definições do teu telemóvel e ativa as notificações para a Alba App.',
                'notifications-off-outline',
                colors.textMuted
            );
        }
    };

    const handleLogout = async () => {
        showAlert(
            'Terminar Sessão',
            'Tens a certeza que queres sair da tua conta?',
            'log-out-outline',
            '#ef4444',
            {
                text: 'Sair',
                destructive: true,
                onPress: async () => {
                    try {
                        await signOut();
                    } catch (error: any) {
                        showAlert('Erro', error?.message || 'Não foi possível terminar a sessão.', 'alert-circle-outline', '#ef4444');
                    }
                }
            },
            {
                text: 'Cancelar',
                onPress: () => {}
            }
        );
    };

    const handleDeleteAccount = async () => {
        showAlert(
            'Eliminar Conta',
            'Esta ação é definitiva e removerá o teu perfil e todos os teus dados permanentemente. Tens a certeza?',
            'trash-outline',
            '#ef4444',
            {
                text: 'Eliminar',
                destructive: true,
                onPress: async () => {
                    try {
                        await apiService.deleteMyAccount();
                        await signOut();
                    } catch (error: any) {
                        showAlert('Erro', error?.message || 'Não foi possível eliminar a conta.', 'alert-circle-outline', '#ef4444');
                    }
                }
            },
            {
                text: 'Cancelar',
                onPress: () => {}
            }
        );
    };

    const handleSuggestPlace = () => {
        if (isInstitution && profile?.verified !== true) {
            showAlert(
                'Acesso Restrito',
                'O seu perfil de Instituição ainda está pendente de aprovação por um administrador. Não pode sugerir locais até que a sua conta seja aprovada.',
                'lock-closed-outline',
                '#f59e0b'
            );
            return;
        }
        navigation.navigate('SuggestPlace', {});
    };

    const menuItems = [
        { icon: 'add-circle-outline', label: 'Sugerir Local', onPress: handleSuggestPlace },
        { icon: 'heart-outline', label: 'Doar e Apoiar', onPress: () => navigation.navigate('Donations') },
        { icon: 'person-outline', label: 'Dados Pessoais', onPress: () => (navigation as any).navigate('EditProfile') },
        { icon: 'shield-checkmark-outline', label: 'Segurança', onPress: () => (navigation as any).navigate('Security') },
        { icon: 'eye-outline', label: 'Aparência', onPress: () => (navigation as any).navigate('Appearance') },
        { icon: 'newspaper-outline', label: 'Notícias sobre Autismo', onPress: () => navigation.navigate('News') },
    ];

    if (isSpecialAccount) {
        menuItems.unshift({
            icon: isProfessional ? 'medkit-outline' : 'business-outline',
            label: isProfessional ? 'Perfil Profissional' : 'Perfil da Instituição',
            onPress: () => (navigation as any).navigate('EditProfessionalProfile'),
        });
    }

    if (isAdmin) {
        menuItems.unshift({ icon: 'settings-outline', label: 'Painel Admin', onPress: () => (navigation as any).navigate('Admin') });
    }

    return (
        <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <View style={s.header}>
                    <View style={[s.avatar, { backgroundColor: isSpecialAccount ? accountColor : colors.primary }]}>
                        <Text style={s.avatarTxt}>{(username[0] || 'U').toUpperCase()}</Text>
                        {/* Verified shield overlay */}
                        {isSpecialAccount && profile?.verified && (
                            <View style={[s.verifiedBadge, { backgroundColor: accountColor }]}>
                                <Ionicons name="shield-checkmark" size={12} color="#fff" />
                            </View>
                        )}
                    </View>
                    <Text style={[s.name, { color: colors.textPrimary }]}>{username}</Text>

                    {/* Account type badge */}
                    {isSpecialAccount && (
                        <View style={[s.accountBadge, { backgroundColor: accountColor + '18', borderColor: accountColor + '40' }]}>
                            <Ionicons name={accountIcon} size={13} color={accountColor} />
                            <Text style={[s.accountBadgeText, { color: accountColor }]}>
                                {accountLabel}{profile?.verified ? ' · Verificado' : ' · Pendente'}
                            </Text>
                        </View>
                    )}

                    {/* Specialty line */}
                    {isSpecialAccount && !!profile?.specialty && (
                        <Text style={[s.specialty, { color: colors.textSecondary }]}>{profile.specialty}</Text>
                    )}

                    {isAdmin && !isSpecialAccount && (
                        <View style={[tw`px-3 py-1 rounded-full mt-2`, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[tw`text-xs font-bold uppercase tracking-wider`, { color: colors.accent }]}>Administrador</Text>
                        </View>
                    )}
                </View>

                <View style={s.section}>
                    <Text style={[s.secTitle, { color: colors.textMuted }]}>Favoritos</Text>
                    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                        <View style={s.favoriteSummary}>
                            <View style={[s.iconBox, { backgroundColor: isDark ? colors.background : colors.surface }]}> 
                                <Ionicons name="heart" size={18} color="#ef4444" />
                            </View>
                            <View style={s.favoriteMeta}>
                                <Text style={[s.itemLabel, { color: colors.textPrimary }]}>{favorites.length} local(is) guardado(s)</Text>
                                <Text style={[s.favoriteText, { color: colors.textSecondary }]}>Os teus locais favoritos ficam guardados neste dispositivo.</Text>
                            </View>
                        </View>
                        {favorites.slice(0, 3).map((favorite, index) => (
                            <View key={favorite.id} style={[s.favoriteRow, index < Math.min(favorites.length, 3) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                                <Text style={[s.favoriteName, { color: colors.textPrimary }]}>{favorite.name}</Text>
                                <Text style={[s.favoriteText, { color: colors.textSecondary }]}>{favorite.city || (favorite.type === 'professional' ? 'Profissional' : 'Instituição')}</Text>
                            </View>
                        ))}
                        {favorites.length === 0 && (
                            <View style={s.favoriteRow}>
                                <Text style={[s.favoriteText, { color: colors.textSecondary }]}>Ainda não guardaste locais favoritos.</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={s.section}>
                    <Text style={[s.secTitle, { color: colors.textMuted }]}>Definições</Text>
                    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {menuItems.map((item, i) => (
                            <TouchableOpacity
                                key={item.label}
                                style={[s.item, i < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                                onPress={() => item.onPress()}
                            >
                                <View style={[s.iconBox, { backgroundColor: isDark ? colors.background : colors.surface }]}>
                                    <Ionicons name={item.icon as any} size={18} color={colors.accent} />
                                </View>
                                <Text style={[s.itemLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>



                <View style={s.section}>
                    <TouchableOpacity 
                        style={[s.card, s.toggleArea, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={handleToggleNotifications}
                    >
                        <View style={[s.iconBox, { backgroundColor: isDark ? colors.background : colors.surface }]}>
                            <Ionicons name={notificationsGranted ? 'notifications' : 'notifications-outline'} size={18} color={colors.accent} />
                        </View>
                        <Text style={[s.itemLabel, { flex: 1, color: colors.textPrimary }]}>Notificações</Text>
                        <Switch 
                            value={notificationsGranted} 
                            onValueChange={handleToggleNotifications}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor="#FFF"
                        />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={[s.logoutBtn, { borderColor: '#ef444433', backgroundColor: '#ef444405' }]} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    <Text style={s.logoutTxt}>Terminar Sessão</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[s.deleteBtn, { borderColor: '#b91c1c33', backgroundColor: '#b91c1c10' }]} onPress={handleDeleteAccount}>
                    <Ionicons name="trash-outline" size={20} color="#b91c1c" />
                    <Text style={s.deleteTxt}>Eliminar Conta</Text>
                </TouchableOpacity>
            </ScrollView>
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
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingBottom: 40 },
    header: { alignItems: 'center', paddingVertical: 48 },
    avatar: { width: 100, height: 100, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 16, position: 'relative' },
    avatarTxt: { color: '#FFF', fontSize: 42, fontWeight: '900' },
    verifiedBadge: { position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    name: { fontSize: 26, fontWeight: '900' },
    accountBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginTop: 10 },
    accountBadgeText: { fontSize: 13, fontWeight: '700' },
    specialty: { fontSize: 14, fontWeight: '500', marginTop: 4 },

    section: { paddingHorizontal: 24, marginTop: 10 },
    secTitle: { fontSize: 13, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 },
    card: { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
    item: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16 },
    iconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    itemLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
    favoriteSummary: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16 },
    favoriteMeta: { flex: 1 },
    favoriteRow: { paddingHorizontal: 18, paddingVertical: 14 },
    favoriteName: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
    favoriteText: { fontSize: 13, lineHeight: 18 },
    toggleArea: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 24, marginTop: 40, padding: 20, borderRadius: 20, borderWidth: 1 },
    logoutTxt: { fontSize: 16, fontWeight: '800', color: '#ef4444' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 24, marginTop: 14, padding: 18, borderRadius: 20, borderWidth: 1 },
    deleteTxt: { fontSize: 15, fontWeight: '800', color: '#b91c1c' },
});
