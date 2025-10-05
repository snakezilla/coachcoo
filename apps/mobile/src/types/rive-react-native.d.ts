declare module "rive-react-native" {
  export type RiveRef = any;
  const RiveComponent: any;
  const useRive: (...args: any[]) => any;
  export default RiveComponent;
  export { useRive, RiveRef };
}
