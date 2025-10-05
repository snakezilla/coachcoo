declare module "rive-react-native" {
  import type { ComponentType } from "react";

  export type RiveRef = {
    stateMachineInputs(machine: string): any[];
  } | null;

  export type UseRiveOptions = {
    src: any;
    autoplay?: boolean;
    stateMachines?: string | string[];
    onLoad?: () => void;
    onError?: (error: unknown) => void;
  };

  export type UseRiveResult = {
    rive: RiveRef;
    RiveComponent: ComponentType<{ style?: any }>;
  };

  export function useRive(options: UseRiveOptions): UseRiveResult;
}
