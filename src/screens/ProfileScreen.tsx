import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { FavoritePlace, favoritesService } from '../services/favoritesService';
import { apiService } from '../services/apiService';

import { SafeAreaView } from 'react-native-safe-area-context';

type Props = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Profile'>,
    NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
    const { profile, signOut, isAdmin } = useAuth();
    const { colors, isDark, toggleTheme } = useTheme();
    const username = profile?.username || 'Utilizador';
    const [favorites, setFavorites] = useState<FavoritePlace[]>([]);

    useEffect(() => {
        const loadFavorites = async () => {
            const data = await favoritesService.list();
            setFavorites(data);
        };

        const unsubscribe = navigation.addListener('focus', loadFavorites);
        loadFavorites();

        return unsubscribe;
    }, [navigation]);

    const handleLogout = async () => {
        Alert.alert(
            'Terminar Sessão',
            'Tens a certeza que queres sair?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Sair', 
                    style: 'destructive', 
                    onPress: async () => {
                        try {
                            await signOut();
                        } catch (error: any) {
                            Alert.alert('Erro', error?.message || 'Não foi possível terminar a sessão.');
                        }
                    } 
                },
            ]
        );
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            'Eliminar Conta',
            'Esta ação é definitiva e remove o teu perfil e os teus eventos. Queres continuar?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiService.deleteMyAccount();
                            await signOut();
                        } catch (error: any) {
                            Alert.alert('Erro', error?.message || 'Não foi possível eliminar a conta.');
                        }
                    },
                },
            ]
        );
    };

    const menuItems = [
        { icon: 'add-circle-outline', label: 'Sugerir Local', onPress: () => navigation.navigate('SuggestPlace', {}) },
        { icon: 'heart-outline', label: 'Doar e Apoiar', onPress: () => navigation.navigate('Donations') },
        { icon: 'person-outline', label: 'Dados Pessoais', onPress: () => {} },
        { icon: 'notifications-outline', label: 'Notificações', onPress: () => {} },
        { icon: 'shield-checkmark-outline', label: 'Segurança', onPress: () => {} },
        { icon: 'help-circle-outline', label: 'Suporte', onPress: () => {} },
    ];

    if (isAdmin) {
        menuItems.unshift({ icon: 'settings-outline', label: 'Painel Admin', onPress: () => (navigation as any).navigate('Admin') });
    }

    return (
        <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <View style={s.header}>
                    <View style={[s.avatar, { backgroundColor: colors.primary }]}>
                        <Text style={s.avatarTxt}>{(username[0] || 'U').toUpperCase()}</Text>
                    </View>
                    <Text style={[s.name, { color: colors.textPrimary }]}>{username}</Text>
                    {isAdmin && (
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
                        onPress={toggleTheme}
                    >
                        <View style={[s.iconBox, { backgroundColor: isDark ? colors.background : colors.surface }]}>
                            <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={18} color={colors.accent} />
                        </View>
                        <Text style={[s.itemLabel, { flex: 1, color: colors.textPrimary }]}>Modo {isDark ? 'Escuro' : 'Claro'}</Text>
                        <Switch 
                            value={isDark} 
                            onValueChange={toggleTheme}
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
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingBottom: 40 },
    header: { alignItems: 'center', paddingVertical: 64 },
    avatar: { width: 100, height: 100, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    avatarTxt: { color: '#FFF', fontSize: 42, fontWeight: '900' },
    name: { fontSize: 26, fontWeight: '900' },

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
