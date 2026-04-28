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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CELL_W = SCREEN_W / 7;

const WEEK_DAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const EVENT_COLORS = ['#2563eb', '#16a34a', '#9333ea', '#dc2626', '#d97706', '#0891b2', '#db2777'];

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function firstDOW(y, m) { return new Date(y, m, 1).getDay(); }
const todayStr = () => new Date().toISOString().slice(0, 10);
const dayISO = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const eventDay = (ts) => ts?.slice(0, 10) ?? '';
const fmtTime = (ts) => ts?.slice(11, 16) ?? '';
const buildTS = (date, time) =>
    time && /^\d{1,2}:\d{2}$/.test(time)
        ? `${date}T${time.padStart(5, '0')}:00+00:00`
        : `${date}T00:00:00+00:00`;

// ── Bottom bar (igual ao MapScreen) ───────────────────────────────────────────
function BottomBar({ navigation }) {
    return (
        <View style={styles.bottomBar}>
            <Pressable style={styles.bottomBtn} onPress={() => navigation.navigate('Map')}>
                <View style={styles.bottomIcon}>
                    <Ionicons name="map" size={22} color="#94a3b8" />
                </View>
                <Text style={styles.bottomLabel}>Mapa</Text>
            </Pressable>
            <Pressable style={styles.bottomBtn} onPress={() => navigation.navigate('SuggestPlace')}>
                <View style={styles.bottomIcon}>
                    <Ionicons name="add-circle" size={22} color="#94a3b8" />
                </View>
                <Text style={styles.bottomLabel}>Sugerir</Text>
            </Pressable>
            <Pressable style={styles.bottomBtn}>
                <View style={[styles.bottomIcon, { backgroundColor: '#0ea5e925' }]}>
                    <Ionicons name="calendar" size={22} color="#0ea5e9" />
                </View>
                <Text style={[styles.bottomLabel, { color: '#0ea5e9', fontWeight: '700' }]}>Agenda</Text>
            </Pressable>
            <Pressable style={styles.bottomBtn}>
                <View style={styles.bottomIcon}>
                    <Ionicons name="chatbubbles" size={22} color="#94a3b8" />
                </View>
                <Text style={styles.bottomLabel}>Comunidade</Text>
            </Pressable>
        </View>
    );
}

