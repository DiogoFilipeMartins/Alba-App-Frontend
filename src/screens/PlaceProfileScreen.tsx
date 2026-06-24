import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService, Place } from '../services/apiService';
import { favoritesService } from '../services/favoritesService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlaceProfile'>;

export default function PlaceProfileScreen({ route, navigation }: Props) {
  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const { colors, isDark } = useTheme();
  const { place: passedPlace, placeId } = route.params;

  const [place, setPlace] = useState<Place | null>(passedPlace || null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(!passedPlace);

  const { profile, isProfessional, isInstitution, refreshProfile } = useAuth();

  const claimers = (place as any)?.profiles || [];
  const claimer = claimers[0];
  const hasClaimer = !!claimer;
  const isClaimerVerified = claimer?.verified === true;

  const handleClaimPlace = async () => {
    if (!place) return;
    Alert.alert(
      'Reivindicar Local',
      `Tens a certeza que queres associar a tua conta a "${place.name}" como local de atendimento oficial?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const res = await apiService.claimPlace(place.id);
              Alert.alert('Sucesso', 'Reivindicação efetuada com sucesso! O teu perfil agora está associado a este local.');
              await refreshProfile();
              setPlace(prev => prev ? {
                ...prev,
                profiles: [res.profile || { id: profile?.id, verified: false, account_type: profile?.account_type }]
              } : null);
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Não foi possível reivindicar o local.');
            }
          }
        }
      ]
    );
  };

  // If place object wasn't passed directly, fetch it (placeholder logic, or fallback if needed)
  useEffect(() => {
    if (!place) {
      // In a real app we might fetch by ID: const data = await apiService.getPlaceById(placeId)
      // For now, since directory lists always pass 'place' object, we use it directly.
      setLoading(false);
    }
  }, [placeId, place]);

  // Sync favorite status
  useEffect(() => {
    if (place) {
      favoritesService.getIds().then(ids => {
        setIsFavorite(ids.includes(place.id));
      });
    }
  }, [place]);

  if (loading || !place) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>A carregar dados...</Text>
      </View>
    );
  }

  const handleToggleFavorite = async () => {
    try {
      const isFav = await favoritesService.toggle(place);
      setIsFavorite(isFav);
      Alert.alert(
        isFav ? 'Adicionado aos Favoritos' : 'Removido dos Favoritos',
        isFav
          ? 'Este local foi adicionado à tua lista de favoritos.'
          : 'Este local foi removido da tua lista de favoritos.'
      );
    } catch (error) {
      console.error('[PlaceProfileScreen] Erro ao alternar favorito:', error);
    }
  };

  const handleCall = () => {
    if (place.phone) {
      Linking.openURL(`tel:${place.phone}`);
    } else {
      Alert.alert('Sem contacto', 'Este profissional/instituição não tem telefone registado.');
    }
  };

  const handleEmail = () => {
    if (place.email) {
      Linking.openURL(`mailto:${place.email}`);
    } else {
      Alert.alert('Sem e-mail', 'Este profissional/instituição não tem e-mail registado.');
    }
  };

  const handleWebsite = () => {
    if (place.website) {
      const url = place.website.startsWith('http') ? place.website : `https://${place.website}`;
      Linking.openURL(url);
    } else {
      Alert.alert('Sem website', 'Este profissional/instituição não tem website registado.');
    }
  };

  const handleShowOnMainMap = () => {
    // Navigate to Main Tab Navigator -> Map tab, and pass focusPlaceId parameter
    navigation.navigate('Main', {
      screen: 'Map',
      params: { focusPlaceId: place.id }
    } as any);
  };

  const accessibility = place.place_accessibility?.[0];
  const hasAccessibilityData = accessibility &&
    (accessibility.wheelchair_accessible || accessibility.low_noise || accessibility.soft_lighting);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header Navigation */}
      <View style={[styles.headerActions, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          Detalhes
        </Text>

        <TouchableOpacity
          onPress={handleToggleFavorite}
          style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorite ? '#ef4444' : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Info Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: place.type === 'professional' ? colors.primary + '18' : '#3b82f618' }]}>
            <Ionicons
              name={place.type === 'professional' ? 'medical' : 'business'}
              size={34}
              color={place.type === 'professional' ? colors.primary : '#3b82f6'}
            />
          </View>

          <Text style={[styles.placeName, { color: colors.textPrimary }]}>{place.name}</Text>
          <Text style={[styles.placeType, { color: place.type === 'professional' ? colors.accent : '#3b82f6' }]}>
            {place.type === 'professional' ? 'Profissional Especializado' : 'Instituição de Apoio'}
          </Text>

          {place.city && (
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.cityText, { color: colors.textSecondary }]}>{place.city}</Text>
            </View>
          )}

          {/* Quick Contacts Row */}
          <View style={styles.contactsRow}>
            <TouchableOpacity
              onPress={handleCall}
              style={[
                styles.contactIconBtn,
                { backgroundColor: colors.background, borderColor: colors.border, opacity: place.phone ? 1 : 0.4 }
              ]}
              disabled={!place.phone}
            >
              <Ionicons name="call-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Ligar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleEmail}
              style={[
                styles.contactIconBtn,
                { backgroundColor: colors.background, borderColor: colors.border, opacity: place.email ? 1 : 0.4 }
              ]}
              disabled={!place.email}
            >
              <Ionicons name="mail-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleWebsite}
              style={[
                styles.contactIconBtn,
                { backgroundColor: colors.background, borderColor: colors.border, opacity: place.website ? 1 : 0.4 }
              ]}
              disabled={!place.website}
            >
              <Ionicons name="globe-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Website</Text>
            </TouchableOpacity>
          </View>

          {/* Claim / Official Badge */}
          {hasClaimer ? (
            <View style={[styles.claimContainer, { borderTopColor: colors.border }]}>
              <View style={[styles.claimBadge, { backgroundColor: isClaimerVerified ? '#22c55e12' : '#f59e0b12', borderColor: isClaimerVerified ? '#22c55e25' : '#f59e0b25' }]}>
                <Ionicons name={isClaimerVerified ? 'shield-checkmark' : 'shield-outline'} size={15} color={isClaimerVerified ? '#22c55e' : '#f59e0b'} />
                <Text style={[styles.claimBadgeText, { color: isClaimerVerified ? '#22c55e' : '#f59e0b' }]}>
                  {isClaimerVerified ? 'Página Oficial Verificada' : 'Reivindicação Pendente'}
                </Text>
              </View>
              <Text style={[styles.claimInfoText, { color: colors.textSecondary }]}>
                {isClaimerVerified 
                  ? `Este local é gerido diretamente por ${claimer.full_name || 'um profissional/instituição verificado'}.`
                  : 'A reivindicação deste local está pendente de aprovação.'}
              </Text>
            </View>
          ) : (
            (isProfessional || isInstitution) && (
              <View style={[styles.claimContainer, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  onPress={handleClaimPlace}
                  style={[styles.claimBtn, { backgroundColor: place.type === 'professional' ? colors.primary : '#3b82f6' }]}
                >
                  <Ionicons name="shield-outline" size={16} color="#fff" />
                  <Text style={styles.claimBtnText}>Reivindicar este Local</Text>
                </TouchableOpacity>
                <Text style={[styles.claimInfoText, { color: colors.textSecondary }]}>
                  Se este é o teu local de atendimento oficial, podes reivindicá-lo para associá-lo ao teu perfil.
                </Text>
              </View>
            )
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Sobre</Text>
          <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
            {place.description ||
              'Esta entidade dedica-se a prestar apoio especializado na área do neurodesenvolvimento, assegurando um acompanhamento compassivo e qualificado para a pessoa com PEA e respetiva família.'}
          </Text>
        </View>

        {/* Accessibility Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Acessibilidade e Ambiente</Text>
          {hasAccessibilityData ? (
            <View style={styles.accessibilityList}>
              <View style={styles.accessibilityItem}>
                <Ionicons
                  name={accessibility?.wheelchair_accessible ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={accessibility?.wheelchair_accessible ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.accessibilityText, { color: colors.textPrimary }]}>Acesso adaptado para mobilidade reduzida</Text>
              </View>

              <View style={styles.accessibilityItem}>
                <Ionicons
                  name={accessibility?.low_noise ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={accessibility?.low_noise ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.accessibilityText, { color: colors.textPrimary }]}>Ambiente com ruído reduzido (sensory friendly)</Text>
              </View>

              <View style={styles.accessibilityItem}>
                <Ionicons
                  name={accessibility?.soft_lighting ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={accessibility?.soft_lighting ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.accessibilityText, { color: colors.textPrimary }]}>Iluminação suave e sem oscilações</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.noInfoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.noInfoText, { color: colors.textSecondary }]}>
                Ainda não foram confirmadas as características de acessibilidade para este local.
              </Text>
            </View>
          )}
        </View>

        {/* Location & Map Preview */}
        {place.latitude && place.longitude ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Localização</Text>
            {place.address_line && (
              <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={2}>
                {place.address_line}
                {place.postal_code ? `, ${place.postal_code}` : ''}
                {place.city ? `, ${place.city}` : ''}
              </Text>
            )}

            {/* Map Preview Container */}
            <View style={[styles.mapContainer, { borderColor: colors.border }]}>
              <MapView
                style={styles.miniMap}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                initialRegion={{
                  latitude: Number(place.latitude),
                  longitude: Number(place.longitude),
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
              >
                {mapboxToken && !mapboxToken.startsWith('pk.mock_') ? (
                  <UrlTile
                    urlTemplate={`https://api.mapbox.com/styles/v1/mapbox/${isDark ? 'dark-v11' : 'streets-v12'}/tiles/256/{z}/{x}/{y}?access_token=${mapboxToken}`}
                    maximumZ={19}
                    tileSize={256}
                  />
                ) : null}
                <Marker
                  coordinate={{
                    latitude: Number(place.latitude),
                    longitude: Number(place.longitude),
                  }}
                  pinColor={place.type === 'professional' ? colors.primary : '#3b82f6'}
                />
              </MapView>
            </View>

            {/* Action to show on main Map */}
            <TouchableOpacity
              onPress={handleShowOnMainMap}
              style={[styles.mapActionBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="map-outline" size={18} color="#fff" />
              <Text style={styles.mapActionText}>Ver no Mapa Geral</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 15,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  placeName: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  placeType: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  cityText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  contactsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    width: '100%',
    justifyContent: 'center',
  },
  contactIconBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 90,
  },
  contactLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
  },
  accessibilityList: {
    gap: 12,
    marginTop: 4,
  },
  accessibilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accessibilityText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    flex: 1,
  },
  noInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  noInfoText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
    lineHeight: 18,
  },
  addressText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 12,
    lineHeight: 18,
  },
  mapContainer: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 12,
  },
  miniMap: {
    ...StyleSheet.absoluteFillObject,
  },
  mapActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
    gap: 8,
  },
  mapActionText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimContainer: {
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    paddingTop: 18,
    alignItems: 'center',
  },
  claimBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  claimBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  claimInfoText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 16,
    width: '100%',
    marginBottom: 10,
  },
  claimBtnText: {
    color: '#fff',
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
  },
});
