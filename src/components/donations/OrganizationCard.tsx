import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const ORG_CARD_WIDTH = width * 0.75;

interface Organization {
    id: string;
    name: string;
    desc: string;
    url: string;
    color: string;
}

interface OrganizationCardProps {
    org: Organization;
}

export const OrganizationCard: React.FC<OrganizationCardProps> = ({ org }) => {
    const { colors, isDark } = useTheme();

    return (
        <Pressable
            style={[styles.orgCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
            onPress={() => {
                if (!org.url) return;
                Linking.openURL(org.url).catch(err =>
                    console.warn('[OrganizationCard] Não foi possível abrir o URL:', err)
                );
            }}
        >
            <View style={[styles.orgIconWrap, { backgroundColor: org.color + '15' }]}>
                <Ionicons name="business" size={24} color={org.color} />
            </View>
            <Text style={[styles.orgName, { color: colors.textPrimary }]} numberOfLines={1}>{org.name}</Text>
            <Text style={[styles.orgDesc, { color: colors.textSecondary }]} numberOfLines={3}>{org.desc}</Text>
            
            <View style={{ flex: 1 }} />
            <View style={styles.orgActionRow}>
                <Text style={[styles.orgActionText, { color: org.color }]}>Visitar Website</Text>
                <Ionicons name="open-outline" size={16} color={org.color} />
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    orgCard: {
        width: ORG_CARD_WIDTH,
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    orgIconWrap: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    orgName: { fontSize: 18, fontFamily: 'Poppins_700Bold', marginBottom: 6 },
    orgDesc: { fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 20, marginBottom: 16 },
    orgActionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 'auto' },
    orgActionText: { fontSize: 13, fontFamily: 'Poppins_700Bold' },
});
