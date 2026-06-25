import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfessionalProfile'>;

export default function EditProfessionalProfileScreen({ navigation }: Props) {
    const { colors, isDark } = useTheme();
    const { profile, refreshProfile, isProfessional, isInstitution } = useAuth();

    const [specialty, setSpecialty] = useState(profile?.specialty || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [website, setWebsite] = useState(profile?.website || '');
    const [saving, setSaving] = useState(false);

    const accountType = profile?.account_type;
    const verified = profile?.verified === true;

    const accentColor = isProfessional ? '#0ebd5f' : '#7c3aed';
    const iconName: any = isProfessional ? 'medkit' : 'business';

    const handleSave = async () => {
        try {
            setSaving(true);
            await apiService.updateProfile({
                specialty: specialty.trim() || undefined,
                bio: bio.trim() || undefined,
                website: website.trim() || undefined,
            });
            await refreshProfile();
            Alert.alert('Guardado', 'O teu perfil profissional foi atualizado.');
            navigation.goBack();
        } catch (e: any) {
            Alert.alert('Erro', e.message || 'Não foi possível guardar as alterações.');
        } finally {
            setSaving(false);
        }
    };

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
                    {saving
                        ? <ActivityIndicator size="small" color={accentColor} />
                        : <Text style={[styles.saveBtnText, { color: accentColor }]}>Guardar</Text>
                    }
                </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {/* Verification status banner */}
                <View style={[
                    styles.verificationBanner,
                    {
                        backgroundColor: verified ? '#0ebd5f15' : '#b4530915',
                        borderColor: verified ? '#0ebd5f30' : '#b4530930',
                    }
                ]}>
                    <View style={[styles.verificationIcon, { backgroundColor: verified ? '#0ebd5f' : '#b45309' }]}>
                        <Ionicons name={verified ? 'shield-checkmark' : 'time'} size={20} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.verificationTitle, { color: verified ? '#0ebd5f' : '#b45309' }]}>
                            {verified ? 'Conta Verificada' : 'Verificação Pendente'}
                        </Text>
                        <Text style={[styles.verificationDesc, { color: colors.textSecondary }]}>
                            {verified
                                ? 'O teu perfil está verificado e o badge aparece publicamente.'
                                : 'A nossa equipa está a analisar o teu perfil. Serás notificado assim que for verificado.'
                            }
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

                {/* Form */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        {isProfessional ? 'ESPECIALIDADE' : 'TIPO DE INSTITUIÇÃO'}
                    </Text>
                    <View style={[styles.inputWrap, { backgroundColor: colors.card }]}>
                        <Ionicons name="briefcase-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
                        <TextInput
                            value={specialty}
                            onChangeText={setSpecialty}
                            placeholder={isProfessional
                                ? 'Ex: Terapeuta ABA, Psicólogo Clínico...'
                                : 'Ex: Centro de Terapias, Associação...'
                            }
                            placeholderTextColor={colors.textMuted}
                            style={[styles.input, { color: colors.textPrimary }]}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BIO / DESCRIÇÃO</Text>
                    <View style={[styles.inputWrap, styles.inputWrapMulti, { backgroundColor: colors.card }]}>
                        <Ionicons name="document-text-outline" size={18} color={colors.textMuted} style={{ marginRight: 12, marginTop: 2 }} />
                        <TextInput
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Apresenta-te brevemente. Esta informação será visível no teu perfil público."
                            placeholderTextColor={colors.textMuted}
                            style={[styles.input, styles.inputMulti, { color: colors.textPrimary }]}
                            multiline
                            numberOfLines={4}
                        />
                    </View>
                    <Text style={[styles.hint, { color: colors.textMuted }]}>{bio.length}/400 caracteres</Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>WEBSITE</Text>
                    <View style={[styles.inputWrap, { backgroundColor: colors.card }]}>
                        <Ionicons name="globe-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
                        <TextInput
                            value={website}
                            onChangeText={setWebsite}
                            placeholder="https://www.exemplo.pt"
                            placeholderTextColor={colors.textMuted}
                            style={[styles.input, { color: colors.textPrimary }]}
                            autoCapitalize="none"
                            keyboardType="url"
                        />
                    </View>
                </View>

                {/* Info box */}
                <View style={[styles.infoBox, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', borderColor: colors.border }]}>
                    <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} style={{ marginTop: 1 }} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        O teu perfil público (especialidade, bio e website) é visível para outros utilizadores da app ao consultarem a listagem de profissionais.
                    </Text>
                </View>

                <Pressable
                    onPress={handleSave}
                    disabled={saving}
                    style={[styles.saveFullBtn, { backgroundColor: accentColor }]}
                >
                    {saving
                        ? <ActivityIndicator color="#fff" />
                        : <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.saveFullBtnText}>Guardar Alterações</Text>
                        </>
                    }
                </Pressable>
            </ScrollView>
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
    typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginBottom: 24 },
    typeBadgeText: { fontSize: 13, fontFamily: 'Poppins_700Bold' },
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
});
