export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Main: undefined; // O ecrã principal agora é o Tab Navigator
  Admin: undefined;
  MapPicker: { initialCoords?: { lat: number; lng: number } | null };
};

export type MainTabParamList = {
  Map: undefined;
  SuggestPlace: { pickedCoords?: { lat: number; lng: number } };
  Donations: undefined;
  Calendar: undefined;
  Profile: undefined;
};
