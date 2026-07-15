import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

// Nota de voz reproduzível dentro do balão de mensagem.
export default function AudioMessage({ url, tint, subColor }: { url: string; tint: string; subColor: string }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  const duration = status?.duration || 0;
  const current = status?.currentTime || 0;
  const playing = status?.playing || false;
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  const toggle = async () => {
    if (playing) { player.pause(); return; }
    if (status?.didJustFinish || (duration > 0 && current >= duration - 0.1)) {
      await player.seekTo(0);
    }
    player.play();
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={toggle} style={[styles.playBtn, { backgroundColor: tint }]}>
        <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#fff" style={playing ? undefined : { marginLeft: 2 }} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={[styles.track, { backgroundColor: subColor + '55' }]}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: tint }]} />
        </View>
        <Text style={[styles.time, { color: subColor }]}>{fmt((playing || current > 0) ? current : duration)}</Text>
      </View>
      <Ionicons name="mic" size={16} color={subColor} style={{ marginLeft: 4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 200, paddingVertical: 2 },
  playBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  time: { fontSize: 11, fontFamily: 'Poppins_400Regular', marginTop: 5 },
});
