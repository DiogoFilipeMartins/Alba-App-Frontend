import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/apiService';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
    const { profile, refreshProfile } = useAuth();
    const { colors, isDark } = useTheme();

    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Aviso', 'O nome não pode estar vazio.');
            return;
        }

        try {
            setSaving(true);
            await apiService.updateProfile({
                full_name: fullName.trim(),
                phone: phone.trim() || undefined,
            });
            await refreshProfile();
            Alert.alert('Sucesso', 'O teu perfil foi atualizado.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error: any) {
            Alert.alert('Erro', error?.message || 'Não foi possível atualizar o perfil.');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = [
        styles.input,
        {
            backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
            color: colors.textPrimary,
            borderColor: colors.border,
        },
    ];

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Dados Pessoais</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
                    {saving
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <Text style={[styles.saveText, { color: colors.primary }]}>Guardar</Text>
                    }
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {/* Avatar placeholder */}
                <View style={styles.avatarSection}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.avatarTxt}>
                            {(fullName[0] || profile?.full_name?.[0] || 'U').toUpperCase()}
                        </Text>
                    </View>
                    <Text style={[styles.avatarEmail, { color: colors.textSecondary }]}>
                        {profile?.email || ''}
                    </Text>
                </View>

                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>NOME COMPLETO</Text>
                        <TextInput
                            style={inputStyle}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="O teu nome"
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>TELEFONE (OPCIONAL)</Text>
                        <TextInput
                            style={inputStyle}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="+351 9XX XXX XXX"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>EMAIL</Text>
                        <View style={[styles.disabledInput, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', borderColor: colors.border }]}>
                            <Text style={[styles.disabledText, { color: colors.textMuted }]}>{profile?.email || '—'}</Text>
                            <Ionicons name="lock-closed" size={14} color={colors.textMuted} style={{ marginLeft: 8 }} />
                        </View>
                        <Text style={[styles.hint, { color: colors.textMuted }]}>
                            O email não pode ser alterado aqui.
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveFullBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving
                        ? <ActivityIndicator color="#fff" />
                        : <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.saveFullBtnText}>Guardar alterações</Text>
                        </>
                    }
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    saveBtn: { padding: 4, minWidth: 70, alignItems: 'flex-end' },
    saveText: { fontSize: 16, fontWeight: '600' },
    content: { padding: 24, gap: 20 },
    avatarSection: { alignItems: 'center', paddingVertical: 16 },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    avatarTxt: { color: '#FFF', fontSize: 38, fontWeight: '900' },
    avatarEmail: { fontSize: 14 },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    fieldGroup: { padding: 18 },
    label: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    input: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
    },
    disabledInput: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    disabledText: { fontSize: 16, flex: 1 },
    hint: { fontSize: 12, marginTop: 6 },
    divider: { height: 1, marginHorizontal: 18 },
    saveFullBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
        borderRadius: 20,
        marginTop: 8,
    },
    saveFullBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
