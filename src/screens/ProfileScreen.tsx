import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../contexts/AuthContext';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
    const { profile, signOut, isAdmin } = useAuth();
    const username = profile?.username || 'Utilizador';

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

    const menuItems = [
        { icon: 'person-outline', label: 'Dados Pessoais', onPress: () => {} },
        { icon: 'notifications-outline', label: 'Notificações', onPress: () => {} },
        { icon: 'shield-checkmark-outline', label: 'Segurança', onPress: () => {} },
        { icon: 'help-circle-outline', label: 'Suporte', onPress: () => {} },
    ];

    if (isAdmin) {
        menuItems.unshift({ icon: 'settings-outline', label: 'Painel Admin', onPress: () => (navigation as any).navigate('Admin') });
    }

    return (
        <View style={s.root}>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <View style={s.header}>
                    <View style={s.avatar}>
                        <Text style={s.avatarTxt}>{(username[0] || 'U').toUpperCase()}</Text>
                    </View>
                    <Text style={s.name}>{username}</Text>
                    {isAdmin && (
                        <View style={tw`bg-[#058c42]/20 px-3 py-1 rounded-full mt-2`}>
                            <Text style={tw`text-[#16db65] text-xs font-bold uppercase tracking-wider`}>Administrador</Text>
                        </View>
                    )}
                </View>

                <View style={s.section}>
                    <Text style={s.secTitle}>Definições</Text>
                    <View style={s.card}>
                        {menuItems.map((item, i) => (
                            <TouchableOpacity
                                key={item.label}
                                style={[s.item, i < menuItems.length - 1 && s.itemBorder]}
                                onPress={() => item.onPress()}
                            >
                                <View style={s.iconBox}>
                                    <Ionicons name={item.icon as any} size={18} color="#16db65" />
                                </View>
                                <Text style={s.itemLabel}>{item.label}</Text>
                                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={s.section}>
                    <TouchableOpacity 
                        style={[s.card, s.toggleArea]}
                        onPress={() => {}}
                    >
                        <View style={s.iconBox}>
                            <Ionicons name="moon-outline" size={18} color="#16db65" />
                        </View>
                        <Text style={[s.itemLabel, { flex: 1 }]}>Modo Escuro</Text>
                        <Switch 
                            value={true} 
                            disabled
                            trackColor={{ false: '#1a1a1a', true: '#058c42' }}
                            thumbColor="#FFF"
                        />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    <Text style={s.logoutTxt}>Terminar Sessão</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#020202' },
    scroll: { paddingBottom: 40 },
    header: { alignItems: 'center', paddingVertical: 64 },
    avatar: { width: 100, height: 100, borderRadius: 25, backgroundColor: '#058c42', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWeight: 1, borderColor: '#16db6520' },
    avatarTxt: { color: '#FFF', fontSize: 42, fontWeight: '900' },
    name: { fontSize: 26, fontWeight: '900', color: '#e2e8f0' },

    section: { paddingHorizontal: 24, marginTop: 10 },
    secTitle: { fontSize: 13, fontWeight: '800', color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 },
    card: { backgroundColor: '#1a1a1a', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#058c4220' },
    item: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16 },
    itemBorder: { borderBottomWidth: 1, borderBottomColor: '#058c4210' },
    iconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#020202', alignItems: 'center', justifyContent: 'center' },
    itemLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: '#e2e8f0' },
    toggleArea: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 24, marginTop: 40, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#ef444433', backgroundColor: '#ef444405' },
    logoutTxt: { fontSize: 16, fontWeight: '800', color: '#ef4444' },
});
