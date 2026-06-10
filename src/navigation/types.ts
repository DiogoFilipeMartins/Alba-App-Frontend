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
};

export type MainTabParamList = {
  Map: undefined;
  Chatbot: undefined;
  Communities: undefined;
  Calendar: undefined;
  Profile: undefined;
};
