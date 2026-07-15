export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Main: undefined;
  Admin: undefined;
  MapPicker: { initialCoords?: { lat: number; lng: number } | null; returnTo?: 'SuggestPlace' | 'EditProfessionalProfile' };
  CommunityChat: { communityId: string; communityName: string; communityColor?: string };
  CommunityDetail: { communityId: string; communityName: string; communityColor?: string; description?: string; memberCount?: number; photoUrl?: string };
  SuggestPlace: { pickedCoords?: { lat: number; lng: number } };
  Donations: undefined;
  DirectMessage: { userId: string; userName: string };
  EditProfile: undefined;
  EditProfessionalProfile: { pickedCoords?: { lat: number; lng: number } } | undefined;
  Security: undefined;
  PlaceProfile: { placeId: string; place?: any };
  Appearance: undefined;
  News: undefined;
};

export type MainTabParamList = {
  Map: { focusPlaceId?: string; focusCoords?: { lat: number; lng: number } } | undefined;
  Chatbot: { initialMessage?: string } | undefined;
  Communities: undefined;
  Calendar: undefined;
  Profile: undefined;
  Directory: undefined;
};