// ── Ecrã principal ─────────────────────────────────────────────────────────────
export default function CalendarScreen({ navigation }) {
    const { profile } = useAuth();
    const userId = profile?.id;

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal criar evento
    const [showModal, setShowModal] = useState(false);
    const [modalDate, setModalDate] = useState(todayStr());
    const [form, setForm] = useState({ title: '', description: '', startTime: '', endTime: '', allDay: false, colorIdx: 0 });
    const [saving, setSaving] = useState(false);

    // Modal ver eventos do dia
    const [dayModal, setDayModal] = useState(null); // null | 'YYYY-MM-DD'

    // ── Fetch ──────────────────────────────────────────────────────────────────
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

    // ── Nav ────────────────────────────────────────────────────────────────────
    const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
    const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };
    const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

    // ── Grid ───────────────────────────────────────────────────────────────────
    const total = daysInMonth(year, month);
    const first = firstDOW(year, month);
    const cells = [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
    // pad to full weeks
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    const eventsForDay = (iso) => events.filter(e => eventDay(e.starts_at) === iso);

    // ── Guardar evento ─────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!form.title.trim()) { Alert.alert('Título obrigatório'); return; }
        if (!userId) return;
        setSaving(true);
        try {
            const starts = form.allDay ? buildTS(modalDate, '00:00') : buildTS(modalDate, form.startTime);
            const ends = form.allDay ? buildTS(modalDate, '23:59') : (form.endTime ? buildTS(modalDate, form.endTime) : null);
            await apiService.createCalendarEvent({
                user_id: userId,
                title: form.title.trim(),
                description: form.description.trim() || null,
                starts_at: starts,
                ends_at: ends,
                all_day: form.allDay,
            });
            setShowModal(false);
            resetForm();
            await fetchEvents();
        } catch (e) { Alert.alert('Erro', e.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
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

    const openNew = (iso) => {
        setModalDate(iso || todayStr());
        resetForm();
        setShowModal(true);
    };

    const today = todayStr();

    return (
        <View style={styles.root}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <View style={tw`flex-row items-center`}>
                    <Pressable onPress={() => navigation.goBack()} style={tw`p-2 mr-1`}>
                        <Ionicons name="menu" size={24} color="#e2e8f0" />
                    </Pressable>
                    <Pressable onPress={next} style={tw`flex-row items-center`}>
                        <Text style={styles.headerMonth}>{MONTHS[month].slice(0, 4)}... {year}</Text>
                        <Ionicons name="chevron-down" size={16} color="#94a3b8" style={tw`ml-0.5`} />
                    </Pressable>
                </View>
                <View style={tw`flex-row items-center`}>
                    <Pressable onPress={goToday} style={styles.headerBtn}>
                        <Ionicons name="today-outline" size={22} color="#e2e8f0" />
                    </Pressable>
                    <Pressable onPress={fetchEvents} style={styles.headerBtn}>
                        <Ionicons name="refresh" size={22} color="#e2e8f0" />
                    </Pressable>
                </View>
            </View>

            {/* ── Dias da semana ── */}
            <View style={styles.weekRow}>
                {WEEK_DAYS.map(d => (
                    <Text key={d} style={styles.weekLabel}>{d}</Text>
                ))}
            </View>

            {/* ── Grid do mês ── */}
            <View style={tw`flex-1`}>
                {weeks.map((week, wi) => (
                    <View key={wi} style={[styles.weekLine, { flex: 1 }]}>
                        {week.map((day, di) => {
                            const iso = day ? dayISO(year, month, day) : null;
                            const isTd = iso === today;
                            const dayEvs = iso ? eventsForDay(iso) : [];
                            return (
                                <Pressable
                                    key={di}
                                    style={styles.dayCell}
                                    onPress={() => { if (iso) { setDayModal(iso); } }}
                                    onLongPress={() => { if (iso) openNew(iso); }}
                                >
                                    {/* Número do dia */}
                                    {day ? (
                                        <View style={[styles.dayNumWrap, isTd && styles.dayNumToday]}>
                                            <Text style={[styles.dayNum, isTd && styles.dayNumTodayText]}>{day}</Text>
                                        </View>
                                    ) : null}

                                    {/* Pills de eventos (max 2 + overflow) */}
                                    {dayEvs.slice(0, 2).map((ev, ei) => (
                                        <View key={ev.id} style={[styles.pill, { backgroundColor: EVENT_COLORS[ei % EVENT_COLORS.length] }]}>
                                            <Text style={styles.pillText} numberOfLines={1}>{ev.title}</Text>
                                        </View>
                                    ))}
                                    {dayEvs.length > 2 && (
                                        <Text style={styles.overflow}>+{dayEvs.length - 2}</Text>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </View>

            {/* ── Bottom bar com FAB ── */}
            <BottomBar navigation={navigation} />
            <Pressable style={styles.fab} onPress={() => openNew(today)}>
                <LinearGradient colors={['#4f46e5', '#6366f1']} style={styles.fabGrad}>
                    <Ionicons name="add" size={28} color="white" />
                </LinearGradient>
            </Pressable>

            {loading && (
                <View style={tw`absolute top-24 left-0 right-0 items-center`}>
                    <ActivityIndicator color="#6366f1" />
                </View>
            )}

            {/* ── Modal: ver eventos do dia ── */}
            {dayModal && (
                <Modal transparent animationType="slide" onRequestClose={() => setDayModal(null)}>
                    <Pressable style={styles.overlay} onPress={() => setDayModal(null)} />
                    <View style={styles.sheet}>
                        <View style={styles.handle} />
                        <View style={tw`flex-row items-center justify-between mb-4`}>
                            <Text style={tw`text-gray-800 font-bold text-base`}>
                                {new Date(dayModal + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </Text>
                            <Pressable onPress={() => { setDayModal(null); openNew(dayModal); }}
                                style={tw`bg-indigo-600 rounded-xl px-3 py-2 flex-row items-center`}>
                                <Ionicons name="add" size={16} color="white" />
                                <Text style={tw`text-white font-semibold ml-1 text-sm`}>Novo</Text>
                            </Pressable>
                        </View>
                        {eventsForDay(dayModal).length === 0 ? (
                            <View style={tw`items-center py-8`}>
                                <Ionicons name="calendar-outline" size={42} color="#94a3b8" />
                                <Text style={tw`text-gray-400 mt-2`}>Sem eventos</Text>
                            </View>
                        ) : (
                            eventsForDay(dayModal).map((ev, i) => (
                                <View key={ev.id} style={[styles.evCard, { borderLeftColor: EVENT_COLORS[i % EVENT_COLORS.length] }]}>
                                    <View style={tw`flex-1`}>
                                        <Text style={tw`font-semibold text-gray-800`}>{ev.title}</Text>
                                        {ev.all_day
                                            ? <Text style={tw`text-xs text-gray-400 mt-0.5`}>Dia inteiro</Text>
                                            : <Text style={tw`text-xs text-gray-400 mt-0.5`}>
                                                {fmtTime(ev.starts_at)}{ev.ends_at ? ` – ${fmtTime(ev.ends_at)}` : ''}
                                            </Text>}
                                        {ev.description ? <Text style={tw`text-xs text-gray-400 mt-1`}>{ev.description}</Text> : null}
                                    </View>
                                    <Pressable onPress={() => handleDelete(ev.id)} style={tw`p-2`}>
                                        <Ionicons name="trash-outline" size={18} color="#94a3b8" />
                                    </Pressable>
                                </View>
                            ))
                        )}
                    </View>
                </Modal>
            )}

            {/* ── Modal: criar evento ── */}
            <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={tw`flex-1`}>
                    <Pressable style={styles.overlay} onPress={() => setShowModal(false)} />
                    <View style={styles.sheet}>
                        <View style={styles.handle} />
                        <Text style={tw`text-gray-800 font-bold text-lg mb-1`}>Novo Evento</Text>
                        <Text style={tw`text-gray-400 text-xs mb-4`}>
                            📅 {new Date(modalDate + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </Text>

                        <Text style={styles.lbl}>Título *</Text>
                        <TextInput style={styles.inp} placeholder="Nome do evento" placeholderTextColor="#9ca3af"
                            value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))} />

                        <View style={tw`flex-row items-center justify-between mb-4`}>
                            <Text style={tw`text-gray-600 font-semibold text-sm`}>Dia inteiro</Text>
                            <Switch value={form.allDay} onValueChange={v => setForm(f => ({ ...f, allDay: v }))}
                                trackColor={{ false: '#e2e8f0', true: '#6366f1' }} thumbColor="white" />
                        </View>

                        {!form.allDay && (
                            <View style={tw`flex-row mb-1`}>
                                <View style={tw`flex-1 mr-3`}>
                                    <Text style={styles.lbl}>Início</Text>
                                    <TextInput style={styles.inp} placeholder="09:00" placeholderTextColor="#9ca3af"
                                        value={form.startTime} onChangeText={t => setForm(f => ({ ...f, startTime: t }))}
                                        keyboardType="numbers-and-punctuation" />
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={styles.lbl}>Fim</Text>
                                    <TextInput style={styles.inp} placeholder="10:00" placeholderTextColor="#9ca3af"
                                        value={form.endTime} onChangeText={t => setForm(f => ({ ...f, endTime: t }))}
                                        keyboardType="numbers-and-punctuation" />
                                </View>
                            </View>
                        )}

                        <Text style={styles.lbl}>Cor</Text>
                        <View style={tw`flex-row mb-4`}>
                            {EVENT_COLORS.map((c, i) => (
                                <Pressable key={c} onPress={() => setForm(f => ({ ...f, colorIdx: i }))}
                                    style={[styles.colorDot, { backgroundColor: c }, form.colorIdx === i && styles.colorDotActive]} />
                            ))}
                        </View>

                        <Text style={styles.lbl}>Notas</Text>
                        <TextInput style={[styles.inp, { height: 64, textAlignVertical: 'top' }]}
                            placeholder="Descrição..." placeholderTextColor="#9ca3af"
                            value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))} multiline />

                        <Pressable onPress={handleSave} disabled={saving} style={tw`mt-2`}>
                            <LinearGradient colors={saving ? ['#374151', '#374151'] : ['#6366f1', '#818cf8']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={tw`rounded-xl py-4 items-center`}>
                                {saving
                                    ? <ActivityIndicator color="white" />
                                    : <Text style={tw`text-white font-bold text-base`}>Guardar</Text>}
                            </LinearGradient>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0f172a' },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    headerMonth: { fontSize: 20, fontWeight: '700', color: '#e2e8f0' },
    headerBtn: { padding: 8 },

    // Grid
    weekRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    weekLabel: { width: CELL_W, textAlign: 'center', fontSize: 11, color: '#64748b', fontWeight: '600', paddingVertical: 6, textTransform: 'uppercase' },
    weekLine: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    dayCell: { width: CELL_W, borderRightWidth: 1, borderRightColor: '#1e293b', overflow: 'hidden', paddingBottom: 4 },
    dayNumWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', margin: 3 },
    dayNumToday: { backgroundColor: '#6366f1' },
    dayNum: { fontSize: 13, color: '#cbd5e1' },
    dayNumTodayText: { color: 'white', fontWeight: '700' },

    // Event pills
    pill: { marginHorizontal: 3, marginTop: 2, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
    pillText: { fontSize: 10, color: 'white', fontWeight: '600' },
    overflow: { fontSize: 10, color: '#64748b', marginLeft: 4, marginTop: 1 },

    // Bottom bar
    bottomBar: { backgroundColor: '#0f172a', flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingBottom: 22, borderTopWidth: 1, borderTopColor: '#1e293b' },
    bottomBtn: { alignItems: 'center', flex: 1 },
    bottomIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
    bottomLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },

    // FAB
    fab: { position: 'absolute', bottom: 128, right: 20, zIndex: 10, borderRadius: 18, overflow: 'hidden', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 10 },
    fabGrad: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },

    // Modals
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: { backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 },
    lbl: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    inp: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b', marginBottom: 14 },
    colorDot: { width: 26, height: 26, borderRadius: 13, marginRight: 8 },
    colorDotActive: { borderWidth: 3, borderColor: '#1e293b', transform: [{ scale: 1.15 }] },
    evCard: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 8 },
});
