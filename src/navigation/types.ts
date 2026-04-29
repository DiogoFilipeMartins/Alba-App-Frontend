export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Home: undefined;
  Map: undefined;
  SuggestPlace: { pickedCoords?: { lat: number; lng: number } };
  Admin: undefined;
  MapPicker: { initialCoords?: { lat: number; lng: number } | null };
  Calendar: undefined;
};
