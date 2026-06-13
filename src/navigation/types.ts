export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Main: undefined; // O ecrã principal agora é o Tab Navigator
  Admin: undefined;
  MapPicker: { initialCoords?: { lat: number; lng: number } | null };
  CommunityChat: { communityId: string, communityName: string };
  SuggestPlace: { pickedCoords?: { lat: number; lng: number } };
  Donations: undefined;
  EditProfile: undefined;
  Security: undefined;
  PlaceProfile: { placeId: string; place?: any };
};

export type MainTabParamList = {
  Map: { focusPlaceId?: string } | undefined;
  Chatbot: undefined;
  Communities: undefined;
  Calendar: undefined;
  Profile: undefined;
  Directory: undefined;
};

