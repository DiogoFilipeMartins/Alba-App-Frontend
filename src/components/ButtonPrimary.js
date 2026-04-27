import { Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';

export default function ButtonPrimary({ title, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={tw`rounded-xl bg-zinc-900 px-5 py-3`}>
      <Text style={tw`font-semibold text-white`}>{title}</Text>
    </TouchableOpacity>
  );
}
