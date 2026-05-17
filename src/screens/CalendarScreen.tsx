import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Switch,
    StyleSheet,
    Dimensions,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { apiService, CalendarEvent } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Calendar'>;

const { width: SCREEN_W } = Dimensions.get('window');
const CELL_W = SCREEN_W / 7;

const WEEK_DAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const EVENT_COLORS = ['#2563eb', '#16a34a', '#9333ea', '#dc2626', '#d97706', '#0891b2', '#db2777'];

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDOW(y: number, m: number) { return new Date(y, m, 1).getDay(); }
const todayStr = () => new Date().toISOString().slice(0, 10);
const dayISO = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const eventDay = (ts: string | undefined) => ts?.slice(0, 10) ?? '';
const fmtTime = (ts: string | undefined) => ts?.slice(11, 16) ?? '';
const buildTS = (date: string, time: string) =>
    time && /^\d{1,2}:\d{2}$/.test(time)
        ? `${date}T${time.padStart(5, '0')}:00+00:00`
        : `${date}T00:00:00+00:00`;

export default function CalendarScreen({ navigation }: Props) {
    const { profile } = useAuth();
    const userId = profile?.id;
    const { colors, isDark } = useTheme();

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [modalDate, setModalDate] = useState(todayStr());
    const [form, setForm] = useState({ title: '', description: '', startTime: '', endTime: '', allDay: false, colorIdx: 0 });
    const [saving, setSaving] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

    const touchXRef = useRef(0);
    const [dayModal, setDayModal] = useState<string | null>(null);

    const fetchEvents = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const from = `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00+00:00`;
            const last = daysInMonth(year, month);
            const to = `${year}-${String(month + 1).padStart(2, '0')}-${last}T23:59:59+00:00`;
            const data = await apiService.getCalendarEvents(userId, from, to);
            setEvents(data ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [year, month, userId]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
    const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };
    const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

    const total = daysInMonth(year, month);
    const first = firstDOW(year, month);
    const cells = [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    const eventsForDay = (iso: string) => events.filter(e => eventDay(e.starts_at) === iso);

    const handleSave = async () => {
        if (!form.title.trim()) { Alert.alert('Título obrigatório'); return; }
        if (!userId) { Alert.alert('Erro', 'Sessão não encontrada. Faz login novamente.'); return; }
        setSaving(true);
        try {
            const starts = form.allDay ? buildTS(modalDate, '00:00') : buildTS(modalDate, form.startTime);
            const ends = form.allDay ? buildTS(modalDate, '23:59') : (form.endTime ? buildTS(modalDate, form.endTime) : null);
            const payload = {
                user_id: userId,
                title: form.title.trim(),
                description: form.description.trim() || null,
                starts_at: starts,
                ends_at: ends,
                all_day: form.allDay,
            };

            if (editingEvent) {
                await apiService.updateCalendarEvent(editingEvent.id, payload);
            } else {
                await apiService.createCalendarEvent(payload);
            }

            closeModal();
            resetForm();
            await fetchEvents();
        } catch (e: any) { Alert.alert('Erro', e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        Alert.alert('Eliminar evento', 'Tens a certeza?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive', onPress: async () => {
                    await apiService.deleteCalendarEvent(id);
                    setEvents(p => p.filter(e => e.id !== id));
                }
            },
        ]);
    };

    const resetForm = () => setForm({ title: '', description: '', startTime: '', endTime: '', allDay: false, colorIdx: 0 });

    const closeModal = () => {
        setShowModal(false);
        setEditingEvent(null);
        resetForm();
    };

    const openNew = (iso: string) => {
        setModalDate(iso || todayStr());
        setEditingEvent(null);
        resetForm();
        setShowModal(true);
    };

    const openEdit = (event: CalendarEvent) => {
        setEditingEvent(event);
        setModalDate(eventDay(event.starts_at) || todayStr());
        setForm({
            title: event.title,
            description: event.description || '',
            startTime: event.all_day ? '' : fmtTime(event.starts_at),
            endTime: event.all_day ? '' : fmtTime(event.ends_at || undefined),
            allDay: event.all_day,
            colorIdx: 0,
        });
        setDayModal(null);
        setShowModal(true);
    };

    const today = todayStr();

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={tw`flex-1 flex-row items-center`}>
                    <Pressable onPress={next} style={tw`flex-row items-center`}>
                        <Text numberOfLines={1} style={[styles.headerMonth, { color: colors.textPrimary }]}>{MONTHS[month]} {year}</Text>
                        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={tw`ml-1`} />
                    </Pressable>
                </View>
                <View style={tw`flex-row items-center`}>
                    <Pressable onPress={goToday} style={styles.headerBtn}>
                        <Ionicons name="today-outline" size={22} color={colors.textPrimary} />
                    </Pressable>
                    <Pressable onPress={fetchEvents} style={styles.headerBtn}>
                        <Ionicons name="refresh" size={22} color={colors.textPrimary} />
                    </Pressable>
                </View>
            </View>

            <View style={[styles.weekRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
                {WEEK_DAYS.map(d => (
                    <Text key={d} style={[styles.weekLabel, { color: colors.textSecondary }]}>{d}</Text>
                ))}
            </View>

            <View
                style={tw`flex-1`}
                onTouchStart={e => touchXRef.current = e.nativeEvent.pageX}
                onTouchEnd={e => {
                    const diff = e.nativeEvent.pageX - touchXRef.current;
                    if (Math.abs(diff) > 50) {
                        if (diff > 0) prev(); else next();
                    }
                }}
            >
                {weeks.map((w, wi) => (
                    <View key={wi} style={[styles.weekLine, { flex: 1, borderBottomColor: colors.border }]}>
                        {w.map((d, di) => {
                            const iso = d ? dayISO(year, month, d) : '';
                            const isToday = iso === today;
                            const dayEvents = eventsForDay(iso);

                            return (
                                <Pressable key={di} style={[styles.dayCell, { borderRightColor: colors.border }]} onPress={() => iso && setDayModal(iso)}>
                                    <View style={[styles.dayNumWrap, isToday && { backgroundColor: colors.accent }]}>
                                        <Text style={[styles.dayNum, { color: d ? colors.textPrimary : 'transparent' }, isToday && styles.dayNumTodayText]}>{d}</Text>
                                    </View>
                                    <View style={tw`flex-1`}>
                                        {dayEvents.slice(0, 2).map(e => (
                                            <View key={e.id} style={[styles.pill, { backgroundColor: colors.accent + '30' }]}>
                                                <Text numberOfLines={1} style={[styles.pillText, { color: colors.textPrimary }]}>{e.title}</Text>
                                            </View>
                                        ))}
                                        {dayEvents.length > 2 && <Text style={[styles.overflow, { color: colors.textSecondary }]}>+{dayEvents.length - 2}</Text>}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </View>

            <Pressable style={styles.fab} onPress={() => openNew(today)}>
                <View style={[styles.fabGrad, { backgroundColor: colors.accent }]}>
                    <Ionicons name="add" size={32} color="white" />
                </View>
            </Pressable>

            {/* Day Events Modal */}
            <Modal visible={!!dayModal} transparent animationType="fade" onRequestClose={() => setDayModal(null)}>
                <Pressable style={styles.overlay} onPress={() => setDayModal(null)}>
                    <View style={[styles.sheet, { backgroundColor: colors.card, marginTop: 'auto' }]}>
                        <View style={[styles.handle, { backgroundColor: colors.border }]} />
                        <Text style={[styles.lbl, { color: colors.textSecondary }]}>Eventos de {dayModal}</Text>

                        <ScrollView style={tw`max-h-80`}>
                            {dayModal && eventsForDay(dayModal).length > 0 ? (
                                eventsForDay(dayModal).map(e => (
                                    <View key={e.id} style={[styles.evCard, { backgroundColor: colors.background, borderLeftColor: colors.accent }]}>
                                        <View style={tw`flex-1`}>
                                            <Text style={[tw`font-bold text-base`, { color: colors.textPrimary }]}>{e.title}</Text>
                                            <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>
                                                {e.all_day ? 'Todo o dia' : `${fmtTime(e.starts_at)} - ${fmtTime(e.ends_at)}`}
                                            </Text>
                                            {e.description && <Text style={[tw`mt-1 text-sm`, { color: colors.textSecondary }]}>{e.description}</Text>}
                                        </View>
                                        <Pressable onPress={() => openEdit(e)} style={tw`p-2`}>
                                            <Ionicons name="create-outline" size={20} color={colors.accent} />
                                        </Pressable>
                                        <Pressable onPress={() => handleDelete(e.id)} style={tw`p-2`}>
                                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                        </Pressable>
                                    </View>
                                ))
                            ) : (
                                <Text style={[tw`text-center py-8`, { color: colors.textSecondary }]}>Nenhum evento para este dia.</Text>
                            )}
                        </ScrollView>

                        <Pressable
                            onPress={() => {
                                const d = dayModal;
                                setDayModal(null);
                                if (d) openNew(d);
                            }}
                            style={tw`mt-4`}
                        >
                            <View style={[tw`rounded-xl py-4 items-center`, { backgroundColor: colors.accent }]}>
                                <Text style={tw`text-white font-bold`}>Adicionar Novo Evento</Text>
                            </View>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* New Event Modal */}
            <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeModal}>
                <View style={{ flex: 1 }}>
                    <Pressable style={[styles.overlay, { justifyContent: 'center', padding: 20 }]} onPress={closeModal}>
                        <Pressable style={[styles.sheet, { backgroundColor: colors.card, borderRadius: 28 }]} onPress={e => e.stopPropagation()}>
                            <View style={[styles.handle, { backgroundColor: colors.border }]} />

                            <Text style={[styles.lbl, { color: colors.textSecondary }]}>{editingEvent ? 'Editar Evento' : 'Novo Evento'} - {modalDate}</Text>
                            <TextInput
                                style={[styles.inp, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                                placeholder="Título do evento"
                                placeholderTextColor={colors.textMuted}
                                value={form.title}
                                onChangeText={t => setForm(f => ({ ...f, title: t }))}
                            />

                            <TextInput
                                style={[styles.inp, tw`h-24`, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                                placeholder="Descrição (opcional)"
                                placeholderTextColor={colors.textMuted}
                                multiline
                                value={form.description}
                                onChangeText={t => setForm(f => ({ ...f, description: t }))}
                            />

                            <View style={tw`flex-row items-center justify-between mb-4`}>
                                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Todo o dia</Text>
                                <Switch
                                    value={form.allDay}
                                    onValueChange={v => setForm(f => ({ ...f, allDay: v }))}
                                    trackColor={{ false: '#767577', true: colors.accent + '80' }}
                                    thumbColor={form.allDay ? colors.accent : '#f4f3f4'}
                                />
                            </View>

                            {!form.allDay && (
                                <View style={tw`flex-row gap-4 mb-4`}>
                                    <View style={tw`flex-1`}>
                                        <Text style={[styles.lbl, { color: colors.textSecondary }]}>Início (HH:MM)</Text>
                                        <TextInput
                                            style={[styles.inp, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                                            placeholder="09:00"
                                            placeholderTextColor={colors.textMuted}
                                            value={form.startTime}
                                            onChangeText={t => setForm(f => ({ ...f, startTime: t }))}
                                        />
                                    </View>
                                    <View style={tw`flex-1`}>
                                        <Text style={[styles.lbl, { color: colors.textSecondary }]}>Fim (HH:MM)</Text>
                                        <TextInput
                                            style={[styles.inp, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                                            placeholder="10:00"
                                            placeholderTextColor={colors.textMuted}
                                            value={form.endTime}
                                            onChangeText={t => setForm(f => ({ ...f, endTime: t }))}
                                        />
                                    </View>
                                </View>
                            )}

                            <View style={tw`flex-row gap-3 mt-2`}>
                                <Pressable style={tw`flex-1`} onPress={closeModal}>
                                    <View style={[tw`rounded-xl py-4 items-center border`, { borderColor: colors.border }]}>
                                        <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancelar</Text>
                                    </View>
                                </Pressable>
                                <Pressable style={tw`flex-1`} onPress={handleSave} disabled={saving}>
                                    <View style={[tw`rounded-xl py-4 items-center`, { backgroundColor: colors.accent }]}>
                                        {saving
                                            ? <ActivityIndicator color="white" />
                                            : <Text style={tw`text-white font-bold text-base`}>{editingEvent ? 'Atualizar' : 'Guardar'}</Text>}
                                    </View>
                                </Pressable>
                            </View>
                        </Pressable>
                    </Pressable>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8, paddingHorizontal: 16, borderBottomWidth: 1 },
    headerMonth: { fontSize: 20, fontFamily: 'Poppins_700Bold' },
    headerBtn: { padding: 8 },
    weekRow: { flexDirection: 'row', borderBottomWidth: 1 },
    weekLabel: { width: CELL_W, textAlign: 'center', fontSize: 11, fontFamily: 'Poppins_600SemiBold', paddingVertical: 4, textTransform: 'uppercase' },
    weekLine: { flexDirection: 'row', borderBottomWidth: 1 },
    dayCell: { width: CELL_W, borderRightWidth: 1, overflow: 'hidden', paddingBottom: 4, minHeight: 65 },
    dayNumWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', margin: 3 },
    dayNum: { fontSize: 13, fontFamily: 'Poppins_400Regular' },
    dayNumTodayText: { color: 'white', fontFamily: 'Poppins_700Bold' },
    pill: { marginHorizontal: 3, marginTop: 2, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
    pillText: { fontSize: 10, fontFamily: 'Poppins_600SemiBold' },
    overflow: { fontSize: 10, marginLeft: 4, marginTop: 1, fontFamily: 'Poppins_400Regular' },
    fab: { position: 'absolute', bottom: 20, right: 20, zIndex: 10, borderRadius: 30, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
    fabGrad: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
    sheet: { padding: 24, paddingBottom: 30 },
    handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    lbl: { fontSize: 11, fontFamily: 'Poppins_700Bold', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    inp: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 14, fontFamily: 'Poppins_400Regular' },
    colorDot: { width: 26, height: 26, borderRadius: 13, marginRight: 8 },
    colorDotActive: { borderWidth: 3, borderColor: '#1e293b', transform: [{ scale: 1.15 }] },
    evCard: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderRadius: 12, padding: 12, marginBottom: 8 },
});
