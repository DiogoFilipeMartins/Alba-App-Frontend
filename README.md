# alba-app — Expo + NativeWind (Tailwind)

Starter Expo com **NativeWind** já configurado.

## Requisitos
- Node.js 18+
- Expo CLI (`npx expo`)

## Início rápido
```bash
npm install
npx expo start
# se der cache estranho: npm run reset-project
```

## O que vem pronto
- NativeWind v5 + Tailwind CSS 3
- `babel.config.js` com `nativewind/babel`
- `metro.config.js` com `withNativeWind({ input: './global.css' })`
- `global.css` com diretivas Tailwind
- `tailwind.config.js` com preset de NativeWind
- Exemplo de componentes com `className`

## Dicas
- Usa `className` nos componentes React Native (View, Text, etc.)
- Para navegação instala quando precisares:
```bash
npm i @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
```
