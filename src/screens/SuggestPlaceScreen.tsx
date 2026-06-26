import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from 'react-native';
import CustomAlertModal from '../components/CustomAlertModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import tw from 'twrnc';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SuggestPlace'>;

export default function SuggestPlaceScreen({ navigation, route }: Props) {
    const { user, profile, isInstitution } = useAuth();
    const { colors } = useTheme();

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
        if (isInstitution && profile?.verified !== true) {
            showAlert(
                'Acesso Restrito',
                'O seu perfil de Instituição ainda está pendente de aprovação por um administrador. Não pode sugerir locais até que a sua conta seja aprovada.',
                'lock-closed-outline',
                '#f59e0b',
                { text: 'OK', onPress: () => navigation.goBack() }
            );
        }
    }, [isInstitution, profile, navigation]);

    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [locLoading, setLocLoading] = useState(false);

    const [form, setForm] = useState({
        name: '',
        type: 'professional' as 'professional' | 'institution',
        description: '',
        phone: '',
        email: '',
        website: '',
        address_line: '',
        city: '',
        postal_code: '',
        lat: '',
        lng: '',
        wheelchair_accessible: false,
        low_noise: false,
        soft_lighting: false,
    });

    const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

    useEffect(() => {
        const coords = route.params?.pickedCoords;
        if (coords) {
            setForm((f) => ({
                ...f,
                lat: String(coords.lat),
                lng: String(coords.lng),
            }));
            // Automatically advance or stay in step 2
        }
    }, [route.params?.pickedCoords]);

    const useMyLocation = async () => {
        try {
            setLocLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showAlert('Permissão negada', 'Precisamos de acesso à localização.', 'location-outline', colors.textMuted);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            setForm((f) => ({
                ...f,
                lat: String(loc.coords.latitude),
                lng: String(loc.coords.longitude),
            }));
        } catch (e) {
            showAlert('Erro', 'Não foi possível obter a localização.', 'alert-circle-outline', '#ef4444');
        } finally {
            setLocLoading(false);
        }
    };

    const handleSubmit = async () => {
        const lat = parseFloat(form.lat);
        const lng = parseFloat(form.lng);
        if (isNaN(lat) || isNaN(lng)) {
            showAlert('Coordenadas inválidas', 'Latitude e longitude devem ser números.', 'alert-circle-outline', '#ef4444');
            return;
        }

        try {
            setLoading(true);
            await apiService.createPlace({
                name: form.name.trim(),
                type: form.type,
                description: form.description.trim() || null,
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                website: form.website.trim() || null,
                address_line: form.address_line.trim() || null,
                city: form.city.trim() || null,
                postal_code: form.postal_code.trim() || null,
                latitude: lat,
                longitude: lng,
                created_by: user?.id ?? null,
                accessibility: {
                    wheelchair_accessible: form.wheelchair_accessible,
                    low_noise: form.low_noise,
                    soft_lighting: form.soft_lighting,
                },
            });

            showAlert(
                'Sugestão enviada! 🎉',
                'O teu local foi submetido e será revisto por um administrador.',
                'checkmark-circle-outline',
                colors.primary,
                { text: 'OK', onPress: () => navigation.goBack() }
            );
        } catch (e: any) {
            console.error('Erro ao sugerir local:', e);
            showAlert('Erro', e.message || 'Não foi possível enviar a sugestão.', 'alert-circle-outline', '#ef4444');
        } finally {
            setLoading(false);
        }
    };

    const isStepValid = () => {
        if (currentStep === 1) {
            return form.name.trim().length > 0;
        }
        if (currentStep === 2) {
            const latNum = parseFloat(form.lat);
            const lngNum = parseFloat(form.lng);
            return form.lat.trim().length > 0 && form.lng.trim().length > 0 && !isNaN(latNum) && !isNaN(lngNum);
        }
        return true;
    };

    const handleNext = () => {
        if (isStepValid()) {
            if (currentStep < 3) {
                setCurrentStep(currentStep + 1);
            } else {
                handleSubmit();
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        } else {
            navigation.goBack();
        }
    };

    const getInputStyle = (field: string) => [
        styles.input,
        {
            backgroundColor: colors.card,
            color: colors.textPrimary,
            borderColor: focusedField === field ? colors.primary : colors.border,
        }
    ];

    const steps = [
        { label: 'Básico', description: 'Dados Gerais' },
        { label: 'Morada & Mapa', description: 'Onde Encontrar' },
        { label: 'Acessos', description: 'Características' }
    ];

    return (
        <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.background }]} edges={['top']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={tw`flex-1`}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <Pressable onPress={handleBack} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color={colors.primary} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Sugerir Local</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Wizard Steps Bar */}
                <View style={[styles.stepsContainer, { borderBottomColor: colors.border }]}>
                    <View style={styles.stepsLinesContainer}>
                        <View style={[styles.absoluteStepLine, { left: 0, right: '50%', backgroundColor: currentStep >= 2 ? colors.primary : colors.border }]} />
                        <View style={[styles.absoluteStepLine, { left: '50%', right: 0, backgroundColor: currentStep >= 3 ? colors.primary : colors.border }]} />
                    </View>

                    {steps.map((step, idx) => {
                        const stepNum = idx + 1;
                        const isCompleted = currentStep > stepNum;
                        const isActive = currentStep === stepNum;
                        return (
                            <View key={step.label} style={styles.stepBubbleContainer}>
                                <View style={[
                                    styles.stepBubble,
                                    { backgroundColor: colors.background },
                                    isActive && { borderColor: colors.primary, backgroundColor: colors.primary },
                                    isCompleted && { borderColor: colors.primary, backgroundColor: colors.primary }
                                ]}>
                                    {isCompleted ? (
                                        <Ionicons name="checkmark" size={14} color="#FFF" />
                                    ) : isActive ? (
                                        <Text style={[styles.stepNumber, { color: '#FFF' }]}>
                                            {stepNum}
                                        </Text>
                                    ) : (
                                        <Text style={[
                                            styles.stepNumber,
                                            { color: colors.textMuted }
                                        ]}>
                                            {stepNum}
                                        </Text>
                                    )}
                                </View>
                                <Text style={[
                                    styles.stepLabel,
                                    { color: isActive ? colors.primary : colors.textMuted }
                                ]}>
                                    {step.label}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                {/* Form Panels */}
                <ScrollView 
                    style={tw`flex-1`}
                    contentContainerStyle={tw`px-6 pt-6 pb-28`}
                    showsVerticalScrollIndicator={false} 
                    keyboardShouldPersistTaps="handled"
                >
                    {/* STEP 1: BASIC INFO */}
                    {currentStep === 1 && (
                        <View style={tw`gap-4`}>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Selecione o Tipo de Local</Text>
                            
                            <View style={tw`flex-row mb-4 gap-3`}>
                                {/* Professional Card */}
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onPress={() => setForm(f => ({ ...f, type: 'professional' }))}
                                    style={[
                                        styles.typeCard,
                                        { backgroundColor: colors.card, borderColor: form.type === 'professional' ? '#16db65' : colors.border },
                                        form.type === 'professional' && { backgroundColor: 'rgba(22, 219, 101, 0.08)' },
                                    ]}
                                >
                                    <View style={[styles.typeIconContainer, { backgroundColor: form.type === 'professional' ? '#16db65' : colors.border + '30' }]}>
                                        <Ionicons name="person" size={22} color={form.type === 'professional' ? '#FFF' : colors.textSecondary} />
                                    </View>
                                    <Text style={[styles.typeTitle, { color: colors.textPrimary }]}>Profissional</Text>
                                    <Text style={[styles.typeDesc, { color: colors.textSecondary }]}>Terapeutas, médicos e especialistas individuais.</Text>
                                </TouchableOpacity>

                                {/* Institution Card */}
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onPress={() => setForm(f => ({ ...f, type: 'institution' }))}
                                    style={[
                                        styles.typeCard,
                                        { backgroundColor: colors.card, borderColor: form.type === 'institution' ? '#22c55e' : colors.border },
                                        form.type === 'institution' && { backgroundColor: 'rgba(34, 197, 94, 0.08)' },
                                    ]}
                                >
                                    <View style={[styles.typeIconContainer, { backgroundColor: form.type === 'institution' ? '#22c55e' : colors.border + '30' }]}>
                                        <Ionicons name="business" size={22} color={form.type === 'institution' ? '#FFF' : colors.textSecondary} />
                                    </View>
                                    <Text style={[styles.typeTitle, { color: colors.textPrimary }]}>Instituição</Text>
                                    <Text style={[styles.typeDesc, { color: colors.textSecondary }]}>Escolas, associações, clínicas e centros de apoio.</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.label, { color: colors.textSecondary }]}>NOME DO LOCAL OU PROFISSIONAL *</Text>
                            <TextInput
                                style={getInputStyle('name') as any}
                                placeholder="Ex: Dr. António Silva ou Centro de Apoio X"
                                placeholderTextColor={colors.textMuted}
                                value={form.name}
                                onChangeText={set('name')}
                                onFocus={() => setFocusedField('name')}
                                onBlur={() => setFocusedField(null)}
                            />

                            <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIÇÃO / BIOGRAFIA</Text>
                            <TextInput
                                style={[getInputStyle('description'), tw`h-32`] as any}
                                placeholder="Descreva os serviços oferecidos, especialidades e abordagem..."
                                placeholderTextColor={colors.textMuted}
                                value={form.description}
                                onChangeText={set('description')}
                                multiline
                                textAlignVertical="top"
                                onFocus={() => setFocusedField('description')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>
                    )}

                    {/* STEP 2: ADDRESS & LOCATION & CONTACTS */}
                    {currentStep === 2 && (
                        <View style={tw`gap-4`}>
                            {/* Map Coords Picker Card */}
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Localização no Mapa *</Text>
                            
                            <View style={tw`flex-row gap-3 mb-2`}>
                                <Pressable
                                    onPress={() => navigation.navigate('MapPicker', {
                                        initialCoords: form.lat && form.lng
                                            ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) }
                                            : null,
                                    })}
                                    style={[styles.locationBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                >
                                    <Ionicons name="map-outline" size={20} color={colors.primary} />
                                    <Text style={[styles.locationBtnText, { color: colors.textPrimary }]}>Escolher no Mapa</Text>
                                </Pressable>

                                <Pressable
                                    onPress={useMyLocation}
                                    style={[styles.locationBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                >
                                    {locLoading ? (
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    ) : (
                                        <>
                                            <Ionicons name="locate-outline" size={20} color={colors.primary} />
                                            <Text style={[styles.locationBtnText, { color: colors.textPrimary }]}>Usar o meu GPS</Text>
                                        </>
                                    )}
                                </Pressable>
                            </View>

                            {/* Coordinates Status Card */}
                            {form.lat && form.lng ? (
                                <View style={[styles.coordsCard, { backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: '#22c55e' }]}>
                                    <Ionicons name="checkmark-circle" size={20} color="#22c55e" style={tw`mr-2`} />
                                    <View style={tw`flex-1`}>
                                        <Text style={tw`text-green-500 font-bold text-xs`}>LOCALIZAÇÃO DEFINIDA</Text>
                                        <Text style={[tw`text-[11px]`, { color: colors.textSecondary }]}>
                                            Lat: {parseFloat(form.lat).toFixed(6)} | Lng: {parseFloat(form.lng).toFixed(6)}
                                        </Text>
                                    </View>
                                    <Pressable onPress={() => setForm(f => ({ ...f, lat: '', lng: '' }))} style={tw`p-1`}>
                                        <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                                    </Pressable>
                                </View>
                            ) : (
                                <View style={[styles.coordsCard, { backgroundColor: colors.card, borderColor: colors.border, borderStyle: 'dashed' }]}>
                                    <Ionicons name="location-outline" size={20} color={colors.textMuted} style={tw`mr-2`} />
                                    <Text style={[tw`text-xs flex-1`, { color: colors.textMuted }]}>
                                        Nenhuma coordenada geográfica definida. Toque acima para escolher no mapa.
                                    </Text>
                                </View>
                            )}

                            {/* Manual Coords Collapsible inputs */}
                            <View style={tw`flex-row gap-3 mb-2`}>
                                <View style={tw`flex-1`}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>LATITUDE</Text>
                                    <TextInput style={getInputStyle('lat') as any} placeholder="Ex: 38.7169" placeholderTextColor={colors.textMuted} value={form.lat} onChangeText={set('lat')} keyboardType="decimal-pad" onFocus={() => setFocusedField('lat')} onBlur={() => setFocusedField(null)} />
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>LONGITUDE</Text>
                                    <TextInput style={getInputStyle('lng') as any} placeholder="Ex: -9.1399" placeholderTextColor={colors.textMuted} value={form.lng} onChangeText={set('lng')} keyboardType="decimal-pad" onFocus={() => setFocusedField('lng')} onBlur={() => setFocusedField(null)} />
                                </View>
                            </View>

                            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 10 }]}>Morada Física</Text>
                            
                            <Text style={[styles.label, { color: colors.textSecondary }]}>RUA E NÚMERO</Text>
                            <TextInput style={getInputStyle('address_line') as any} placeholder="Ex: Rua Garrett, nº 12, 3º Dto" placeholderTextColor={colors.textMuted} value={form.address_line} onChangeText={set('address_line')} onFocus={() => setFocusedField('address_line')} onBlur={() => setFocusedField(null)} />

                            <View style={tw`flex-row gap-3`}>
                                <View style={tw`flex-2`}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>CIDADE</Text>
                                    <TextInput style={getInputStyle('city') as any} placeholder="Ex: Lisboa" placeholderTextColor={colors.textMuted} value={form.city} onChangeText={set('city')} onFocus={() => setFocusedField('city')} onBlur={() => setFocusedField(null)} />
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>CÓD. POSTAL</Text>
                                    <TextInput style={getInputStyle('postal_code') as any} placeholder="1000-001" placeholderTextColor={colors.textMuted} value={form.postal_code} onChangeText={set('postal_code')} onFocus={() => setFocusedField('postal_code')} onBlur={() => setFocusedField(null)} />
                                </View>
                            </View>

                            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 10 }]}>Contactos do Local</Text>
                            
                            <Text style={[styles.label, { color: colors.textSecondary }]}>NÚMERO DE TELEFONE</Text>
                            <TextInput style={getInputStyle('phone') as any} placeholder="Ex: 213 000 000" placeholderTextColor={colors.textMuted} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)} />

                            <Text style={[styles.label, { color: colors.textSecondary }]}>EMAIL DE CONTACTO</Text>
                            <TextInput style={getInputStyle('email') as any} placeholder="email@exemplo.com" placeholderTextColor={colors.textMuted} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} />

                            <Text style={[styles.label, { color: colors.textSecondary }]}>WEBSITE</Text>
                            <TextInput style={getInputStyle('website') as any} placeholder="https://exemplo.com" placeholderTextColor={colors.textMuted} value={form.website} onChangeText={set('website')} autoCapitalize="none" onFocus={() => setFocusedField('website')} onBlur={() => setFocusedField(null)} />
                        </View>
                    )}

                    {/* STEP 3: ACCESSIBILITY */}
                    {currentStep === 3 && (
                        <View style={tw`gap-4`}>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Acessibilidade e Condições</Text>
                            <Text style={[tw`text-sm -mt-2 mb-2`, { color: colors.textSecondary }]}>
                                Selecione as opções que se aplicam a este local para ajudar os utilizadores a encontrar ambientes adequados.
                            </Text>

                            {/* Wheelchair Card */}
                            <Pressable
                                onPress={() => setForm(f => ({ ...f, wheelchair_accessible: !f.wheelchair_accessible }))}
                                style={[
                                    styles.accessCard,
                                    { backgroundColor: colors.card, borderColor: form.wheelchair_accessible ? colors.primary : colors.border },
                                    form.wheelchair_accessible && { backgroundColor: colors.primary + '08' }
                                ]}
                            >
                                <View style={[styles.accessIconWrap, { backgroundColor: form.wheelchair_accessible ? colors.primary : colors.border + '30' }]}>
                                    <Ionicons name="accessibility" size={20} color={form.wheelchair_accessible ? '#FFF' : colors.textSecondary} />
                                </View>
                                <View style={tw`flex-1 mr-3`}>
                                    <Text style={[styles.accessTitle, { color: colors.textPrimary }]}>Acesso Adaptado</Text>
                                    <Text style={[styles.accessDesc, { color: colors.textSecondary }]}>Espaço livre de degraus, com rampas de acesso ou elevador adequado.</Text>
                                </View>
                                <View style={[styles.accessCheck, form.wheelchair_accessible && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                                    {form.wheelchair_accessible && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                </View>
                            </Pressable>

                            {/* Low Noise Card */}
                            <Pressable
                                onPress={() => setForm(f => ({ ...f, low_noise: !f.low_noise }))}
                                style={[
                                    styles.accessCard,
                                    { backgroundColor: colors.card, borderColor: form.low_noise ? colors.primary : colors.border },
                                    form.low_noise && { backgroundColor: colors.primary + '08' }
                                ]}
                            >
                                <View style={[styles.accessIconWrap, { backgroundColor: form.low_noise ? colors.primary : colors.border + '30' }]}>
                                    <Ionicons name="volume-mute" size={20} color={form.low_noise ? '#FFF' : colors.textSecondary} />
                                </View>
                                <View style={tw`flex-1 mr-3`}>
                                    <Text style={[styles.accessTitle, { color: colors.textPrimary }]}>Ruído Reduzido</Text>
                                    <Text style={[styles.accessDesc, { color: colors.textSecondary }]}>Ambiente calmo, silencioso e sem ruídos intensos ou disruptivos.</Text>
                                </View>
                                <View style={[styles.accessCheck, form.low_noise && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                                    {form.low_noise && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                </View>
                            </Pressable>

                            {/* Soft Lighting Card */}
                            <Pressable
                                onPress={() => setForm(f => ({ ...f, soft_lighting: !f.soft_lighting }))}
                                style={[
                                    styles.accessCard,
                                    { backgroundColor: colors.card, borderColor: form.soft_lighting ? colors.primary : colors.border },
                                    form.soft_lighting && { backgroundColor: colors.primary + '08' }
                                ]}
                            >
                                <View style={[styles.accessIconWrap, { backgroundColor: form.soft_lighting ? colors.primary : colors.border + '30' }]}>
                                    <Ionicons name="sunny" size={20} color={form.soft_lighting ? '#FFF' : colors.textSecondary} />
                                </View>
                                <View style={tw`flex-1 mr-3`}>
                                    <Text style={[styles.accessTitle, { color: colors.textPrimary }]}>Iluminação Suave</Text>
                                    <Text style={[styles.accessDesc, { color: colors.textSecondary }]}>Sem luzes fluorescentes fortes ou oscilantes; iluminação indireta/suave.</Text>
                                </View>
                                <View style={[styles.accessCheck, form.soft_lighting && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                                    {form.soft_lighting && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                </View>
                            </Pressable>
                        </View>
                    )}
                </ScrollView>

                {/* Floating Bottom Navigation Bar */}
                <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    <Pressable
                        onPress={handleBack}
                        style={[styles.footerBtnSecondary, { borderColor: colors.border }]}
                    >
                        <Text style={[styles.footerBtnSecondaryText, { color: colors.textSecondary }]}>
                            {currentStep === 1 ? 'Cancelar' : 'Voltar'}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleNext}
                        disabled={!isStepValid() || loading}
                        style={[
                            styles.footerBtnPrimary,
                            { backgroundColor: isStepValid() ? colors.primary : colors.border }
                        ]}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <>
                                <Text style={styles.footerBtnPrimaryText}>
                                    {currentStep === 3 ? 'Submeter' : 'Seguinte'}
                                </Text>
                                {currentStep < 3 && (
                                    <Ionicons name="arrow-forward" size={16} color="white" style={tw`ml-2`} />
                                )}
                            </>
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
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

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
    },
    stepsContainer: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
    },
    stepsLinesContainer: {
        position: 'absolute',
        top: 28,
        left: 58,
        right: 58,
        height: 2,
        zIndex: 0,
    },
    absoluteStepLine: {
        position: 'absolute',
        height: 2,
        top: 0,
    },
    stepBubbleContainer: {
        alignItems: 'center',
        width: 60,
        zIndex: 2,
    },
    stepBubble: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        zIndex: 2,
    },
    stepNumber: {
        fontSize: 11,
        fontFamily: 'Poppins_700Bold',
    },
    stepLabel: {
        fontSize: 9,
        fontFamily: 'Poppins_600SemiBold',
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 8,
    },
    typeCard: {
        flex: 1,
        borderRadius: 18,
        borderWidth: 1.5,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 145,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 1,
    },
    typeIconContainer: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    typeTitle: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 4,
    },
    typeDesc: {
        fontSize: 10,
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
        lineHeight: 13,
    },
    label: {
        fontSize: 11,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    input: {
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
    },
    locationBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1.5,
        gap: 8,
    },
    locationBtnText: {
        fontSize: 13,
        fontFamily: 'Poppins_600SemiBold',
    },
    coordsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1.5,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 8,
    },
    accessCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: 1.5,
        padding: 16,
        marginBottom: 10,
    },
    accessIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    accessTitle: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 2,
    },
    accessDesc: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 14,
    },
    accessCheck: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#d1d5db',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Platform.OS === 'ios' ? 24 : 14,
        paddingTop: 12,
        borderTopWidth: 0.5,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 8,
    },
    footerBtnSecondary: {
        flex: 1,
        marginRight: 12,
        height: 48,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerBtnSecondaryText: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
    },
    footerBtnPrimary: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    footerBtnPrimaryText: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
    },
});
