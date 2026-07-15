import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput
} from 'react-native';
import CustomAlertModal from '../components/CustomAlertModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import { resolveMapboxStyle } from '../utils/mapUtils';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService, Place } from '../services/apiService';
import { favoritesService } from '../services/favoritesService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlaceProfile'>;

export default function PlaceProfileScreen({ route, navigation }: Props) {
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [styleJSON, setStyleJSON] = useState<any>(null);
  const { colors, isDark } = useTheme();

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

  // MapLibre does not require setAccessToken. Tokens are embedded in style URLs.
  const { place: passedPlace, placeId } = route.params;

  const [place, setPlace] = useState<Place | null>(passedPlace || null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(!passedPlace);

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchReviews = async () => {
    if (!place) return;
    try {
      setReviewsLoading(true);
      const data = await apiService.getReviews(place.id);
      setReviews(data || []);
    } catch (err) {
      console.error('[PlaceProfile] Erro ao buscar avaliações:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [place?.id]);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    (async () => {
      // Token servido pelo backend — sem fallback embebido no bundle.
      try {
        const res = await apiService.getMapboxToken();
        if (res && res.token && !res.token.startsWith('pk.mock_')) {
          setMapboxToken(res.token);
        } else {
          console.warn('[Mapbox] Backend não devolveu token válido.');
        }
      } catch (err) {
        console.error('[Mapbox] Erro ao obter token do backend.', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (mapboxToken) {
      const styleId = isDark ? 'dark-v11' : 'streets-v12';
      const url = `https://api.mapbox.com/styles/v1/mapbox/${styleId}?access_token=${mapboxToken}`;
      fetch(url)
        .then(res => res.json())
        .then(json => {
          setStyleJSON(resolveMapboxStyle(json, mapboxToken));
        })
        .catch(err => {
          console.error('[PlaceProfile] Erro ao buscar style JSON:', err);
        });
    }
  }, [mapboxToken, isDark]);

  const { profile, isProfessional, refreshProfile } = useAuth();

  const claimers = (place as any)?.profiles || [];
  const claimer = claimers[0];
  const hasClaimer = !!claimer;
  const isClaimerVerified = claimer?.verified === true;

  // O local pertence a uma instituição? (é a essa instituição que o profissional se associa)
  const ownerIsInstitution = place?.type === 'institution' || claimer?.account_type === 'institution';
  const institutionId = claimer?.id;
  const alreadyAffiliatedHere = isProfessional && profile?.institution_id && profile.institution_id === institutionId;

  const [assocPros, setAssocPros] = useState<any[]>([]);

  // Profissionais associados a esta instituição (para mostrar no perfil).
  useEffect(() => {
    if (ownerIsInstitution && institutionId) {
      apiService.getInstitutionProfessionals(institutionId)
        .then(list => setAssocPros(list || []))
        .catch(() => setAssocPros([]));
    } else {
      setAssocPros([]);
    }
  }, [ownerIsInstitution, institutionId]);

  const handleRequestAssociation = async () => {
    if (!place || !institutionId) return;
    showAlert(
      'Associar-me a esta instituição',
      `Queres enviar um pedido de associação a "${claimer?.full_name || place.name}"? A instituição terá de o aceitar.`,
      'business-outline',
      colors.primary,
      {
        text: 'Enviar pedido',
        onPress: async () => {
          try {
            await apiService.requestAssociation(institutionId);
            await refreshProfile();
            showAlert('Pedido enviado', 'O teu pedido de associação foi enviado. Aguarda a aprovação da instituição.', 'checkmark-circle-outline', colors.primary);
          } catch (error: any) {
            showAlert('Não foi possível', error.message || 'Não foi possível enviar o pedido.', 'alert-circle-outline', '#ef4444');
          }
        }
      },
      { text: 'Cancelar', onPress: () => {} }
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

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>A carregar dados...</Text>
      </View>
    );
  }

  // Sem objeto place (ex.: aberto só com placeId por deep-link/notificação).
  // Não existe getPlaceById no apiService, por isso mostramos um estado de erro
  // em vez de ficar preso no spinner "A carregar dados..." para sempre.
  if (!place) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 16 }}>
          Não foi possível carregar os dados deste local.
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8, backgroundColor: colors.accent }}>
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleToggleFavorite = async () => {
    try {
      const isFav = await favoritesService.toggle(place);
      setIsFavorite(isFav);
      showAlert(
        isFav ? 'Adicionado aos Favoritos' : 'Removido dos Favoritos',
        isFav
          ? 'Este local foi adicionado à tua lista de favoritos.'
          : 'Este local foi removido da tua lista de favoritos.',
        isFav ? 'heart' : 'heart-dislike-outline',
        isFav ? '#ef4444' : colors.textMuted
      );
    } catch (error) {
      console.error('[PlaceProfileScreen] Erro ao alternar favorito:', error);
    }
  };

  const handleCall = () => {
    if (place.phone) {
      Linking.openURL(`tel:${place.phone}`);
    } else {
      showAlert('Sem contacto', 'Este profissional/instituição não tem telefone registado.', 'call-outline', colors.textMuted);
    }
  };

  const handleEmail = () => {
    if (place.email) {
      Linking.openURL(`mailto:${place.email}`);
    } else {
      showAlert('Sem e-mail', 'Este profissional/instituição não tem e-mail registado.', 'mail-outline', colors.textMuted);
    }
  };

  const handleWebsite = () => {
    if (place.website) {
      const url = place.website.startsWith('http') ? place.website : `https://${place.website}`;
      Linking.openURL(url);
    } else {
      showAlert('Sem website', 'Este profissional/instituição não tem website registado.', 'globe-outline', colors.textMuted);
    }
  };

  const handleShowOnMainMap = () => {
    if (!place) return;
    // Passa também as coordenadas: o foco por id falha para perfis (instituições)
    // cujo place não está na lista carregada do mapa.
    const lat = Number(place.latitude);
    const lng = Number(place.longitude);
    const focusCoords = !isNaN(lat) && !isNaN(lng) ? { lat, lng } : undefined;
    navigation.navigate('Main', {
      screen: 'Map',
      params: { focusPlaceId: place.id, focusCoords },
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

          {averageRating ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#fbbf24" />
              <Text style={[styles.ratingVal, { color: colors.textPrimary }]}>{averageRating}</Text>
              <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>
                ({reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'})
              </Text>
            </View>
          ) : (
            <View style={styles.ratingRow}>
              <Ionicons name="star-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.ratingCount, { color: colors.textMuted }]}>Sem avaliações</Text>
            </View>
          )}

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
          ) : null}

          {/* Associação: só profissionais, e só a locais de instituições */}
          {isProfessional && ownerIsInstitution && institutionId !== profile?.id && (
            <View style={[styles.claimContainer, { borderTopColor: colors.border }]}>
              {alreadyAffiliatedHere ? (
                <View style={[styles.claimBadge, { backgroundColor: '#22c55e12', borderColor: '#22c55e25', alignSelf: 'flex-start' }]}>
                  <Ionicons name="checkmark-circle" size={15} color="#22c55e" />
                  <Text style={[styles.claimBadgeText, { color: '#22c55e' }]}>Estás associado a esta instituição</Text>
                </View>
              ) : profile?.institution_id ? (
                <Text style={[styles.claimInfoText, { color: colors.textSecondary }]}>
                  Já pertences a outra instituição. Sai dela no teu perfil para te associares a esta.
                </Text>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={handleRequestAssociation}
                    style={[styles.claimBtn, { backgroundColor: '#3b82f6' }]}
                  >
                    <Ionicons name="business-outline" size={16} color="#fff" />
                    <Text style={styles.claimBtnText}>Associar-me a esta instituição</Text>
                  </TouchableOpacity>
                  <Text style={[styles.claimInfoText, { color: colors.textSecondary }]}>
                    Se exerces nesta instituição, envia um pedido de associação. Após aprovação, a tua localização passa a ser a desta instituição.
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Sobre</Text>
          <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
            {claimer?.bio || place.description ||
              'Esta entidade dedica-se a prestar apoio especializado na área do neurodesenvolvimento, assegurando um acompanhamento compassivo e qualificado para a pessoa com PEA e respetiva família.'}
          </Text>
        </View>

        {/* Detailed Professional Cards */}
        {hasClaimer && (claimer.specialty || claimer.services || claimer.hours || claimer.experience) && (
          <View style={[styles.section, styles.detailsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.detailsSectionTitle, { color: colors.textPrimary }]}>
              {place.type === 'professional' ? 'Detalhes Profissionais' : 'Detalhes da Instituição'}
            </Text>

            {claimer.specialty && (
              <View style={styles.detailItem}>
                <Ionicons name="ribbon-outline" size={20} color={colors.primary} style={styles.detailIcon} />
                <View style={styles.detailTextContent}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Especialidade</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{claimer.specialty}</Text>
                </View>
              </View>
            )}

            {claimer.services && (
              <View style={styles.detailItem}>
                <Ionicons name="construct-outline" size={20} color={colors.primary} style={styles.detailIcon} />
                <View style={styles.detailTextContent}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Serviços & Valências</Text>
                  <View style={styles.servicesContainer}>
                    {claimer.services.split(',').map((serv: string, idx: number) => {
                      const text = serv.trim();
                      if (!text) return null;
                      return (
                        <View key={idx} style={[styles.serviceBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          <Text style={[styles.serviceBadgeText, { color: colors.textPrimary }]}>{text}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {claimer.hours && (
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={20} color={colors.primary} style={styles.detailIcon} />
                <View style={styles.detailTextContent}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Horário de Atendimento</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{claimer.hours}</Text>
                </View>
              </View>
            )}

            {claimer.experience && (
              <View style={styles.detailItem}>
                <Ionicons name="school-outline" size={20} color={colors.primary} style={styles.detailIcon} />
                <View style={styles.detailTextContent}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Experiência / Qualificações</Text>
                  <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{claimer.experience}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Profissionais associados (perfil de instituição) */}
        {ownerIsInstitution && assocPros.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Profissionais associados ({assocPros.length})
            </Text>
            <View style={{ gap: 10, marginTop: 8 }}>
              {assocPros.map(pro => (
                <View
                  key={pro.id}
                  style={[styles.detailsContainer, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }]}
                >
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary + '18', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="medical" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: colors.textPrimary }} numberOfLines={1}>{pro.full_name}</Text>
                      {pro.verified && <Ionicons name="shield-checkmark" size={14} color="#22c55e" />}
                    </View>
                    {pro.specialty ? (
                      <Text style={{ fontSize: 12.5, fontFamily: 'Poppins_400Regular', color: colors.textSecondary }} numberOfLines={1}>{pro.specialty}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

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
              {!mapboxToken || !styleJSON ? (
                <View style={[styles.miniMap, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                <Map
                  style={styles.miniMap}
                  mapStyle={styleJSON}
                  touchZoom={false}
                  doubleTapZoom={false}
                  doubleTapHoldZoom={false}
                  dragPan={false}
                  touchRotate={false}
                  touchPitch={false}
                >
                  <Camera
                    initialViewState={{
                      center: [Number(place.longitude), Number(place.latitude)],
                      zoom: 14,
                    }}
                  />
                  <Marker
                    id="place-marker"
                    lngLat={[Number(place.longitude), Number(place.latitude)]}
                  >
                    <Ionicons 
                      name={place.type === 'professional' ? 'medical' : 'business'} 
                      size={24} 
                      color={place.type === 'professional' ? colors.primary : '#3b82f6'} 
                    />
                  </Marker>
                </Map>
              )}
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

        {/* Reviews Section */}
        <View style={[styles.section, { marginTop: 12 }]}>
          <View style={styles.reviewsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Avaliações</Text>
            <TouchableOpacity
              onPress={() => {
                setRating(5);
                setComment('');
                setReviewModalVisible(true);
              }}
              style={[styles.writeReviewBtn, { borderColor: colors.primary }]}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={[styles.writeReviewBtnText, { color: colors.primary }]}>Escrever Avaliação</Text>
            </TouchableOpacity>
          </View>

          {reviewsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : reviews.length === 0 ? (
            <View style={[styles.noReviewsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="star-outline" size={24} color={colors.textMuted} />
              <Text style={[styles.noReviewsText, { color: colors.textSecondary }]}>
                Ainda não há avaliações para este local. Seja o primeiro a deixar a sua opinião!
              </Text>
            </View>
          ) : (
            <View style={styles.reviewsList}>
              {reviews.map((rev) => (
                <View key={rev.id} style={[styles.reviewItem, { borderColor: colors.border }]}>
                  <View style={styles.reviewUserRow}>
                    <Text style={[styles.reviewUser, { color: colors.textPrimary }]}>
                      {rev.profile?.full_name || 'Utilizador do Alba'}
                    </Text>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <Ionicons
                          key={starVal}
                          name={starVal <= rev.rating ? 'star' : 'star-outline'}
                          size={14}
                          color={starVal <= rev.rating ? '#fbbf24' : colors.textMuted}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={[styles.reviewDate, { color: colors.textMuted }]}>
                    {formatDate(rev.created_at)}
                  </Text>
                  {rev.comment ? (
                    <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>
                      {rev.comment}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Review Submission Modal */}
      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Deixar Avaliação</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Partilha a tua experiência com "{place.name}".
            </Text>

            {/* Interactive Stars */}
            <View style={styles.modalStarsRow}>
              {[1, 2, 3, 4, 5].map((starVal) => (
                <TouchableOpacity
                  key={starVal}
                  onPress={() => setRating(starVal)}
                  style={styles.modalStarBtn}
                >
                  <Ionicons
                    name={starVal <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={starVal <= rating ? '#fbbf24' : colors.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Comment Input */}
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Escreve um comentário opcional sobre o atendimento, acessibilidade ou terapias..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              style={[
                styles.modalInput,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                }
              ]}
            />

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setReviewModalVisible(false)}
                disabled={submittingReview}
                style={[styles.modalBtn, styles.modalCancelBtn]}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  try {
                    setSubmittingReview(true);
                    await apiService.submitReview(place.id, rating, comment.trim() || undefined);
                    setReviewModalVisible(false);
                    showAlert(
                      'Avaliação Submetida',
                      'Agradecemos a tua avaliação! Ela ajuda a tornar a comunidade Alba mais informada.',
                      'checkmark-circle-outline',
                      colors.primary
                    );
                    await fetchReviews();
                  } catch (e: any) {
                    showAlert(
                      'Erro',
                      e.message || 'Não foi possível submeter a avaliação. Tenta novamente.',
                      'alert-circle-outline',
                      '#ef4444'
                    );
                  } finally {
                    setSubmittingReview(false);
                  }
                }}
                disabled={submittingReview}
                style={[styles.modalBtn, styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Submeter</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  ratingVal: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  ratingCount: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  detailsContainer: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailIcon: {
    marginTop: 2,
  },
  detailTextContent: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  serviceBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  serviceBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  writeReviewBtnText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
  },
  noReviewsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  noReviewsText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
    lineHeight: 18,
  },
  reviewsList: {
    gap: 12,
  },
  reviewItem: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 4,
    gap: 2,
  },
  reviewUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewUser: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    marginTop: -2,
  },
  reviewComment: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: -8,
  },
  modalStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 4,
  },
  modalStarBtn: {
    padding: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: 'transparent',
  },
  modalSubmitBtn: {
    elevation: 2,
  },
  modalBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
});
