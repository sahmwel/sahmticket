declare module 'html5-qrcode' {
  export class Html5Qrcode {
    constructor(elementId: string);
    start(
      cameraIdOrConfig: string | object,
      config: object,
      qrCodeSuccessCallback: (decodedText: string, decodedResult?: any) => void,
      qrCodeErrorCallback?: (errorMessage: string) => void
    ): Promise<void>;
    stop(): Promise<void>;
    clear(): Promise<void>;
  }

  export class Html5QrcodeScanner {
    constructor(
      elementId: string,
      config: { fps?: number; qrbox?: number },
      verbose?: boolean
    );
    render(
      qrCodeSuccessCallback: (decodedText: string) => void,
      qrCodeErrorCallback?: (errorMessage: string) => void
    ): void;
    clear(): Promise<void>;
  }
}
