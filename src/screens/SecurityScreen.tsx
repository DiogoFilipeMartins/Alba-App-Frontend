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
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/apiService';

type Props = NativeStackScreenProps<RootStackParamList, 'Security'>;

export default function SecurityScreen({ navigation }: Props) {
    const { colors, isDark } = useTheme();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleChangePassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            Alert.alert('Password inválida', 'A nova password deve ter pelo menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('As passwords não coincidem', 'Confirma que as duas passwords são iguais.');
            return;
        }

        try {
            setSaving(true);
            await apiService.changePassword(newPassword);
            Alert.alert(
                'Password alterada ✓',
                'A tua password foi atualizada com sucesso.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert('Erro', error?.message || 'Não foi possível alterar a password.');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = (hasValue: boolean) => [
        styles.input,
        {
            backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
            color: colors.textPrimary,
            borderColor: hasValue ? colors.primary : colors.border,
        },
    ];

    const strengthLevel = (() => {
        if (!newPassword) return 0;
        let score = 0;
        if (newPassword.length >= 8) score++;
        if (/[A-Z]/.test(newPassword)) score++;
        if (/[0-9]/.test(newPassword)) score++;
        if (/[^A-Za-z0-9]/.test(newPassword)) score++;
        return score;
    })();

    const strengthLabel = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'][strengthLevel];
    const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][strengthLevel];

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Segurança</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {/* Info banner */}
                <View style={[styles.infoBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
                    <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.primary }]}>
                        A nova password será aplicada imediatamente. Precisarás de fazer login novamente noutros dispositivos.
                    </Text>
                </View>

                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {/* New Password */}
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>NOVA PASSWORD</Text>
                        <View style={styles.inputWrap}>
                            <TextInput
                                style={[inputStyle(newPassword.length > 0), { flex: 1 }]}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="Mínimo 6 caracteres"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry={!showNew}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                onPress={() => setShowNew(v => !v)}
                                style={[styles.eyeBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                            >
                                <Ionicons name={showNew ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Strength bar */}
                        {newPassword.length > 0 && (
                            <View style={styles.strengthRow}>
                                {[1, 2, 3, 4].map(i => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.strengthBar,
                                            { backgroundColor: i <= strengthLevel ? strengthColor : (isDark ? '#2C2C2E' : '#E5E5EA') }
                                        ]}
                                    />
                                ))}
                                <Text style={[styles.strengthLabel, { color: strengthColor }]}>{strengthLabel}</Text>
                            </View>
                        )}
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Confirm Password */}
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>CONFIRMAR PASSWORD</Text>
                        <View style={styles.inputWrap}>
                            <TextInput
                                style={[
                                    inputStyle(confirmPassword.length > 0),
                                    { flex: 1 },
                                    confirmPassword && newPassword !== confirmPassword && { borderColor: '#ef4444' },
                                ]}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Repete a nova password"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry={!showConfirm}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                onPress={() => setShowConfirm(v => !v)}
                                style={[styles.eyeBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                            >
                                <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                            <Text style={styles.errorHint}>As passwords não coincidem</Text>
                        )}
                        {confirmPassword.length > 0 && newPassword === confirmPassword && (
                            <Text style={[styles.successHint, { color: '#22c55e' }]}>✓ As passwords coincidem</Text>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    style={[
                        styles.submitBtn,
                        { backgroundColor: colors.primary },
                        (saving || !newPassword || !confirmPassword) && { opacity: 0.6 }
                    ]}
                    onPress={handleChangePassword}
                    disabled={saving || !newPassword || !confirmPassword}
                >
                    {saving
                        ? <ActivityIndicator color="#fff" />
                        : <>
                            <Ionicons name="key" size={20} color="#fff" />
                            <Text style={styles.submitBtnText}>Alterar Password</Text>
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
    content: { padding: 24, gap: 20 },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    infoText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '500' },
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
    inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    input: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
    },
    eyeBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    strengthBar: { flex: 1, height: 4, borderRadius: 2 },
    strengthLabel: { fontSize: 12, fontWeight: '700', marginLeft: 4 },
    errorHint: { color: '#ef4444', fontSize: 12, marginTop: 6, fontWeight: '500' },
    successHint: { fontSize: 12, marginTop: 6, fontWeight: '500' },
    divider: { height: 1, marginHorizontal: 18 },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
        borderRadius: 20,
        marginTop: 8,
    },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
